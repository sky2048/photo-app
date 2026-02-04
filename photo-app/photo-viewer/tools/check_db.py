"""数据库检查工具"""
import sqlite3
import sys


def check_database(db_path='photo.db'):
    """检查数据库内容"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("=" * 60)
        print(f"数据库检查: {db_path}")
        print("=" * 60)
        
        # 检查表
        cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
        tables = cursor.fetchall()
        print(f"\n表列表: {[t[0] for t in tables]}")
        
        # 检查文章数量
        cursor.execute('SELECT COUNT(*) FROM articles')
        articles_count = cursor.fetchone()[0]
        print(f"\n文章总数: {articles_count}")
        
        # 检查分类
        cursor.execute('SELECT category, COUNT(*) FROM articles GROUP BY category')
        categories = cursor.fetchall()
        print(f"\n分类统计:")
        for cat, count in categories:
            print(f"  {cat or '(空)'}: {count} 篇")
        
        # 查看前5条文章
        cursor.execute('SELECT id, title, category FROM articles ORDER BY id DESC LIMIT 5')
        print(f"\n最新5篇文章:")
        for row in cursor.fetchall():
            print(f"  ID: {row[0]}, 标题: {row[1]}, 分类: {row[2]}")
        
        # 检查图片数量
        cursor.execute('SELECT COUNT(*) FROM images')
        images_count = cursor.fetchone()[0]
        print(f"\n图片总数: {images_count}")
        
        # 检查爬取日志
        if 'scrape_log' in [t[0] for t in tables]:
            cursor.execute('SELECT scrape_date, category, articles_count FROM scrape_log ORDER BY id DESC LIMIT 5')
            logs = cursor.fetchall()
            if logs:
                print(f"\n最近爬取记录:")
                for log in logs:
                    print(f"  日期: {log[0]}, 分类: {log[1]}, 数量: {log[2]}")
        
        conn.close()
        print("\n" + "=" * 60)
        
    except Exception as e:
        print(f"错误: {e}")
        sys.exit(1)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='检查数据库')
    parser.add_argument('--db', type=str, default='photo.db', help='数据库路径')
    args = parser.parse_args()
    
    check_database(args.db)
