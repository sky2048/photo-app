"""爬虫主程序"""
from core.data_source import DataSourceManager
from core.storage import StorageManager
from plugins.web_scraper import WebScraperDataSource
from plugins.sqlite_storage import SQLiteStorage
from typing import Optional, Callable


class PhotoScraper:
    """照片爬虫"""
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        
        # 初始化数据源管理器
        self.data_source_manager = DataSourceManager()
        
        # 初始化存储管理器
        self.storage_manager = StorageManager()
        
        # 注册数据源
        web_scraper = WebScraperDataSource(
            base_url=self.config.get('base_url', 'https://www.tuao.cc'),
            config=self.config.get('scraper', {})
        )
        self.data_source_manager.register_source(web_scraper)
        
        # 注册存储
        sqlite_storage = SQLiteStorage(
            db_path=self.config.get('db_path', 'photo.db')
        )
        self.storage_manager.register_storage(sqlite_storage)
    
    def scrape_category(self, 
                       category_id: str, 
                       max_pages: Optional[int] = None,
                       skip_existing: bool = True,
                       progress_callback: Optional[Callable[[str], None]] = None) -> int:
        """
        爬取指定分类
        
        Args:
            category_id: 分类ID
            max_pages: 最大页数，None表示全部
            skip_existing: 是否跳过已存在的文章
            progress_callback: 进度回调函数
        
        Returns:
            爬取的文章数量
        """
        source = self.data_source_manager.get_active_source()
        storage = self.storage_manager.get_active_storage()
        
        page = 1
        total_count = 0
        
        while True:
            if max_pages and page > max_pages:
                break
            
            if progress_callback:
                progress_callback(f"正在爬取第 {page} 页...")
            
            print(f"爬取分类 {category_id} 第 {page} 页...")
            
            articles, has_next = source.get_articles(category_id, page)
            
            if not articles:
                print("没有获取到文章，停止爬取")
                break
            
            for idx, article in enumerate(articles, 1):
                # 检查是否已存在
                if skip_existing and storage.article_exists(article['id']):
                    print(f"  [{idx}/{len(articles)}] 文章 {article['id']} 已存在，跳过")
                    continue
                
                print(f"  [{idx}/{len(articles)}] 处理文章 {article['id']}: {article['title']}")
                
                # 保存文章基本信息
                storage.save_article(article)
                
                # 获取详情
                detail = source.get_article_detail(article['id'], article['detail_url'])
                if detail and detail.get('images'):
                    storage.save_images(article['id'], detail['images'])
                    
                    # 更新文章信息
                    article.update({
                        'tags': detail.get('tags', []),
                        'date': detail.get('date', '')
                    })
                    storage.save_article(article)
                    
                    print(f"      保存了 {len(detail['images'])} 张图片")
                
                total_count += 1
            
            if not has_next:
                print("没有下一页，停止爬取")
                break
            
            page += 1
        
        # 记录日志
        storage.log_scrape(category_id, total_count)
        
        return total_count
    
    def scrape_all_categories(self, 
                             max_pages_per_category: Optional[int] = None,
                             skip_existing: bool = True,
                             progress_callback: Optional[Callable[[str], None]] = None) -> dict:
        """
        爬取所有分类
        
        Returns:
            各分类的爬取统计
        """
        source = self.data_source_manager.get_active_source()
        categories = source.get_categories()
        
        # 排除"最新"分类
        real_categories = [cat for cat in categories if cat['id'] != '']
        
        stats = {}
        
        for cat in real_categories:
            if progress_callback:
                progress_callback(f"开始爬取分类: {cat['name']}")
            
            print(f"\n{'='*60}")
            print(f"开始爬取分类: {cat['name']} (ID: {cat['id']})")
            print(f"{'='*60}")
            
            count = self.scrape_category(
                cat['id'],
                max_pages=max_pages_per_category,
                skip_existing=skip_existing,
                progress_callback=progress_callback
            )
            
            stats[cat['name']] = count
            print(f"\n分类 {cat['name']} 完成，共爬取 {count} 篇文章")
        
        return stats


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='照片爬虫')
    parser.add_argument('--category', type=str, help='分类ID（1-4），不指定则爬取所有分类')
    parser.add_argument('--max-pages', type=int, help='每个分类最大页数')
    parser.add_argument('--db', type=str, default='photo.db', help='数据库路径')
    parser.add_argument('--no-skip', action='store_true', help='不跳过已存在的文章')
    
    args = parser.parse_args()
    
    # 配置
    import os
    # 如果没有指定数据库路径，使用根目录的 photo.db
    if args.db == 'photo.db':
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'photo.db')
    else:
        db_path = args.db
    
    config = {
        'base_url': 'https://www.tuao.cc',
        'db_path': db_path,
        'scraper': {
            'user_agents': [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ]
        }
    }
    
    # 创建爬虫
    scraper = PhotoScraper(config)
    
    print("=" * 60)
    print("照片爬虫启动")
    print("=" * 60)
    
    # 开始爬取
    if args.category:
        # 爬取指定分类
        count = scraper.scrape_category(
            args.category,
            max_pages=args.max_pages,
            skip_existing=not args.no_skip
        )
        print(f"\n完成！共爬取 {count} 篇文章")
    else:
        # 爬取所有分类
        stats = scraper.scrape_all_categories(
            max_pages_per_category=args.max_pages,
            skip_existing=not args.no_skip
        )
        
        print("\n" + "=" * 60)
        print("爬取完成！统计信息：")
        print("=" * 60)
        total = 0
        for category, count in stats.items():
            print(f"  {category}: {count} 篇")
            total += count
        print(f"\n总计: {total} 篇文章")


if __name__ == '__main__':
    main()
