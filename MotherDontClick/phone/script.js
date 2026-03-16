const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

document.addEventListener("DOMContentLoaded", () => {
  initWeChatTitle();
  renderGroupMessages();
});

function initWeChatTitle() {
  const groupName = "幸福家园业主群 (492)";
  if (isWeChat) {
    document.title = groupName;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    iframe.onload = () =>
      setTimeout(() => {
        iframe.parentNode.removeChild(iframe);
      }, 10);
    document.body.appendChild(iframe);
  }
  const groupTitleDiv = document.getElementById("groupName");
  if (groupTitleDiv) groupTitleDiv.innerText = groupName;
}

function renderGroupMessages() {
  const chatBox = document.getElementById("chatBox");
  if (!chatBox) return;

  const timeDivider = `<div class="time-divider"><span>半小时前</span></div>`;
  chatBox.innerHTML += timeDivider;

  GAME_STORY.ownerGroupMessages.forEach((msg) => {
    let html = "";
    if (msg.type === "link") {
      html = `
        <div class="message-item">
            <img src="${ASSETS.AVATARS[msg.avatar] || ""}" class="avatar" onerror="this.src=''">
            <div class="content-area">
                <div class="sender-name">${msg.sender}</div>
                <div class="link-card" onclick="openArticle()">
                    <div class="link-title">${msg.title}</div>
                    <div class="link-body">
                        <p>${msg.desc}</p>
                        <img src="${msg.cover || ""}" onerror="this.style.display='none'">
                    </div>
                </div>
            </div>
        </div>`;
    } else {
      html = `
        <div class="message-item">
            <img src="${ASSETS.AVATARS[msg.avatar] || ""}" class="avatar" onerror="this.src=''">
            <div class="content-area">
                <div class="sender-name">${msg.sender}</div>
                <div class="text-bubble">${msg.content}</div>
            </div>
        </div>`;
    }
    chatBox.innerHTML += html;
  });
}

function openArticle() {
  document.getElementById("article-page").style.display = "block";
  document.getElementById("wechat-page").style.display = "none"; // 隐藏群聊
  if (isWeChat) document.title = "公众号文章";
}

function closeArticle() {
  document.getElementById("article-page").style.display = "none";
  document.getElementById("wechat-page").style.display = "flex"; // 恢复群聊
  initWeChatTitle();
}

function triggerDebunk(type) {
  alert("点击了找茬点：" + type);
}
