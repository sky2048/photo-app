@echo off
chcp 65001 >nul
echo ========================================
echo   首次强制推送到 GitHub
echo   警告：这将覆盖远程仓库的所有内容！
echo ========================================
echo.

REM 检查是否需要使用代理
set USE_PROXY=n
set /p USE_PROXY="是否使用代理 (端口 4780)? (y/n, 默认 n): "

if /i "%USE_PROXY%"=="y" (
    echo 设置代理: http://127.0.0.1:4780
    git config --global http.proxy http://127.0.0.1:4780
    git config --global https.proxy http://127.0.0.1:4780
    echo ✅ 代理已设置
) else (
    echo 不使用代理
    git config --global --unset http.proxy 2>nul
    git config --global --unset https.proxy 2>nul
)

echo.
echo ⚠️  警告：此操作将强制推送，覆盖远程仓库所有内容！
echo.
set /p CONFIRM="确认继续? (输入 YES 继续): "

if not "%CONFIRM%"=="YES" (
    echo 操作已取消
    pause
    exit /b 0
)

echo.
echo 正在强制推送到 GitHub...
echo.
git push -f origin main

if errorlevel 1 (
    echo.
    echo ❌ 推送失败！
    echo.
    echo 可能的原因：
    echo 1. 网络问题（尝试启用代理）
    echo 2. 没有推送权限
    echo 3. 需要身份验证
    echo.
    echo 💡 如果需要身份验证，请：
    echo 1. 访问 https://github.com/settings/tokens
    echo 2. 创建 Personal Access Token (勾选 repo 权限)
    echo 3. 使用以下命令推送：
    echo    git push -f https://YOUR_TOKEN@github.com/sky2048/photo-app.git main
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ 推送成功！
echo ========================================
echo.
echo 📦 仓库地址: https://github.com/sky2048/photo-app
echo 🌿 分支: main
echo 📁 文件数: 51
echo.
echo 接下来可以：
echo 1. 访问 https://github.com/sky2048/photo-app 查看代码
echo 2. 运行 photo-app\photo-viewer\deploy.bat 进行日常更新
echo 3. 运行 photo-app\photo-viewer\release.bat 发布新版本
echo 4. 访问 https://github.com/sky2048/photo-app/actions 触发 APK 构建
echo.

REM 询问是否打开仓库
set /p OPEN_REPO="是否打开 GitHub 仓库? (y/n): "
if /i "%OPEN_REPO%"=="y" (
    start https://github.com/sky2048/photo-app
)

echo.
echo 💡 提示：首次推送后，可以删除此脚本
pause
