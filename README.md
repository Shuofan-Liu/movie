# Movie Webpage

向 女性导演致敬的互动网页，包含背景海报、导演滚动字幕、测验、留言簿与侧边栏留言墙等功能。

## 目录结构

```
movie-webpage/
├── index.html         # 主页面（引用独立 CSS/JS）
├── css/
│   └── styles.css     # 全站样式
└── js/
    ├── config.js      # Firebase 配置 & 全局状态
    ├── data.js        # 导演/海报/题目数据
    ├── firebase.js    # Firestore CRUD
    ├── ui.js          # UI 组件与初始化
    ├── quiz.js        # 测验逻辑
    ├── guestbook.js   # 留言簿与留言墙
    └── admin.js       # 管理员功能
```

