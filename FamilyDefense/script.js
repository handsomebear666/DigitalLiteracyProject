// 【全局探针】：检测当前是否在微信环境下打开
const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
// ==========================================
// 【关键新增】：微信环境专属防字体放大补丁
// ==========================================
if (isWeChat) {
  if (
    typeof WeixinJSBridge == "object" &&
    typeof WeixinJSBridge.invoke == "function"
  ) {
    handleFontSize();
  } else {
    if (document.addEventListener) {
      document.addEventListener("WeixinJSBridgeReady", handleFontSize, false);
    } else if (document.attachEvent) {
      document.attachEvent("WeixinJSBridgeReady", handleFontSize);
      document.attachEvent("onWeixinJSBridgeReady", handleFontSize);
    }
  }
  function handleFontSize() {
    // 强制把微信网页字体设为标准大小 (0代表不缩放)
    WeixinJSBridge.invoke("setFontSizeCallback", { fontSize: 0 });
    // 拦截用户在微信菜单里手动修改字体大小的操作
    WeixinJSBridge.on("menu:setfont", function () {
      WeixinJSBridge.invoke("setFontSizeCallback", { fontSize: 0 });
    });
  }
}
// ==========================================
// ==========================================
// 0. 资源预加载逻辑 (必须放在最外层全局作用域)
// ==========================================
// 递归提取 ASSETS 对象里的所有图片 URL
function extractUrls(obj) {
  let urls = [];
  for (let key in obj) {
    // 【关键修复】：只提取字符串，且排除掉 .mp3 结尾的音频文件！
    if (typeof obj[key] === "string" && !obj[key].endsWith(".mp3")) {
      urls.push(obj[key]);
    } else if (typeof obj[key] === "object") {
      urls = urls.concat(extractUrls(obj[key]));
    }
  }
  return urls;
}

// 预加载所有图片，并返回一个 Promise
function preloadAllImages(assets) {
  const imageUrls = extractUrls(assets);
  let loadedCount = 0;

  return new Promise((resolve) => {
    if (imageUrls.length === 0) {
      resolve(); // 如果没有图片，直接完成
      return;
    }

    imageUrls.forEach((url) => {
      const img = new Image();
      // 无论是加载成功还是失败，都算处理完了这一张
      img.onload = img.onerror = () => {
        loadedCount++;
        if (loadedCount === imageUrls.length) {
          resolve(); // 所有图片都过了一遍，通知外部可以开始了
        }
      };
      img.src = url;
    });
  });
}

// ==========================================
// 【修改】：音频预加载与播放控制器 (先建空壳，不抢网速)
// ==========================================
// ❌ 删掉原来的 new Audio(ASSETS.AUDIO.xxx)
// ✅ 替换为纯粹的空壳对象：
const sysMsgSound = new Audio();
const bgmSound = new Audio();
const clickSound = new Audio();
const confettiSound = new Audio();

bgmSound.loop = true;
bgmSound.volume = 0.3;
confettiSound.volume = 0.7;

function playMessageSound() {
  sysMsgSound.currentTime = 0;
  sysMsgSound.play().catch((e) => console.log("等待用户交互才能播放音效"));
}
// ... 下面的 playClickSound 保持不变

function playClickSound() {
  clickSound.currentTime = 0;
  clickSound.play().catch((e) => {});
}

function playConfettiSound() {
  confettiSound.currentTime = 0;
  confettiSound.play().catch((e) => {});
}

// ==========================================
// 加载静态图标功能
// ==========================================
function loadStaticAssets() {
  const mapping = {
    // signal: ASSETS.ICONS.signal,
    // wifi: ASSETS.ICONS.wifi,
    // battery: ASSETS.ICONS.battery,
    back: ASSETS.ICONS.back,
    more: ASSETS.ICONS.more,
    voice_icon: ASSETS.ICONS.voice_icon,
    emoji_icon: ASSETS.ICONS.emoji_icon,
    plus_icon: ASSETS.ICONS.plus_icon,
    monster: ASSETS.IMAGES.monster,
    kefu: ASSETS.OTHERS.kefu,
    yurongfu: ASSETS.OTHERS.yurongfu,
  };

  for (let id in mapping) {
    const element = document.getElementById(id);
    if (element) {
      element.src = mapping[id];
    } else {
      console.error("找不到 ID 为 " + id + " 的图片标签！");
    }
  }
}

// ==========================================
// 动态时间刷新器 (让“刚刚”变成“X分钟前”)
// ==========================================
function refreshDynamicTimes() {
  const timeElements = document.querySelectorAll(".dynamic-time");
  timeElements.forEach((el) => {
    const ts = parseInt(el.getAttribute("data-timestamp"), 10);
    el.innerText = formatWeChatTime(ts);
  });
}
// 设定每 60 秒自动刷新一次所有时间
setInterval(refreshDynamicTimes, 60000);

// ==========================================
// 1. 时间显示逻辑
// ==========================================
// function updateTime() {
//   const now = new Date();
//   document.getElementById("clock").innerText =
//     `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
// }
// setInterval(updateTime, 1000);
// updateTime();
function formatWeChatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = (now - date) / 1000;
  const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  if (diff < 60) return "刚刚";
  if (diff < 3600) return Math.floor(diff / 60) + " 分钟前";
  if (date.toDateString() === now.toDateString()) return timeStr;
  return "昨天 " + timeStr;
}

