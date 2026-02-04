# Photo App - 照片应用

一个分离式的照片爬取和展示系统，由两个独立项目组成。

## 项目结构

```
.
├── photo-scraper/      # 爬虫项目 - 爬取数据并存储
│   ├── core/          # 核心模块
│   ├── plugins/       # 插件（爬虫、存储）
│   ├── scraper.py     # 主程序
│   └── README.md      # 爬虫文档
│
├── photo-viewer/       # 查看器项目 - 读取数据并展示
│   ├── static/        # 静态资源
│   ├── templates/     # 模板
│   ├── database.py    # 数据库访问
│   ├── viewer.py      # 主程序
│   └── README.md      # 查看器文档
│
└── README.md          # 本文件
```

## 快速开始

### 1. 安装依赖

#### 爬虫项目
```bash
cd photo-scraper
pip install -r requirements.txt
```

#### 查看器项目
```bash
cd photo-viewer
pip install -r requirements.txt
```

### 2. 启动爬虫

**方式一：GUI 桌面应用（推荐）**
```bash
cd photo-scraper
start_gui.bat  # Windows
# 或
python gui.py  # Linux/Mac
```

**方式二：Web 管理界面**
```bash
cd photo-scraper
start_web.bat  # Windows
# 访问 http://localhost:5001
```

**方式三：命令行**
```bash
cd photo-scraper
python scraper.py --max-pages 5
```

### 3. 启动查看器

**方式一：GUI 桌面应用（推荐）**
```bash
cd photo-viewer
start_gui.bat  # Windows
# 或
python gui.py  # Linux/Mac
```

**方式二：Web 界面**
```bash
cd photo-viewer
start.bat  # Windows
# 访问 http://localhost:5000
```

## 项目说明

### Photo Scraper（爬虫项目）

**功能**：
- 从网站爬取照片文章数据
- 自动获取文章详情和图片列表
- 存储到 SQLite 数据库
- 支持增量爬取（跳过已存在的文章）
- **🎨 提供 Web 管理界面**

**使用方式**：

**方式一：Web 管理界面（推荐）**
```bash
cd photo-scraper
python web_ui.py
# 访问 http://localhost:5001
```

**方式二：命令行**
```bash
# 爬取所有分类
python scraper.py

# 爬取指定分类
python scraper.py --category 1

# 限制页数
python scraper.py --max-pages 10
```

详见 [photo-scraper/README.md](photo-scraper/README.md) 和 [photo-scraper/USAGE.md](photo-scraper/USAGE.md)

### Photo Viewer（查看器项目）

**功能**：
- Web 界面展示照片
- 分类浏览
- 搜索功能
- 随机文章
- 统计信息

**使用示例**：
```bash
# 启动服务器
python viewer.py

# 指定端口
python viewer.py --port 8080

# 指定数据库
python viewer.py --db /path/to/photo.db
```

详见 [photo-viewer/README.md](photo-viewer/README.md)

## 数据库

两个项目共享同一个 SQLite 数据库文件（默认：`photo.db`）

### 数据库结构

**articles 表**：存储文章信息
- id, title, category, thumbnail, description, detail_url, date, tags, created_at

**images 表**：存储图片信息
- id, article_id, image_url, img_order

**scrape_log 表**：存储爬取日志
- id, scrape_date, category, articles_count, created_at

## 工作流程

```
1. 运行 photo-scraper 爬取数据
   ↓
2. 数据存储到 photo.db
   ↓
3. 运行 photo-viewer 展示数据
   ↓
4. 用户通过浏览器访问
```

## 优势

### 分离式架构
- **独立部署**：爬虫和查看器可以部署在不同服务器
- **独立开发**：两个项目可以独立开发和维护
- **灵活扩展**：可以单独升级某一部分

### 数据持久化
- 爬取的数据永久保存在数据库
- 即使爬虫停止，查看器仍可正常工作
- 支持数据备份和迁移

### 模块化设计
- 清晰的职责分离
- 易于理解和维护
- 便于添加新功能

## 使用场景

### 场景 1：定时爬取
```bash
# 设置定时任务，每天爬取一次
# Linux: crontab
0 2 * * * cd /path/to/photo-scraper && python scraper.py --max-pages 5

# Windows: 任务计划程序
```

### 场景 2：分布式部署
```
服务器 A: 运行 photo-scraper（爬虫）
服务器 B: 运行 photo-viewer（Web 服务）
共享数据库或定期同步数据库文件
```

### 场景 3：数据分析
```python
# 可以直接访问数据库进行数据分析
import sqlite3
conn = sqlite3.connect('photo.db')
# 进行各种查询和统计
```

## 注意事项

1. **爬虫频率**：请合理控制爬取频率，避免对目标网站造成压力
2. **数据库路径**：确保两个项目使用相同的数据库路径
3. **首次使用**：建议先用小页数测试（如 `--max-pages 2`）
4. **生产环境**：查看器建议使用 Gunicorn 等 WSGI 服务器

## 扩展

### 添加新的数据源
在 `photo-scraper/plugins/` 中创建新的爬虫插件

### 添加新的存储方式
在 `photo-scraper/plugins/` 中创建新的存储插件（如 MySQL）

### 自定义前端
修改 `photo-viewer/templates/` 和 `photo-viewer/static/`

## 许可证

MIT License
