# Movie Webpage

向 50 位女性导演致敬的互动网页，包含背景海报、导演滚动字幕、测验、留言簿与侧边栏留言墙等功能。

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

## 本地开发

直接用浏览器打开 `index.html` 即可（依赖 Firebase CDN）。如有跨域图片资源，建议使用本地静态服务器：

```bash
# Python 3
python3 -m http.server 5173
# 或 Node
npx http-server -p 5173
访问 http://localhost:5173/

## 部署到 GitHub Pages（项目页）

1. 初始化 Git 并推送：
```bash
git init
git branch -M main
git add .
git commit -m "init: movie webpage"
# 替换为你的仓库
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```
2. GitHub 仓库 → Settings → Pages → Build and deployment：
   - Source: Deploy from a branch
   - Branch: main / (root)
3. 等待 1-3 分钟，访问页面显示的 URL（形如 `https://<username>.github.io/<repo-name>/`）。

注意：所有静态资源路径均使用 `./` 开头，避免项目页子路径导致的 404。

## Firebase 安全提示

- 前端暴露的 `apiKey` 不是机密，但 Firestore 规则务必严格配置，避免匿名写/删。
- 本项目已迁移管理员操作到 Firebase Auth + Cloud Functions。请部署 functions 并设定管理员 custom claims。

### 部署 Cloud Functions（仅管理员改删）

1) 安装 Firebase CLI 并登录：
```bash
npm i -g firebase-tools
firebase login
```
2) 在项目根（movie-webpage）设置项目并部署函数：
```bash
# 关联你的 Firebase 项目（选择现有或输入 Project ID）
firebase use --add

# 安装依赖并部署 functions
cd functions
npm i
cd ..
firebase deploy --only functions
```

# 用你的 UID 作为 Owner（在 Firebase 控制台 Authentication 中可见）
firebase functions:config:set security.owner_uid="<YOUR_UID>"
# 然后在前端登录 owner 账号，调用 grantAdmin(uid)
```
将根目录的 firestore.rules 应用：
```bash
firebase deploy --only firestore:rules
```

### 前端行为
- 删除与编辑留言：调用 httpsCallable('adminDeleteSubmission' | 'adminUpdateSubmission')，函数会校验 admin 自定义声明。
- 登录：按提示使用 Google 登录（或扩展 Email/Password）。

### 管理后台面板
- 登录管理员账号后，右上方会显示 **👑 管理员模式** 栏与一个管理后台面板。
- 在面板中输入目标用户的 UID，点击**授权**按钮可调用 `grantAdmin(uid)` 给该用户赋予管理员权限。
- 快捷键:
  - `Ctrl+Shift+A`（或 Mac 的 `Cmd+Shift+A`）：触发 Google 登录
  - `Ctrl+Shift+M`：切换管理后台面板显隐
- 获取用户 UID：在 Firebase Console → Authentication 中，选择用户可看其 UID（或让用户用 `window.auth.currentUser.uid` 在前端查看）。

## TODO（按需补充原逻辑）
- 在 `js/data.js` 中填入完整的 `filmImages` 与 `questions` 数组（目前为占位）。
- 若有更复杂的测验判定/徽章授予规则，请把逻辑补回 `quiz.js`。
- 若需用户身份体系，请接入 Firebase Auth，并在 `admin.js` 中替换密码验证方案。