function addTimeDivider(timestamp) {
  const chatBox = document.getElementById("chatBox");
  const timeDiv = document.createElement("div");
  timeDiv.className = "sys-msg";
  // 将传入的时间统一转换为毫秒时间戳
  const timeValue = timestamp instanceof Date ? timestamp.getTime() : timestamp;

  // 【关键】：加上 dynamic-time 类名和 data-timestamp 属性
  timeDiv.innerHTML = `<span class="dynamic-time" data-timestamp="${timeValue}">${formatWeChatTime(timeValue)}</span>`;
  chatBox.appendChild(timeDiv);
}

// ==========================================
// 2. 核心：发消息功能
// ==========================================
// avatarKey 对应 story.js 里的 "uncle", "aunt"
function addMessage(sender, text, isMe, avatarKey, extraClass = "") {
  const chatBox = document.getElementById("chatBox");
  const row = document.createElement("div");
  const realImagePath = ASSETS.AVATARS[avatarKey] || "img/default.png";

  const avatarDiv = document.createElement("div");
  avatarDiv.className = "avatar";
  const img = document.createElement("img");
  img.src = realImagePath;
  avatarDiv.appendChild(img);

  const content = document.createElement("div");
  content.className = "msg-content";
  content.innerHTML = text;

  if (isMe) {
    // 【修改】：加上 extraClass
    row.className = "msg-row msg-right " + extraClass;
    row.appendChild(content);
    row.appendChild(avatarDiv);
  } else {
    // 【修改】：加上 extraClass
    row.className = "msg-row msg-left " + extraClass;
    row.appendChild(avatarDiv);

    // 【新增逻辑】：创建一个包裹层，用来上下排列“名字”和“气泡”
    const msgWrapper = document.createElement("div");
    msgWrapper.className = "msg-wrapper";

    // 创建名字标签
    const nameDiv = document.createElement("div");
    nameDiv.className = "msg-name";
    nameDiv.innerText = sender; // 读取传入的 sender (如"二大爷")

    // 将名字和气泡塞进包裹层
    msgWrapper.appendChild(nameDiv);
    msgWrapper.appendChild(content);

    // 将包裹层放入当前行
    row.appendChild(msgWrapper);
  }

  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;

  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;

  // 【新增】：如果不是自己发的消息，就播放提示音
  if (!isMe) {
    playMessageSound();
  }
}

// ==========================================
// 3. 剧情流程控制与全局弹窗管理 (无打字机极速版)
// ==========================================

// ==========================================
// 3. 剧情流程控制与全局弹窗管理 (无打字机极速版)
// ==========================================

// 【关键修改】：把 window.onload 换成 DOMContentLoaded
// 只要 HTML 骨架加载完，立刻开始加载图片，不盲等音频！
document.addEventListener("DOMContentLoaded", function () {
  console.log("正在拼命加载图片资源...");

  preloadAllImages(ASSETS).then(() => {
    console.log("资源加载完毕，显示首页！");

    // 【关键新增】：图片全加载完了，进度条消失前，偷偷把音频路径塞进去，让它们在后台慢慢下
    sysMsgSound.src = ASSETS.AUDIO.message;
    bgmSound.src = ASSETS.AUDIO.bgm;
    clickSound.src = ASSETS.AUDIO.click;
    confettiSound.src = ASSETS.AUDIO.confetti;

    // 这样当首页的白色介绍卡片消失时，底层的微信界面就已经完全准备就绪了。
    loadStaticAssets();

    // 资源加载完毕后，淡出并隐藏 Loading 层
    const loadingOverlay = document.getElementById("loadingOverlay");
    loadingOverlay.style.opacity = "0";
    setTimeout(() => {
      loadingOverlay.style.display = "none";
    }, 500);

    // 显示首页白绿风弹窗
    const overlay = document.getElementById("missionOverlay");
    overlay.style.display = "flex";
    setTimeout(() => {
      overlay.style.opacity = "1";
    }, 100);

    document.getElementById("typedText").innerText = GAME_STORY.warningText;

    const btn = document.getElementById("startBtn");
    btn.innerText = "我准备好了！";
    btn.onclick = startGame;
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
  });
});

// 玩家点击“我准备好了” -> 进入微信并自动发消息
function startGame() {
  playClickSound();
  const overlay = document.getElementById("missionOverlay");

  // 1. 瞬间解锁并播放所有音频
  bgmSound.play().catch((e) => console.log("BGM播放失败", e));
  sysMsgSound.play().catch((e) => {});
  sysMsgSound.pause();
  sysMsgSound.currentTime = 0;

  // ✅ 【关键修复】：把显示头部的逻辑挪到这里！
  // 这样在白卡片开始变透明的一瞬间，假群头就已经在后面准备好了
  if (isWeChat) {
    document.title = "相亲相爱一家人 (27)";
  } else {
    document.getElementById("fakeWechatHeader").style.display = "flex";
  }

  // 2. 隐藏弹窗 (执行 0.5 秒的淡出动画)
  overlay.style.opacity = "0";
  setTimeout(() => {
    overlay.style.display = "none";

    // 3. 渲染静态内容及时间

    const realStartTime = new Date();
    addTimeDivider(realStartTime);

    // 4. 发送开场白并计算总耗时
    let maxDelay = 0;

    if (GAME_STORY.openingimage) {
      GAME_STORY.openingimage.forEach((item) => {
        setTimeout(() => {
          addImageMessage(item.sender, item.image, false, item.avatar);
        }, item.delay);
        if (item.delay > maxDelay) maxDelay = item.delay;
      });
    }

    if (GAME_STORY.openingtext) {
      GAME_STORY.openingtext.forEach((item) => {
        setTimeout(() => {
          addMessage(item.sender, item.text, false, item.avatar);
        }, item.delay);
        if (item.delay > maxDelay) maxDelay = item.delay;
      });
    }

    // 5. 等长辈们把话发完，无缝衔接进入第一关找破绽
    setTimeout(() => {
      nextStep(1);
    }, maxDelay + 1500); // 在最后一条消息发出后，等 1.5 秒再弹系统提示
  }, 500);
}

