// story.js
const ASSETS = {
  AVATARS: {
    mom_normal: "assets/mom_normal.png",
    mom_happy: "assets/mom_happy.png",
    mom_thinking: "assets/mom_thinking.png",
    mom_surprised: "assets/mom_surprised.png",
    mom_sad: "assets/mom_sad.png",
    aunt_zhang: "assets/aunt_zhang.png", // 张大姐头像
  },
  ICONS: { phone_icon: "assets/phone_icon.svg" },
  AUDIO: {
    bgm: "assets/bgm.mp3", // 请确保有此循环背景音乐文件
    click: "assets/click.mp3", // 点击提示音（选项点击用）
  },
  COVERS: {
    news_banner: "assets/news_banner.jpg", // 推文的封面图
  },
};

const GAME_STORY = {
  scriptLines: [
    {
      id: 0,
      name: "妈妈",
      emotion: "happy",
      text: "林林，张大姐在业主群发了个咱市图书馆的公众号名片，说关注就能领 50 块钱话费和一箱抽纸。",
      nextId: 1,
    },
    {
      id: 1,
      name: "妈妈",
      emotion: "happy",
      text: "我看头像是咱图书馆的标，这就准备点关注了！",
      nextId: 2,
    },
    {
      id: 2,
      name: "我",
      emotion: "happy",
      text: "张大姐平时就爱转发这些，图书馆周年庆怎么会用这种微商风格的宣传图？",
      nextId: 3,
    },
    {
      id: 3,
      name: "我",
      emotion: "thinking",
      text: "我该怎么劝她呢？",
      options: [
        { text: "妈妈，天上不会掉馅饼，别理它。", nextId: 4 },
        {
          text: "等等妈！现在这种高仿号专门欺负咱不懂行的，万一领不到话费反而把手机弄中毒了呢？",
          nextId: 5,
        },
      ],
    },
    {
      id: 4,
      name: "妈妈",
      emotion: "sad",
      text: "唉，你这孩子就是太谨慎，名额有限，我先点了啊！\n【游戏结束：未能阻止风险】",
      options: [{ text: "回到刚才", nextId: 1 }],
    },
    {
      id: 5,
      name: "我",
      emotion: "thinking",
      text: "（点击右上角手机按钮，开始帮妈妈体检公众号吧！）",
      // 这里可以触发解锁手机按钮的逻辑
    },
  ],
};
