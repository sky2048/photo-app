# 写真图库 - Vue 3 移动应用

基于 Vue 3 + Capacitor + SQLite 的移动端照片浏览应用。

## 技术栈

- **Vue 3** - 前端框架
- **Vite** - 构建工具
- **Pinia** - 状态管理
- **Vue Router** - 路由管理
- **Capacitor** - 跨平台打包
- **Capacitor SQLite** - 本地数据库

## 功能特性

- 📱 原生 App 体验
- 🗄️ 本地 SQLite 数据库
- 🔄 从 GitHub 自动下载/更新数据库
- 🎨 分类浏览
- 🔍 搜索功能
- 🎲 随机浏览
- 👆 触摸手势交互
- 📦 离线可用

## 开发指南

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式（Web）

```bash
npm run dev
```

访问 http://localhost:5173

### 3. 构建

```bash
npm run build
```

### 4. 添加平台

```bash
# Android
npx cap add android

# iOS
npx cap add ios
```

### 5. 同步代码到原生项目

```bash
npx cap sync
```

### 6. 打开原生 IDE

```bash
# Android Studio
npm run android

# Xcode
npm run ios
```

## 配置数据库地址

编辑 `src/stores/db.js`，修改 `dbUrl`：

```javascript
const dbUrl = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/photo.db'
```

将 `YOUR_USERNAME` 和 `YOUR_REPO` 替换为你的 GitHub 用户名和仓库名。

## 数据库结构

应用需要以下数据库表结构：

```sql
-- 文章表
CREATE TABLE articles (
  id INTEGER PRIMARY KEY,
  title TEXT,
  category TEXT,
  thumbnail TEXT,
  date TEXT
);

-- 图片表
CREATE TABLE images (
  id INTEGER PRIMARY KEY,
  article_id INTEGER,
  url TEXT,
  position INTEGER,
  FOREIGN KEY (article_id) REFERENCES articles(id)
);
```

## 打包发布

### Android

1. 在 Android Studio 中打开项目
2. 配置签名密钥
3. Build > Generate Signed Bundle / APK
4. 选择 APK 或 AAB 格式
5. 完成打包

### iOS

1. 在 Xcode 中打开项目
2. 配置开发者账号和证书
3. Product > Archive
4. 上传到 App Store Connect

## 目录结构

```
photo-viewer/
├── src/
│   ├── assets/          # 静态资源
│   │   └── style.css    # 全局样式
│   ├── stores/          # Pinia 状态管理
│   │   └── db.js        # 数据库操作
│   ├── views/           # 页面组件
│   │   ├── HomeView.vue      # 主页
│   │   ├── RandomView.vue    # 随机浏览
│   │   └── SettingsView.vue  # 设置
│   ├── router/          # 路由配置
│   │   └── index.js
│   ├── App.vue          # 根组件
│   └── main.js          # 入口文件
├── capacitor.config.json  # Capacitor 配置
├── vite.config.js         # Vite 配置
└── package.json           # 依赖配置
```

## 注意事项

1. **数据库文件大小**：GitHub 单文件限制 100MB，如果数据库过大，考虑使用 Git LFS 或其他存储方案
2. **网络请求**：首次启动需要网络下载数据库
3. **存储权限**：Android 需要配置存储权限
4. **HTTPS**：GitHub Raw 文件使用 HTTPS，确保网络环境支持

## 常见问题

### Q: 数据库下载失败？
A: 检查网络连接和 GitHub 地址是否正确

### Q: iOS 真机调试失败？
A: 需要配置开发者证书和 Provisioning Profile

### Q: Android 打包后无法运行？
A: 检查权限配置和签名设置

## License

MIT