// 关卡交互逻辑
function nextStep(step) {
  const actionArea = document.getElementById("actionArea");

  if (step === 1) {
    // 清空底部操作区（因为我们现在用上方弹出的 Toast 了）
    actionArea.innerHTML = "";

    updateSystemHint("点击二大爷发的图片，放大看看吧~", true, 1500);

    canFindFlaws = true;
  } else if (step === 2) {
    actionArea.innerHTML = "";

    updateSystemHint("去看看三姑发的促销链接吧~", true, 1500);

    canFindFlaws = true;
  } else if (step === 3) {
    actionArea.innerHTML = "";

    updateSystemHint("去看看老妈发的视频会议链接吧~", true, 1500);

    canFindFlaws = true;
  }
}

// ==========================================
// 1. 发送图片消息的功能
// ==========================================
function addImageMessage(sender, imageSrc, isMe, avatarKey) {
  const chatBox = document.getElementById("chatBox");
  const row = document.createElement("div");
  const realAvatarPath = ASSETS.AVATARS[avatarKey] || "img/default.png";

  const avatarDiv = document.createElement("div");
  avatarDiv.className = "avatar";
  avatarDiv.innerHTML = `<img src="${realAvatarPath}" />`;

  const content = document.createElement("div");
  // 【关键修改】：在这里加上 no-tail 类名
  content.className = "msg-content no-tail";
  content.style.padding = "0"; // 图片不需要内边距
  content.style.backgroundColor = "transparent"; // 移除背景色

  // 图片标签，绑定点击事件打开放大取证界面
  content.innerHTML = `<img src="${imageSrc}" class="msg-image" onclick="openInspector('${imageSrc}')" />`;

  if (isMe) {
    row.className = "msg-row msg-right";
    row.appendChild(content);
    row.appendChild(avatarDiv);
  } else {
    row.className = "msg-row msg-left";
    row.appendChild(avatarDiv);

    const msgWrapper = document.createElement("div");
    msgWrapper.className = "msg-wrapper";

    const nameDiv = document.createElement("div");
    nameDiv.className = "msg-name";
    nameDiv.innerText = sender;

    msgWrapper.appendChild(nameDiv);
    msgWrapper.appendChild(content);
    row.appendChild(msgWrapper);
  }

  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;

  // 【新增】：如果不是自己发的消息，就播放提示音
  if (!isMe) {
    playMessageSound();
  }
}

// ==========================================
// 2. 动态打字机 Toast 提示 (阅后即焚版)
// ==========================================
let currentHintContent = ""; // 记忆当前的提示词，供玩家点击按钮重看
let toastTimeout = null; // 计时器

// 更新并立刻弹出提示
function updateSystemHint(text, showBtn = true, duration = 2000) {
  currentHintContent = text;

  const hintBtn = document.getElementById("inlineHintBtn");
  if (hintBtn) {
    // 根据传入的参数决定是否显示按钮
    hintBtn.style.display = showBtn ? "block" : "none";
  }

  showToast(text, duration);
}

// 玩家点击“💡 提示”按钮时触发
function triggerCurrentHint() {
  if (currentHintContent) {
    showToast(currentHintContent);
  }
}

