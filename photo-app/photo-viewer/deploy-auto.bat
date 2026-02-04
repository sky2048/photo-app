@echo off
chcp 65001 >nul
echo ========================================
echo   一键上传并自动打包 APK
echo   (需要安装 GitHub CLI)
echo ========================================
echo.

REM 检查 GitHub CLI 是否安装
where gh >nul 2>nul
if errorlevel 1 (
    echo ❌ 未检测到 GitHub CLI
    echo.
    echo 请先安装 GitHub CLI:
    echo https://cli.github.com/
    echo.
    echo 或使用 deploy.bat 手动触发构建
    pause
    exit /b 1
)

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
    git config --global --unset http.proxy
    git config --global --unset https.proxy
)

echo.
echo [1/6] 检查 Git 状态...
git status

echo.
echo [2/6] 添加所有更改...
git add .

echo.
set /p COMMIT_MSG="请输入提交信息 (默认: Update): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Update

echo [3/6] 提交更改...
git commit -m "%COMMIT_MSG%"

if errorlevel 1 (
    echo 没有需要提交的更改
    set /p CONTINUE="是否继续触发构建? (y/n): "
    if /i not "%CONTINUE%"=="y" exit /b 0
    goto trigger_build
)

echo.
echo [4/6] 推送到 GitHub...
git push origin main

if errorlevel 1 (
    echo 推送失败，尝试推送到 master 分支...
    git push origin master
)

if errorlevel 1 (
    echo.
    echo ❌ 推送失败！请检查网络和权限
    pause
    exit /b 1
)

echo.
echo ✅ 代码已成功推送到 GitHub！

:trigger_build
echo.
echo [5/6] 触发 GitHub Actions 构建...
gh workflow run build-android.yml --repo sky2048/photo-app

if errorlevel 1 (
    echo.
    echo ⚠️  自动触发失败，请手动访问：
    echo https://github.com/sky2048/photo-app/actions
    pause
    exit /b 1
)

echo.
echo ✅ 构建已触发！

echo.
echo [6/6] 等待构建开始...
timeout /t 5 /nobreak >nul

echo.
echo 📊 查看构建状态...
gh run list --repo sky2048/photo-app --limit 3

echo.
echo ========================================
echo   完成！
echo ========================================
echo.
echo 📱 APK 构建需要几分钟时间
echo 📦 使用以下命令查看构建状态：
echo    gh run list --repo sky2048/photo-app
echo.
echo 📥 构建完成后下载 APK：
echo    gh run download --repo sky2048/photo-app
echo.

REM 询问是否打开浏览器
set /p OPEN_BROWSER="是否打开 GitHub Actions 页面? (y/n): "
if /i "%OPEN_BROWSER%"=="y" (
    start https://github.com/sky2048/photo-app/actions
)

pause
