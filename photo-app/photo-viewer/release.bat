@echo off
chcp 65001 >nul
echo ========================================
echo   发布新版本 (创建 Release APK)
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
echo 当前最新的 tags:
git tag --sort=-v:refname | head -n 5

echo.
set /p VERSION="请输入版本号 (如 v1.0.0): "

if "%VERSION%"=="" (
    echo ❌ 版本号不能为空
    pause
    exit /b 1
)

REM 确保版本号以 v 开头
echo %VERSION% | findstr /r "^v" >nul
if errorlevel 1 (
    set VERSION=v%VERSION%
    echo 自动添加前缀: %VERSION%
)

echo.
echo [1/5] 检查是否有未提交的更改...
git status --short

echo.
set /p COMMIT_FIRST="是否先提交当前更改? (y/n): "
if /i "%COMMIT_FIRST%"=="y" (
    git add .
    set /p COMMIT_MSG="请输入提交信息: "
    git commit -m "!COMMIT_MSG!"
    
    echo 推送更改...
    git push origin main
    if errorlevel 1 git push origin master
)

echo.
echo [2/5] 创建 tag: %VERSION%
set /p TAG_MSG="请输入版本说明 (可选): "
if "%TAG_MSG%"=="" (
    git tag %VERSION%
) else (
    git tag -a %VERSION% -m "%TAG_MSG%"
)

if errorlevel 1 (
    echo ❌ 创建 tag 失败，可能已存在
    pause
    exit /b 1
)

echo.
echo [3/5] 推送 tag 到 GitHub...
git push origin %VERSION%

if errorlevel 1 (
    echo ❌ 推送失败
    echo 删除本地 tag...
    git tag -d %VERSION%
    pause
    exit /b 1
)

echo.
echo ✅ Tag 已推送！GitHub Actions 将自动构建 Release APK

echo.
echo [4/5] 等待 GitHub Actions 触发...
timeout /t 3 /nobreak >nul

echo.
echo [5/5] 打开 GitHub 页面...
echo.
echo 📦 Release 页面:
echo https://github.com/sky2048/photo-app/releases
echo.
echo 📊 Actions 页面:
echo https://github.com/sky2048/photo-app/actions
echo.

set /p OPEN_PAGE="打开哪个页面? (1=Release, 2=Actions, n=不打开): "
if "%OPEN_PAGE%"=="1" (
    start https://github.com/sky2048/photo-app/releases
) else if "%OPEN_PAGE%"=="2" (
    start https://github.com/sky2048/photo-app/actions
)

echo.
echo ========================================
echo   完成！
echo ========================================
echo.
echo 版本: %VERSION%
echo.
echo ⏳ Release APK 构建需要几分钟
echo 📥 完成后在 Releases 页面下载
echo.

pause