// 内部函数：控制弹窗的直接显示与自动消失 (干脆利落版)
function showToast(text, duration = 2000) {
  const toast = document.getElementById("systemToast");
  const textContainer = document.getElementById("toastText");

  // 如果当前有正在执行的消失倒计时，先取消掉，防止频繁点击导致闪烁
  if (toastTimeout) clearTimeout(toastTimeout);

  // 直接填入文字并显示
  textContainer.innerHTML = text;
  toast.classList.add("show");

  // 设定 1.5 秒后自动消失
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

// ==========================================
// 3. 图片放大与找茬取证逻辑
// ==========================================
let foundFlaws = 0; // 记录找到了几个破绽
// 【新增】：剧情锁，控制什么时候允许找破绽
let canFindFlaws = false;

function openInspector(imageSrc) {
  const inspector = document.getElementById("imageInspector");
  const img = document.getElementById("inspectorImg");
  img.src = imageSrc;
  inspector.style.display = "flex";

  if (canFindFlaws) {
    setTimeout(() => {
      updateSystemHint(
        "⚠️ 这张图片怎么怪怪的？请找出3个不合理的地方！",
        true,
        1000,
      );
      canFindFTFlaws = true;
    }, 300);
  }
}

function closeInspector() {
  document.getElementById("imageInspector").style.display = "none";
  // 如果已经找齐了破绽，确保下次点开图片时是干净的
  if (foundFlaws >= 3) {
    const allHotspots = document.querySelectorAll(".flaw-hotspot");
    allHotspots.forEach((el) => {
      el.classList.remove("revealed");
      // 彻底禁用这些热区的点击，因为任务已经完成了
      el.style.pointerEvents = "none";
    });
  }
}

function revealFlaw(flawId) {
  // 【新增拦截逻辑】：如果还没到找破绽的环节（锁没开），直接退出，不执行后续逻辑
  if (!canFindFlaws) return;

  const hotspot = document.getElementById(`flaw-${flawId}`);

  if (!hotspot.classList.contains("revealed")) {
    playClickSound();
    hotspot.classList.add("revealed");
    foundFlaws++;

    // 根据发现的不同破绽，即时修改胶囊里的提示词
    if (flawId === "mountain") {
      updateSystemHint("✅ 发现破绽：这个季节桂林根本没有雪山！", true, 1500);
    } else if (flawId === "billboard") {
      updateSystemHint(
        "✅ 发现破绽：广告牌文字扭曲，AI生图常见问题！",
        true,
        1500,
      );
    } else if (flawId === "ai") {
      updateSystemHint("✅ 发现破绽：这里还留着AI创作水印！", true, 1500);
    }

    // 找齐后的逻辑
    if (foundFlaws === 3) {
      // 1. 立即隐藏提示按钮，防止在结算动画时干扰玩家
      const hintBtn = document.getElementById("inlineHintBtn");
      if (hintBtn) {
        hintBtn.style.display = "none";
      }

      // 【关键修复】：找齐之后，为了不影响后续看图，延迟一点点时间就把红框全部抹掉
      setTimeout(() => {
        const allHotspots = document.querySelectorAll(".flaw-hotspot");
        allHotspots.forEach((el) => el.classList.remove("revealed"));

        // 同时也把剧情锁关掉，防止玩家在结算时还能点出框来
        canFindFlaws = false;
      }, 2500);
      setTimeout(() => {
        closeInspector();
        updateSystemHint("证据搜集完毕！请选择回复二大爷的方式。", false, 1000);
        // 延迟 1.5 秒后显示底部选项
        setTimeout(showDebunkOptions, 1500);
      }, 2500);
    }
  }
}

// ==========================================
// 更新：显示辟谣选项 (带抽屉背景版)
// ==========================================
function showDebunkOptions() {
  // 【新增】：呼出选项时，让整个屏幕背景变暗模糊
  document.getElementById("drawerOverlay").classList.add("show");

  const actionArea = document.getElementById("actionArea");
  actionArea.innerHTML = `
    <div class="options-panel">
      <div class="question-title">你需要在群里回复二大爷，你选择：</div>
      
      <button class="action-btn outline" onclick="chooseOption('A')">
        嘲笑二大爷
      </button>
      
      <button class="action-btn solid" onclick="chooseOption('B')">
        告知二大爷这张图是假的
      </button>
    </div>
  `;
}

// ==========================================
// 1. 处理玩家的选择 (增强版：分步撤回与踢人)
// ==========================================
function chooseOption(choice) {
  playClickSound(); // 【新增】：播放点击音效
  // 【新增】：选完选项后，撤掉模糊背景
  document.getElementById("drawerOverlay").classList.remove("show");

  const actionArea = document.getElementById("actionArea");
  actionArea.innerHTML = ""; // 选完后立刻清空底部按钮

  if (choice === "A") {
    // 【修改：加上 bad-msg-1 标签，最后呼出失败弹窗】
    setTimeout(() => {
      addMessage(
        "我",
        "二大爷你可长点心吧，哈哈哈哈这张照片明显是AI生成的，你都没看出来，果然老了！😝",
        true,
        "me",
        "bad-msg-1",
      );
    }, 500);
    setTimeout(() => {
      addMessage("二大爷", "😡", false, "uncle", "bad-msg-1");
    }, 3000);
    setTimeout(() => {
      addMessage("老爸", "😡", false, "father", "bad-msg-1");
    }, 4000);
    setTimeout(() => {
      addMessage("大堂哥", "😡", false, "one_cousin", "bad-msg-1");
    }, 5000);
    setTimeout(() => {
      if (isWeChat) {
        document.title = "相亲相爱一家人 (26)";
      } else {
        const groupNameDiv = document.getElementById("groupName");
        if (groupNameDiv) groupNameDiv.innerText = "相亲相爱一家人 (26)";
      }
      addSystemMessage("你已被管理员移出该群", "bad-msg-1");
    }, 7000);

    setTimeout(() => {
      // 3. 弹出失败提示
      updateSystemHint("❌ 你被管理员移出“相亲相爱一家人”！", false, 1500);
    }, 8500);
    setTimeout(() => {
      showFailPopup(
        1,
        "正确沟通也是数字素养的一部分！\n嘲讽长辈引发逆反心理，不仅达不到科普目的，反而会伤了和气。",
      );
    }, 12500);
  } else if (choice === "B") {
    // 【好结局分支：高情商科普】
    addImageMessage("我", "assets/signalmonster.png", true, "me");
    setTimeout(() => {
      addMessage(
        "我",
        "二大爷，你看这张照片，大夏天我们南方出现雪山，广告牌的字缺胳膊少腿，不知所云，右下角还有AI生成字样，这是营销号用AI生成的图片，骗点击量的，别信。",
        true,
        "me",
      );
    }, 2000);

    setTimeout(() => {
      addMessage(
        "二大爷",
        "😅 哎哟，现在这些公众号真缺德，我马上把它撤回来。",
        false,
        "uncle",
      );
    }, 4000);

    // 【关键修改：分步骤撤回动作】
    // 动作 1：过 1.5 秒后，先撤回“图片”
    setTimeout(() => {
      hideUncleMessage("image"); // 精准隐藏图片
      addSystemMessage("二大爷撤回了一条消息");
    }, 5500);

    setTimeout(() => {
      hideUncleMessage("text"); // 精准隐藏文字
      addSystemMessage("二大爷撤回了一条消息");
    }, 7000);
    setTimeout(() => {
      addMessage("老爸", "👍", false, "father");
    }, 8500);
    setTimeout(() => {
      addMessage("大堂哥", "👍学到了学到了", false, "one_cousin");
    }, 10000);
    setTimeout(() => {
      // 弹出成功提示
      updateSystemHint("✅ 辟谣成功：有理有据，完美化解危机！", false, 1000);
    }, 12000);
    // 【关键新增】：辟谣成功后，过 2.5 秒弹出科普总结窗口
    setTimeout(() => {
      showEducationPopup();
    }, 14500);
  }
}

// ==========================================
// 知识复盘科普弹窗 (独立毛玻璃+礼花版)
// ==========================================
function showEducationPopup() {
  // 注意：这里调用的 ID 换成了新做的 settlementOverlay
  const overlay = document.getElementById("settlementOverlay");
  const textContainer = document.getElementById("settlementText");

  // 直接填入知识点
  textContainer.innerText = `1. 视觉溯源：警惕反常理的图像细节（如南方雪山、扭曲的文字和水印）。\n2. 交叉验证：遇到震惊体新闻先别急着转，用识图工具或搜索查证。\n3. 共情沟通：辟谣不嘲讽，理解长辈，才能达成真正的“数字反哺”。`;

  // 显示毛玻璃弹窗
  overlay.style.display = "flex";
  setTimeout(() => {
    overlay.style.opacity = "1";
    // 弹窗出现的同时，喷射满屏礼花！
    fireConfetti();
  }, 100);

  overlay.style.display = "flex";
  setTimeout(() => {
    overlay.style.opacity = "1";
    playConfettiSound(); // 【新增】：播放礼花音效！
    fireConfetti();
  }, 100);
}

// 玩家点击“我学会啦”
function finishLevelOne() {
  playClickSound();
  const overlay = document.getElementById("settlementOverlay");
  overlay.style.opacity = "0";
  setTimeout(() => {
    maxDelay = 0;
    overlay.style.display = "none";

    if (GAME_STORY.level2_opening) {
      GAME_STORY.level2_opening.forEach((item) => {
        setTimeout(() => {
          addMessage(item.sender, item.text, false, item.avatar);
        }, item.delay);
        if (item.delay > maxDelay) maxDelay = item.delay;
      });
    }

    setTimeout(() => {
      nextStep(2);
    }, maxDelay + 1500); // 在最后一条消息发出后，等 1.5 秒再弹系统提示
  }, 500);
}

// ==========================================
// 新增：发射庆祝礼花特效
// ==========================================
function fireConfetti() {
  const colors = ["#07c160", "#ffc107", "#ff5252", "#448aff", "#e040fb"];
  const container = document.getElementById("app-container"); // 挂载在手机屏幕内

  // 生成 60 片随机礼花
  for (let i = 0; i < 60; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];

    // 初始发射点设在屏幕中心略偏上
    confetti.style.left = "50%";
    confetti.style.top = "40%";

    // 随机计算每片纸片的爆炸角度和飞行距离
    const angle = Math.random() * Math.PI * 2;
    const velocity = 80 + Math.random() * 120; // 飞行力度
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;

    // 将随机坐标传给 CSS
    confetti.style.setProperty("--tx", `${tx}px`);
    confetti.style.setProperty("--ty", `${ty}px`);

    container.appendChild(confetti);

    // 1.5秒动画结束后，把 DOM 节点清理掉，保持网页流畅
    setTimeout(() => confetti.remove(), 1500);
  }
}

