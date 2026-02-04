"""清空数据库工具"""
import sqlite3
import os
import sys


def clear_database(db_path='photo.db', confirm=True):
    """清空数据库"""
    if not os.path.exists(db_path):
        print(f"数据库文件不存在: {db_path}")
        return
    
    if confirm:
        response = input(f"确定要清空数据库 {db_path} 吗？(yes/no): ")
        if response.lower() != 'yes':
            print("已取消")
            return
    
    try:
        # 删除数据库文件
        os.remove(db_path)
        print(f"✓ 已删除 {db_path}")
        
        # 重新创建空数据库
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 创建表结构
        cursor.execute('''
            CREATE TABLE articles (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                category TEXT,
                thumbnail TEXT,
                description TEXT,
                detail_url TEXT,
                date TEXT,
                tags TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                article_id INTEGER,
                image_url TEXT NOT NULL,
                img_order INTEGER,
                FOREIGN KEY (article_id) REFERENCES articles (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE scrape_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scrape_date DATE,
                category TEXT,
                articles_count INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
        print("✓ 数据库已重新初始化")
        
        # 验证
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM articles')
        print(f"✓ 文章数量: {cursor.fetchone()[0]}")
        cursor.execute('SELECT COUNT(*) FROM images')
        print(f"✓ 图片数量: {cursor.fetchone()[0]}")
        conn.close()
        
    except Exception as e:
        print(f"错误: {e}")
        sys.exit(1)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='清空数据库')
    parser.add_argument('--db', type=str, default='photo.db', help='数据库路径')
    parser.add_argument('--yes', action='store_true', help='跳过确认')
    args = parser.parse_args()
    
    clear_database(args.db, confirm=not args.yes)
