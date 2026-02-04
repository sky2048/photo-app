@echo off
chcp 65001 >nul
echo ========================================
echo   一键上传并打包 APK
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
    git config --global --unset http.proxy
    git config --global --unset https.proxy
)

echo.
echo [1/5] 检查 Git 状态...
git status

echo.
echo [2/5] 添加所有更改...
git add .

echo.
set /p COMMIT_MSG="请输入提交信息 (默认: Update): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Update

echo [3/5] 提交更改...
git commit -m "%COMMIT_MSG%"

echo.
echo [4/5] 推送到 GitHub...
git push origin main

if errorlevel 1 (
    echo 推送失败，尝试推送到 master 分支...
    git push origin master
)

if errorlevel 1 (
    echo.
    echo ❌ 推送失败！请检查：
    echo    1. 是否已设置远程仓库
    echo    2. 是否有推送权限
    echo    3. 网络连接是否正常
    pause
    exit /b 1
)

echo.
echo ✅ 代码已成功推送到 GitHub！
echo.
echo [5/5] 触发 GitHub Actions 构建...
echo.
echo 请访问以下链接手动触发构建：
echo https://github.com/sky2048/photo-app/actions
echo.
echo 或者使用 GitHub CLI 自动触发：
echo gh workflow run build-android.yml
echo.
echo ========================================
echo   完成！
echo ========================================
echo.
echo 📱 APK 构建需要几分钟时间
echo 📦 构建完成后可在 Actions 页面下载
echo.

REM 询问是否打开浏览器
set /p OPEN_BROWSER="是否打开 GitHub Actions 页面? (y/n): "
if /i "%OPEN_BROWSER%"=="y" (
    start https://github.com/sky2048/photo-app/actions
)

pause
