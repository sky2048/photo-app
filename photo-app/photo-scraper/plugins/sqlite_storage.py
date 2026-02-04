"""SQLite 存储"""
import sqlite3
import json
from typing import List, Dict, Any
from core.storage import Storage


class SQLiteStorage(Storage):
    """SQLite 存储实现"""
    
    def __init__(self, db_path: str = 'photo.db'):
        self.db_path = db_path
    
    @property
    def storage_name(self) -> str:
        return "sqlite"
    
    def initialize(self) -> None:
        """初始化数据库"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS articles (
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
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                article_id INTEGER,
                image_url TEXT NOT NULL,
                img_order INTEGER,
                FOREIGN KEY (article_id) REFERENCES articles (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scrape_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scrape_date DATE,
                category TEXT,
                articles_count INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _get_connection(self):
        """获取数据库连接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def save_article(self, article: Dict[str, Any]) -> None:
        """保存文章"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO articles 
            (id, title, category, thumbnail, description, detail_url, date, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            article['id'],
            article['title'],
            article.get('category', ''),
            article.get('thumbnail', ''),
            article.get('description', ''),
            article['detail_url'],
            article.get('date', ''),
            json.dumps(article.get('tags', []))
        ))
        
        conn.commit()
        conn.close()
    
    def save_images(self, article_id: int, images: List[str]) -> None:
        """保存图片"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM images WHERE article_id = ?', (article_id,))
        
        for idx, url in enumerate(images):
            cursor.execute('''
                INSERT INTO images (article_id, image_url, img_order)
                VALUES (?, ?, ?)
            ''', (article_id, url, idx))
        
        conn.commit()
        conn.close()
    
    def article_exists(self, article_id: int) -> bool:
        """检查文章是否存在"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM articles WHERE id = ?', (article_id,))
        result = cursor.fetchone()
        conn.close()
        
        return result is not None
    
    def log_scrape(self, category: str, count: int) -> None:
        """记录爬取日志"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')
        
        cursor.execute('''
            INSERT INTO scrape_log (scrape_date, category, articles_count)
            VALUES (?, ?, ?)
        ''', (today, category, count))
        
        conn.commit()
        conn.close()