// ==========================================
// 3. 微信系统灰色提示消息 (撤回/移出群聊专用)
// ==========================================
// 【修改】：给参数增加一个 extraClass = ""
function addSystemMessage(text, extraClass = "") {
  const chatBox = document.getElementById("chatBox");
  const sysDiv = document.createElement("div");
  // 【修改】：加上 extraClass
  sysDiv.className = "sys-msg " + extraClass;
  sysDiv.style.margin = "10px 0";
  sysDiv.innerHTML = `<span>${text}</span>`;
  chatBox.appendChild(sysDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}
// ==========================================
// 第二关：高仿淘宝钓鱼网页逻辑
// ==========================================
let foundTaobaoFlaws = 0;
let canFindTaobaoFlaws = false;

function openTaobao() {
  playClickSound();
  document.getElementById("taobaoOverlay").style.display = "flex";

  // 网页打开后，弹出系统提示
  setTimeout(() => {
    updateSystemHint(
      "⚠️ 检测到高风险链接！请在网页中找出 3 处诈骗破绽。",
      true,
      1500,
    );
    canFindTaobaoFlaws = true;
  }, 300);
}

function closeTaobao() {
  playClickSound();
  document.getElementById("taobaoOverlay").style.display = "none";
}

function finishTaobao() {
  document.getElementById("taobaoOverlay").style.display = "none";
}

function revealTaobaoFlaw(flawId) {
  if (!canFindTaobaoFlaws) return;

  const hotspot = document.getElementById(`taobao-flaw-${flawId}`);

  if (!hotspot.classList.contains("taobao-flaw-revealed")) {
    hotspot.classList.add("taobao-flaw-revealed");
    foundTaobaoFlaws++;
    playClickSound();

    if (flawId === "url") {
      updateSystemHint(
        "✅ 找到破绽：正规官方网站绝不会包含 free、xyz 等奇怪后缀！",
        true,
        1500,
      );
    } else if (flawId === "countdown") {
      updateSystemHint(
        "✅ 找到破绽：利用虚假倒计时制造焦虑，逼迫受害者失去理智。",
        true,
        1500,
      );
    } else if (flawId === "password") {
      updateSystemHint(
        "✅ 找到破绽：正规平台绝不会在网页直接索要银行卡密码！",
        true,
        1500,
      );
    }

    if (foundTaobaoFlaws === 3) {
      const hintBtn = document.getElementById("inlineHintBtn");
      if (hintBtn) hintBtn.style.display = "none";

      setTimeout(() => {
        finishTaobao();
        updateSystemHint("⚠️ 这是个钓鱼网站！请回群里劝阻三姑。", false, 1000);
        setTimeout(showLevel2Options, 1500);
      }, 2500);
    }
  }
}

// 呼出第二关选项抽屉
function showLevel2Options() {
  document.getElementById("drawerOverlay").classList.add("show");
  const actionArea = document.getElementById("actionArea");

  actionArea.innerHTML = `
    <div class="options-panel">
      <div class="question-title">你需要在群里回复三姑，你选择：</div>
      <button class="action-btn outline" onclick="chooseLevel2Option('A')">三姑你是不是傻？天上能掉馅饼吗！</button>
      <button class="action-btn solid" onclick="chooseLevel2Option('B')">指出假域名和索要密码的猫腻，劝她别填</button>
    </div>
  `;
}

// 处理第二关选择
function chooseLevel2Option(choice) {
  playClickSound();
  document.getElementById("drawerOverlay").classList.remove("show");
  document.getElementById("actionArea").innerHTML = "";

  if (choice === "A") {
    // 【修改：加上 bad-msg-2 标签，最后呼出失败弹窗】
    setTimeout(() => {
      addMessage(
        "我",
        "三姑你是不是傻？天上能掉馅饼吗？这明显是骗取银行卡密码的网站！",
        true,
        "me",
        "bad-msg-2",
      );
    }, 1000);
    setTimeout(() => {
      addMessage(
        "三姑",
        "你这孩子怎么说话的？我好心分享，不领算了！",
        false,
        "aunt",
        "bad-msg-2",
      );
    }, 3000);
    setTimeout(() => {
      addSystemMessage("5 分钟后...", "bad-msg-2");
    }, 5000);
    setTimeout(() => {
      addMessage(
        "三姑",
        "😭😭😭完了完了，我刚刚填了密码，卡里两万块钱被刷空了！",
        false,
        "aunt",
        "bad-msg-2",
      );
    }, 6500);
    setTimeout(() => {
      showFailPopup(
        2,
        "言辞过激导致长辈逆反，没能及时阻断诈骗操作，造成了严重的经济损失！",
      );
    }, 8500);
  } else if (choice === "B") {
    // 好结局
    setTimeout(() => {
      addMessage(
        "我",
        "三姑千万别填！你看这个网址后缀是.xyz，根本不是官方的。而且免费送东西还要银行卡密码，这是经典的【邮费诈骗】，填了钱就没了！",
        true,
        "me",
      );
    }, 1000);
    setTimeout(() => {
      addMessage(
        "三姑",
        "哎哟我的妈呀！😱我正找老花镜准备输密码呢，多亏了你啊，我马上删！",
        false,
        "aunt",
      );
    }, 4000);

    // 模拟三姑撤回链接
    setTimeout(() => {
      hideUncleMessage("url"); // 我们复用之前的隐藏函数，稍后稍微改一下它
      addSystemMessage("三姑撤回了一条消息");
    }, 6000);

    setTimeout(() => {
      addMessage("三表姐", "幸好我还没填！😰", false, "three_cousin");
    }, 8000);

    setTimeout(() => {
      addMessage("四表哥", "@全村的希望 👍👍👍真棒", false, "four_cousin");
    }, 10000);
    setTimeout(() => {
      addMessage("我", "😀", true, "me");
    }, 12000);
    setTimeout(() => {
      updateSystemHint("✅ 劝阻成功：保住了三姑的钱袋子！", false);
    }, 14000);

    // 弹出第二关结算
    setTimeout(() => {
      showLevel2EducationPopup();
    }, 16500);
  }
}

// ==========================================
// 2. 精准隐藏消息工具 (终极修复合并版)
// ==========================================
function hideUncleMessage(type) {
  const rows = document.querySelectorAll(".msg-row");

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.style.display === "none") continue;

    if (type === "image") {
      const hasImage = row.querySelector(".msg-image");
      if (hasImage && row.innerText.includes("二大爷")) {
        row.style.display = "none";
        return;
      }
    } else if (type === "text") {
      if (row.innerText.includes("震惊！漓江出现了变异巨兽")) {
        row.style.display = "none";
        return;
      }
    } else if (type === "url") {
      // 撤回三姑的钓鱼链接
      if (
        row.innerText.includes("三姑") &&
        row.innerHTML.includes("taoobaoo-vip-free")
      ) {
        row.style.display = "none";
        return;
      }
    } else if (type === "ft_url") {
      // 撤回老妈的会议链接
      if (
        row.innerText.includes("老妈") &&
        row.innerHTML.includes("openFaceTime")
      ) {
        row.style.display = "none";
        return;
      }
    }
  }
}

