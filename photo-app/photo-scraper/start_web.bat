@echo off
chcp 65001 >nul
echo ========================================
echo 爬虫 Web 管理界面
echo ========================================
echo.
echo 启动服务器...
echo 访问地址: http://localhost:5001
echo.

python web_ui.py

pause
