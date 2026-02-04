# Photo Scraper - 照片爬虫

爬取照片数据并存储到数据库。

## 功能

- 爬取指定分类或所有分类的文章
- 自动获取文章详情和图片
- 支持跳过已存在的文章
- 支持限制爬取页数
- 记录爬取日志

## 安装

```bash
pip install -r requirements.txt
```

## 使用

### 方式一：Web 管理界面（推荐）

```bash
# 启动 Web 界面
python web_ui.py

# 或使用启动脚本
start_web.bat
```

然后访问 `http://localhost:5001`，通过可视化界面操作：
- 选择分类
- 设置爬取页数
- 实时查看进度
- 查看数据库统计
- 查看爬取日志

### 方式二：命令行

#### 爬取所有分类

```bash
python scraper.py
```

#### 爬取指定分类

```bash
# 爬取分类1（无圣光）
python scraper.py --category 1

# 爬取分类2（凸凹图）
python scraper.py --category 2
```

### 限制爬取页数

```bash
# 每个分类只爬取前5页
python scraper.py --max-pages 5
```

### 指定数据库路径

```bash
python scraper.py --db /path/to/photo.db
```

### 不跳过已存在的文章

```bash
python scraper.py --no-skip
```

## 参数说明

- `--category`: 分类ID（1-4），不指定则爬取所有分类
  - 1: 无圣光
  - 2: 凸凹图
  - 3: 靓人体
  - 4: 写真集
- `--max-pages`: 每个分类最大页数
- `--db`: 数据库路径（默认: photo.db）
- `--no-skip`: 不跳过已存在的文章

## 项目结构

```
photo-scraper/
├── core/                   # 核心模块
│   ├── data_source.py     # 数据源接口
│   └── storage.py         # 存储接口
├── plugins/               # 插件
│   ├── web_scraper.py    # Web 爬虫
│   └── sqlite_storage.py # SQLite 存储
├── templates/             # Web 界面模板
│   └── scraper_ui.html   # 管理界面
├── scraper.py            # 命令行主程序
├── web_ui.py             # Web 管理界面
├── start.bat             # 命令行启动脚本
├── start_web.bat         # Web 界面启动脚本
├── requirements.txt      # 依赖
└── README.md            # 本文件
```

## 数据库结构

### articles 表
- id: 文章ID（主键）
- title: 标题
- category: 分类
- thumbnail: 缩略图
- description: 描述
- detail_url: 详情页URL
- date: 发布日期
- tags: 标签（JSON）
- created_at: 创建时间

### images 表
- id: 自增ID
- article_id: 文章ID（外键）
- image_url: 图片URL
- img_order: 图片顺序

### scrape_log 表
- id: 自增ID
- scrape_date: 爬取日期
- category: 分类
- articles_count: 文章数量
- created_at: 创建时间

## 注意事项

1. 请合理控制爬取频率，避免对目标网站造成压力
2. 建议使用 `--max-pages` 限制爬取页数
3. 首次爬取建议使用较小的页数测试
4. 数据库文件会自动创建