// ==========================================
// 第二关结算弹窗 (修复不显示的问题)
// ==========================================
function showLevel2EducationPopup() {
  const overlay = document.getElementById("settlementOverlay");
  const textContainer = document.getElementById("settlementText");

  textContainer.innerText = `1. 查验域名：官方网站有固定域名，警惕冗长、带有 free/vip 等拼音或奇怪后缀的山寨网址。\n2. 拒绝焦虑：骗子常利用“限时限量”制造紧张感，越催越要冷静。\n3. 守住底线：任何以“交邮费”为由，跳出官方平台索要密码的行为，100%是诈骗。`;

  const btn = document.querySelector("#settlementOverlay .start-btn-light");
  btn.innerText = "我学会了";
  btn.onclick = () => {
    playClickSound();
    overlay.style.opacity = "0";
    setTimeout(() => {
      maxDelay = 0;
      overlay.style.display = "none";
      // 触发第三关老妈的台词
      if (GAME_STORY.level3_opening) {
        GAME_STORY.level3_opening.forEach((item) => {
          setTimeout(() => {
            addMessage(item.sender, item.text, false, item.avatar);
          }, item.delay);
          if (item.delay > maxDelay) maxDelay = item.delay;
        });
      }

      setTimeout(() => {
        nextStep(3);
      }, maxDelay + 1500); // 在最后一条消息发出后，等 1.5 秒再弹系统提示
    }, 500);
  };

  // 【关键修复】：加上了这最后两行，弹窗和礼花终于能出来了！
  overlay.style.display = "flex";
  setTimeout(() => {
    overlay.style.opacity = "1";
    fireConfetti();
  }, 100);

  overlay.style.display = "flex";
  setTimeout(() => {
    overlay.style.opacity = "1";
    playConfettiSound(); // 【新增】：播放礼花音效！
    fireConfetti();
  }, 100);
}
// ==========================================
// 第三关：终极 AI 客服与屏幕共享危机
// ==========================================
let foundFTFlaws = 0;
let canFindFTFlaws = false;

