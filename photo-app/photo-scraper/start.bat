@echo off
chcp 65001 >nul
echo ========================================
echo 照片爬虫
echo ========================================
echo.
echo 选择操作:
echo 1. 爬取所有分类（每个分类5页）
echo 2. 爬取所有分类（全部）
echo 3. 爬取指定分类
echo 4. 自定义参数
echo.
set /p choice=请输入选项 (1-4): 

if "%choice%"=="1" (
    python scraper.py --max-pages 5
) else if "%choice%"=="2" (
    python scraper.py
) else if "%choice%"=="3" (
    set /p category=请输入分类ID (1-4): 
    python scraper.py --category %category% --max-pages 10
) else if "%choice%"=="4" (
    python scraper.py
) else (
    echo 无效选项
)

pause
