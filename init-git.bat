@echo off
chcp 65001 >nul
echo ========================================
echo   Git 初始化并强制推送
echo   警告：这将清空远程仓库的所有内容！
echo ========================================
echo.

REM 检查是否需要使用代理
set USE_PROXY=n
set /p USE_PROXY="是否使用代理 (端口 4780)? (y/n, 默认 n): "

if /i "%USE_PROXY%"=="y" (
    echo 设置代理: http://127.0.0.1:4780
    set HTTP_PROXY=http://127.0.0.1:4780
    set HTTPS_PROXY=http://127.0.0.1:4780
    git config --global http.proxy http://127.0.0.1:4780
    git config --global https.proxy http://127.0.0.1:4780
) else (
    echo 不使用代理
    git config --global --unset http.proxy 2>nul
    git config --global --unset https.proxy 2>nul
)

echo.
echo ⚠️  警告：此操作将：
echo    1. 删除本地 .git 目录
echo    2. 重新初始化 Git 仓库
echo    3. 强制推送，覆盖远程仓库所有内容
echo.
set /p CONFIRM="确认继续? (输入 YES 继续): "

if not "%CONFIRM%"=="YES" (
    echo 操作已取消
    pause
    exit /b 0
)

echo.
echo [1/8] 删除旧的 Git 仓库...
if exist .git (
    rmdir /s /q .git
    echo ✅ 已删除 .git 目录
) else (
    echo ℹ️  没有找到 .git 目录
)

echo.
echo [2/8] 初始化新的 Git 仓库...
git init
if errorlevel 1 (
    echo ❌ Git 初始化失败
    pause
    exit /b 1
)

echo.
echo [3/8] 创建 .gitignore...
(
echo # Node modules
echo node_modules/
echo.
echo # Build outputs
echo dist/
echo build/
echo.
echo # Python
echo __pycache__/
echo *.pyc
echo *.pyo
echo *.pyd
echo .Python
echo venv/
echo env/
echo.
echo # Database
echo *.db
echo *.sqlite
echo *.sqlite3
echo.
echo # IDE
echo .vscode/
echo .idea/
echo *.swp
echo *.swo
echo *~
echo.
echo # OS
echo .DS_Store
echo Thumbs.db
echo desktop.ini
echo.
echo # Logs
echo *.log
echo logs/
echo.
echo # Android
echo android/app/build/
echo android/.gradle/
echo android/local.properties
echo android/.idea/
echo *.keystore
echo *.jks
echo.
echo # iOS
echo ios/App/Pods/
echo ios/App/build/
echo.
echo # Capacitor
echo .capacitor/
) > .gitignore

echo ✅ 已创建 .gitignore

echo.
echo [4/8] 添加所有文件...
git add .
if errorlevel 1 (
    echo ❌ 添加文件失败
    pause
    exit /b 1
)

echo.
echo [5/8] 创建初始提交...
git commit -m "Initial commit: Photo App"
if errorlevel 1 (
    echo ❌ 提交失败
    pause
    exit /b 1
)

echo.
echo [6/8] 设置远程仓库...
git remote add origin https://github.com/sky2048/photo-app.git
if errorlevel 1 (
    echo ℹ️  远程仓库已存在，更新 URL...
    git remote set-url origin https://github.com/sky2048/photo-app.git
)

echo.
echo [7/8] 设置默认分支为 main...
git branch -M main

echo.
echo [8/8] 强制推送到远程仓库...
echo ⚠️  这将覆盖远程仓库的所有内容！
timeout /t 3 /nobreak
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
    echo 如果需要身份验证，请使用 Personal Access Token:
    echo https://github.com/settings/tokens
    echo.
    echo 然后使用以下命令推送：
    echo git push -f https://YOUR_TOKEN@github.com/sky2048/photo-app.git main
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ 初始化完成！
echo ========================================
echo.
echo 📦 仓库地址: https://github.com/sky2048/photo-app
echo 🌿 默认分支: main
echo.
echo 接下来可以：
echo 1. 运行 photo-app\photo-viewer\deploy.bat 进行日常更新
echo 2. 运行 photo-app\photo-viewer\release.bat 发布新版本
echo 3. 访问 https://github.com/sky2048/photo-app/actions 查看构建
echo.

REM 询问是否打开仓库
set /p OPEN_REPO="是否打开 GitHub 仓库? (y/n): "
if /i "%OPEN_REPO%"=="y" (
    start https://github.com/sky2048/photo-app
)

pause
