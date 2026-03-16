// story.js
const ASSETS = {
  AVATARS: {
    aunt_zhang: "assets/aunt_zhang.png", // 张大姐头像
  },
  AUDIO: {
    bgm: "assets/bgm.mp3", // 请确保有此循环背景音乐文件
    click: "assets/click.mp3", // 点击提示音（选项点击用）
  },
  COVERS: {
    news_banner: "assets/news_banner.png", // 推文的封面图
  },
};

const GAME_STORY = {
  // 业主群初始消息
  ownerGroupMessages: [
    {
      sender: "张大姐",
      avatar: "aunt_zhang",
      type: "text",
      content:
        "咱市图书馆在搞建馆周年庆。点进去关注就能领50块话费，还额外送一箱大卷纸，说名额只有前500个！",
      time: "半小时前",
    },
    {
      sender: "张大姐",
      avatar: "aunt_zhang",
      type: "link",
      title: "【官方认证】建馆30周年，50元话费与好礼限时领！",
      desc: "关注即领，名额有限，先到先得。",
      cover: ASSETS.COVERS.news_banner,
      time: "半小时前",
    },
  ],
};
