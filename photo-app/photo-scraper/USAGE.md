# 使用指南

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动 Web 管理界面

```bash
# Windows
start_web.bat

# Linux/Mac
python web_ui.py
```

访问 `http://localhost:5001`

## Web 管理界面使用

### 界面功能

#### 控制面板
- **选择分类**：选择要爬取的分类（空=全部）
- **最大页数**：每个分类爬取的最大页数
- **跳过已存在**：是否跳过数据库中已有的文章
- **开始爬取**：启动爬虫
- **停止**：停止正在运行的爬虫

#### 爬取状态
实时显示：
- 运行状态（就绪/运行中）
- 当前进度信息
- 当前爬取的分类
- 当前页数
- 已爬取的文章数

#### 数据库统计
显示：
- 总文章数
- 总图片数
- 各分类文章数

#### 爬取日志
显示最近的爬取记录

### 使用场景

#### 场景 1：首次爬取
1. 选择"全部分类"
2. 设置"最大页数"为 5（测试）
3. 勾选"跳过已存在"
4. 点击"开始爬取"
5. 观察进度和统计

#### 场景 2：更新特定分类
1. 选择具体分类（如"无圣光"）
2. 设置"最大页数"为 3
3. 勾选"跳过已存在"
4. 点击"开始爬取"

#### 场景 3：全量爬取
1. 选择"全部分类"
2. 设置"最大页数"为 50（或更大）
3. 勾选"跳过已存在"
4. 点击"开始爬取"
5. 耐心等待（可能需要较长时间）

## 命令行使用

### 基本命令

```bash
# 爬取所有分类（每个分类默认全部页）
python scraper.py

# 爬取所有分类（限制页数）
python scraper.py --max-pages 5

# 爬取指定分类
python scraper.py --category 1 --max-pages 10

# 指定数据库路径
python scraper.py --db /path/to/photo.db

# 不跳过已存在的文章（重新爬取）
python scraper.py --no-skip
```

### 分类 ID

- 1: 无圣光
- 2: 凸凹图
- 3: 靓人体
- 4: 写真集

### 示例

```bash
# 测试爬取（每个分类1页）
python scraper.py --max-pages 1

# 爬取"无圣光"分类的前10页
python scraper.py --category 1 --max-pages 10

# 全量爬取所有分类
python scraper.py

# 使用自定义数据库
python scraper.py --db custom.db --max-pages 5
```

## 注意事项

### 爬取频率
- 建议首次使用时设置较小的页数（如 1-5 页）
- 避免频繁大量爬取，以免对目标网站造成压力
- 使用"跳过已存在"选项可以避免重复爬取

### 数据库
- 数据库文件会自动创建
- 默认路径为 `photo.db`
- 可以通过 `--db` 参数指定其他路径
- 建议定期备份数据库文件

### 错误处理
- 如果爬取失败，检查网络连接
- 如果某个文章爬取失败，会跳过继续下一个
- 查看控制台输出了解详细错误信息

### 性能
- 爬取速度取决于网络状况
- 每页约 30-40 篇文章
- 每篇文章需要额外请求详情页
- 预计每页需要 1-2 分钟

## 高级用法

### 定时爬取

#### Windows 任务计划程序
1. 打开"任务计划程序"
2. 创建基本任务
3. 设置触发器（如每天凌晨 2 点）
4. 操作：启动程序
5. 程序：`python`
6. 参数：`D:\path\to\photo-scraper\scraper.py --max-pages 5`

#### Linux Crontab
```bash
# 每天凌晨 2 点执行
0 2 * * * cd /path/to/photo-scraper && python scraper.py --max-pages 5
```

### 批处理脚本

创建 `batch_scrape.bat`：
```batch
@echo off
echo 开始爬取...
python scraper.py --category 1 --max-pages 5
python scraper.py --category 2 --max-pages 5
python scraper.py --category 3 --max-pages 5
python scraper.py --category 4 --max-pages 5
echo 完成！
pause
```

### 监控和日志

爬取日志会记录在数据库的 `scrape_log` 表中，可以通过 SQL 查询：

```sql
SELECT * FROM scrape_log ORDER BY id DESC LIMIT 10;
```

## 故障排除

### 问题：无法连接到网站
**解决**：
- 检查网络连接
- 检查目标网站是否可访问
- 尝试使用代理

### 问题：爬取速度很慢
**解决**：
- 这是正常现象，需要等待
- 可以减少 `max_pages` 参数
- 检查网络速度

### 问题：数据库锁定
**解决**：
- 确保没有其他程序在访问数据库
- 关闭 photo-viewer 后再爬取
- 或使用不同的数据库文件

### 问题：某些文章爬取失败
**解决**：
- 这是正常现象，会自动跳过
- 可以稍后重新爬取该分类
- 查看控制台输出了解具体原因

## 最佳实践

1. **首次使用**：先用小页数测试（1-2 页）
2. **定期更新**：每天爬取 3-5 页即可
3. **全量爬取**：选择网络空闲时段
4. **数据备份**：定期备份 `photo.db` 文件
5. **监控日志**：通过 Web 界面查看爬取记录

## 技术支持

如有问题，请查看：
- `README.md` - 项目说明
- 控制台输出 - 详细错误信息
- 数据库日志 - 爬取历史记录