function openFaceTime() {
  playClickSound();
  document.getElementById("facetimeOverlay").style.display = "flex";

  setTimeout(() => {
    updateSystemHint(
      "⚠️ 完美伪装的高级定制诈骗：请找出3个逻辑破绽！",
      true,
      1000,
    );
    canFindFTFlaws = true;
  }, 300);
}

function closeFaceTime() {
  playClickSound();
  document.getElementById("facetimeOverlay").style.display = "none";
}

function finishFaceTime() {
  playClickSound();
  document.getElementById("facetimeOverlay").style.display = "none";
}

function revealFaceTimeFlaw(flawId) {
  if (!canFindFTFlaws) return;

  const hotspot = document.getElementById(`ft-flaw-${flawId}`);

  if (!hotspot.classList.contains("ft-flaw-revealed")) {
    hotspot.classList.add("ft-flaw-revealed");
    foundFTFlaws++;
    playClickSound();

    if (flawId === "channel") {
      updateSystemHint(
        "✅ 找到破绽：官方客服绝不会使用外部会议软件或视频电话联系你！",
        true,
        1500,
      );
    } else if (flawId === "transfer") {
      updateSystemHint(
        "✅ 找到破绽：官方没有所谓的安全账户，要求转账验资100%是诈骗！",
        true,
        1500,
      );
    } else if (flawId === "screenshare") {
      updateSystemHint(
        "✅ 找到破绽：一旦开启屏幕共享，你的密码和验证码将对骗子完全透明！",
        true,
        1500,
      );
    }

    if (foundFTFlaws === 3) {
      const hintBtn = document.getElementById("inlineHintBtn");
      if (hintBtn) hintBtn.style.display = "none";

      setTimeout(() => {
        finishFaceTime();
        updateSystemHint("⚠️ 请立刻制止老妈的操作！", false, 1000);
        setTimeout(showLevel3Options, 1500);
      }, 2500);
    }
  }
}

// 呼出第三关选项抽屉
function showLevel3Options() {
  document.getElementById("drawerOverlay").classList.add("show");
  const actionArea = document.getElementById("actionArea");

  actionArea.innerHTML = `
    <div class="options-panel">
      <div class="question-title">老妈正在操作，迫在眉睫，你必须立刻回复：</div>
      <button class="action-btn outline" onclick="chooseLevel3Option('A')">妈你别理他，这视频里的人是AI换脸生成的假客服！</button>
      <button class="action-btn solid" onclick="chooseLevel3Option('B')">挂断！开飞行模式！只要要求屏幕共享和转账就是诈骗！</button>
    </div>
  `;
}

// 处理第三关选择
function chooseLevel3Option(choice) {
  playClickSound();
  document.getElementById("drawerOverlay").classList.remove("show");
  document.getElementById("actionArea").innerHTML = "";

  if (choice === "A") {
    // 【修改：加上 bad-msg-3 标签，最后呼出失败弹窗】
    setTimeout(() => {
      addMessage(
        "我",
        "妈你别理她，这视频里的客服是 AI 换脸生成的，假的！",
        true,
        "me",
        "bad-msg-3",
      );
    }, 1000);
    setTimeout(() => {
      addMessage(
        "老妈",
        "怎么可能假？人活生生在那说话呢！你别瞎说，我赶紧弄完，不然扣钱了！",
        false,
        "mother",
        "bad-msg-3",
      );
    }, 3000);
    setTimeout(() => {
      addSystemMessage("3 分钟后...", "bad-msg-3");
    }, 5000);
    setTimeout(() => {
      addMessage(
        "老妈",
        "完了……我刚共享完屏幕，银行发短信说我卡里的定期全被转走了😭😭😭！",
        false,
        "mother",
        "bad-msg-3",
      );
    }, 6500);
    setTimeout(() => {
      showFailPopup(
        3,
        "纠结技术真假毫无意义！\n未能抓重点及时阻断屏幕共享，导致核心隐私全部泄露。",
      );
    }, 8500);
  } else if (choice === "B") {
    // 好结局
    setTimeout(() => {
      addMessage(
        "我",
        "妈！马上挂断！开飞行模式！不管她看着多真，只要她要屏幕共享和转账，100%是诈骗！",
        true,
        "me",
      );
    }, 1000);
    setTimeout(() => {
      addMessage(
        "老妈",
        "哎呀！对对对，民警同志来小区宣传的时候讲过不能屏幕共享！我着急一下子忘了，我马上挂断拉黑！",
        false,
        "mother",
      );
    }, 3500);

    setTimeout(() => {
      hideUncleMessage("ft_url");
      addSystemMessage("老妈撤回了一条消息");
    }, 5500);

    setTimeout(() => {
      addMessage(
        "老妈",
        "辖区的民警同志给我打电话了，刚刚那个果然是诈骗！",
        false,
        "mother",
      );
    }, 8500);

    setTimeout(() => {
      addMessage(
        "大舅",
        "这骗术太高明了，换我我也觉得真有这么一回事",
        false,
        "one_uncle",
      );
    }, 10500);
    setTimeout(() => {
      addMessage("老爸", "简直防不胜防！", false, "father");
    }, 12500);
    setTimeout(() => {
      addMessage("老妈", "幸好没上当😌多亏了咱娃！", false, "mother");
    }, 14500);
    setTimeout(() => {
      addMessage(
        "老妈",
        "以后还是要多多学习，遇到这种事就能分辨出来了！🤭",
        false,
        "mother",
      );
    }, 16500);
    setTimeout(() => {
      updateSystemHint("✅ 极限救援成功：成功守住核心隐私与资金防线！", false);
    }, 19500);

    // 弹出终极大结算
    setTimeout(() => {
      showLevel3EducationPopup();
    }, 21500);
  }
}

