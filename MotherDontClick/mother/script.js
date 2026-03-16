let bgm;

document.addEventListener("DOMContentLoaded", () => {
  const textEl = document.getElementById("dialogue-text");
  const nameEl = document.getElementById("character-name");
  const charImg = document.getElementById("character-image");
  const optionsCont = document.getElementById("options-container");
  const gameContainer = document.querySelector(".game-container");

  let currentId = 0;
  let isTyping = false;

  bgm = new Audio(ASSETS.AUDIO.bgm);
  bgm.loop = true;

  const tryPlayBGM = () => {
    if (bgm && bgm.paused) {
      bgm.play().catch((e) => console.log("等待互动播放BGM"));
    }
  };

  const initGame = () => {
    showLine(0);
  };

  const showLine = (id) => {
    const line = GAME_STORY.scriptLines.find((l) => l.id === id);
    if (!line) return;

    currentId = id;
    isTyping = true;
    optionsCont.classList.remove("active");
    optionsCont.innerHTML = "";
    textEl.innerHTML = "";
    nameEl.innerText = line.name;

    if (line.emotion) {
      charImg.src = `assets/mom_${line.emotion}.png`;
    }

    let i = 0;
    const typing = setInterval(() => {
      if (i < line.text.length) {
        textEl.innerHTML += line.text.charAt(i);
        i++;
      } else {
        clearInterval(typing);
        isTyping = false;
        if (line.options) renderOptions(line.options);
      }
    }, 30);
  };

  const renderOptions = (opts) => {
    optionsCont.classList.add("active");
    opts.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "option-button";
      btn.innerText = opt.text;
      btn.onclick = (e) => {
        e.stopPropagation();
        tryPlayBGM();
        new Audio(ASSETS.AUDIO.click).play().catch(() => {});
        showLine(opt.nextId);
      };
      optionsCont.appendChild(btn);
    });
  };

  gameContainer.onclick = () => {
    tryPlayBGM();
    if (isTyping) return;
    const line = GAME_STORY.scriptLines.find((l) => l.id === currentId);
    if (line && !line.options && line.nextId !== undefined) {
      showLine(line.nextId);
    }
  };

  initGame();
});

// 测试用的手机按钮点击事件
function togglePhone() {
  alert("【开发占位】这里将来会跳转到手机微信界面！");
}
