@echo off
chcp 65001 >nul
echo ========================================
echo 照片查看器
echo ========================================
echo.
echo 启动服务器...
echo 访问地址: http://localhost:5000
echo.

python viewer.py

pause
