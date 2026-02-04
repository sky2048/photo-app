# Android APK 构建指南

## GitHub Actions 自动构建

项目已配置两个 GitHub Actions 工作流：

### 1. 开发版构建 (build-android.yml)
- **触发条件**：推送到 main/master 分支，或手动触发
- **输出**：未签名的 debug APK
- **下载**：在 GitHub Actions 页面的 Artifacts 中下载

### 2. 发布版构建 (release-android.yml)
- **触发条件**：推送 tag（如 v1.0.0），或手动触发
- **输出**：签名的 release APK（如果配置了密钥）
- **下载**：在 GitHub Releases 页面下载

## 使用步骤

### 快速开始（开发版）
1. 将代码推送到 GitHub
2. 进入仓库的 Actions 页面
3. 选择 "Build Android APK" 工作流
4. 点击 "Run workflow" 手动触发
5. 等待构建完成后，在 Artifacts 中下载 APK

### 发布正式版
1. 创建并推送 tag：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. GitHub Actions 自动构建并创建 Release
3. 在 Releases 页面下载 APK

## 配置签名密钥（可选）

如果需要发布到 Google Play，需要配置签名密钥：

### 1. 生成密钥库
```bash
keytool -genkey -v -keystore release.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### 2. 转换为 Base64
```bash
# Linux/Mac
base64 release.keystore > keystore.txt

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore")) > keystore.txt
```

### 3. 在 GitHub 设置 Secrets
进入仓库 Settings > Secrets and variables > Actions，添加：
- `KEYSTORE_BASE64`: keystore.txt 的内容
- `KEYSTORE_PASSWORD`: 密钥库密码
- `KEY_ALIAS`: 密钥别名（如 my-key-alias）
- `KEY_PASSWORD`: 密钥密码

## 本地构建

如果需要在本地构建：

```bash
cd photo-app/photo-viewer

# 安装依赖
npm install

# 构建 Web 应用
npm run build

# 同步到 Android
npx cap sync android

# 打开 Android Studio
npx cap open android

# 或使用命令行构建
cd android
./gradlew assembleDebug  # 开发版
./gradlew assembleRelease  # 发布版
```

## 注意事项

1. 首次构建需要初始化 Android 项目：
   ```bash
   npx cap add android
   ```

2. 确保 `capacitor.config.json` 中的 `appId` 是唯一的

3. 修改版本号在 `android/app/build.gradle` 中

4. APK 位置：
   - Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Release: `android/app/build/outputs/apk/release/app-release.apk`

## 故障排查

- **构建失败**：检查 Actions 日志，通常是依赖问题
- **APK 无法安装**：确保设备允许安装未知来源应用
- **签名错误**：检查 GitHub Secrets 配置是否正确