// 第三关终极大结算弹窗
function showLevel3EducationPopup() {
  const overlay = document.getElementById("settlementOverlay");
  const textContainer = document.getElementById("settlementText");

  // 【关键修复】：改用 querySelector 去找弹窗里的 h1 标题，并修改它的文字
  const titleElement = document.querySelector(
    "#settlementOverlay .game-title-light",
  );
  if (titleElement) {
    titleElement.innerText = "🏆 完美通关！";
  }

  textContainer.innerText = `1. 放弃执念，重塑标准：在 AI 时代，不要试图用肉眼去分辨视频和声音的真假，技术上已经无法区分。\n2. 死守隐私防线：无论对方披着怎样完美的官方外衣，只要触及“屏幕共享”、“索要验证码”、“转移资金”这三条红线，即刻判定为诈骗。\n3. 信息溯源：警惕一切“官方人员”通过非官方平台发起的联系。`;

  const btn = document.querySelector("#settlementOverlay .start-btn-light");
  btn.innerText = "重新开始";
  btn.onclick = () => {
    playClickSound();
    location.reload(); // 点击后重新刷新页面
  };

  overlay.style.display = "flex";
  setTimeout(() => {
    overlay.style.opacity = "1";
    fireConfetti(); // 满屏礼花庆祝
    fireConfetti(); // 再放一次，双倍快乐！
  }, 100);

  overlay.style.display = "flex";
  setTimeout(() => {
    overlay.style.opacity = "1";
    playConfettiSound(); // 【新增】：播放礼花音效！
    fireConfetti();
  }, 100);
}
// ==========================================
// 【新增】：闯关失败弹窗与时光倒流引擎 (超强防卡死兼容版)
// ==========================================
function showFailPopup(level, failMessage) {
  const overlay = document.getElementById("failOverlay");
  const textContainer = document.getElementById("failText");
  const btn = document.getElementById("failBtn");

  textContainer.innerText = failMessage;

  // 每次绑定前清理一下，防止多次点击出 Bug
  btn.onclick = null;
  btn.onclick = () => {
    playClickSound();
    overlay.style.opacity = "0";

    setTimeout(() => {
      overlay.style.display = "none";

      try {
        // 1. 兼容性极强的时光倒流：删掉刚才因为选错而生成的所有消息
        const badMsgs = document.querySelectorAll(`.bad-msg-${level}`);
        // 放弃 forEach，改用最传统的 for 循环，防止微信老版本内核报错卡死
        for (let i = 0; i < badMsgs.length; i++) {
          if (badMsgs[i]) {
            // 兼容老手机的删除写法
            if (badMsgs[i].remove) {
              badMsgs[i].remove();
            } else if (badMsgs[i].parentNode) {
              badMsgs[i].parentNode.removeChild(badMsgs[i]);
            }
          }
        }

        // 2. 重新呼出对应关卡的选项抽屉
        if (level === 1) {
          // 【智能恢复人数】
          if (typeof isWeChat !== "undefined" && isWeChat) {
            document.title = "相亲相爱一家人 (27)";

            // 🪄 微信黑科技：利用加载透明 iframe 强制刷新顶部的标题栏
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src =
              "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
            iframe.onload = () => {
              setTimeout(() => {
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
              }, 10);
            };
            document.body.appendChild(iframe);
          }

          // 不管是不是微信，顺手把假群头也改了，买个双重保险
          const groupNameDiv = document.getElementById("groupName");
          if (groupNameDiv) groupNameDiv.innerText = "相亲相爱一家人 (27)";

          showDebunkOptions();
        } else if (level === 2) {
          showLevel2Options();
        } else if (level === 3) {
          showLevel3Options();
        }
      } catch (error) {
        console.error("时光倒流发生严重错误：", error);
        // 🛡️ 终极兜底：就算上面报错了，也必须把选项弹出来，绝不能卡死！
        if (level === 1) showDebunkOptions();
        else if (level === 2) showLevel2Options();
        else if (level === 3) showLevel3Options();
      }
    }, 300);
  };

  overlay.style.display = "flex";
  setTimeout(() => {
    overlay.style.opacity = "1";
  }, 100);
}
