"""爬虫 Web 管理界面"""
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from scraper import PhotoScraper
import threading
import sqlite3
from datetime import datetime


app = Flask(__name__)
CORS(app)

# 爬虫实例
scraper = None

# 爬取状态
scrape_status = {
    'is_running': False,
    'progress': '',
    'current_category': '',
    'current_page': 0,
    'total_articles': 0,
    'should_stop': False
}


def init_scraper(db_path='photo.db'):
    """初始化爬虫"""
    global scraper
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
    scraper = PhotoScraper(config)


def get_db_stats(db_path='photo.db'):
    """获取数据库统计"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 总文章数
        cursor.execute('SELECT COUNT(*) FROM articles')
        total_articles = cursor.fetchone()[0]
        
        # 总图片数
        cursor.execute('SELECT COUNT(*) FROM images')
        total_images = cursor.fetchone()[0]
        
        # 各分类统计
        cursor.execute('SELECT category, COUNT(*) FROM articles GROUP BY category')
        category_stats = {row[0]: row[1] for row in cursor.fetchall()}
        
        # 最近爬取记录
        cursor.execute('''
            SELECT scrape_date, category, articles_count 
            FROM scrape_log 
            ORDER BY id DESC 
            LIMIT 10
        ''')
        recent_logs = [
            {'date': row[0], 'category': row[1], 'count': row[2]}
            for row in cursor.fetchall()
        ]
        
        conn.close()
        
        return {
            'total_articles': total_articles,
            'total_images': total_images,
            'category_stats': category_stats,
            'recent_logs': recent_logs
        }
    except Exception as e:
        return {
            'total_articles': 0,
            'total_images': 0,
            'category_stats': {},
            'recent_logs': [],
            'error': str(e)
        }


@app.route('/')
def index():
    """主页"""
    return render_template('scraper_ui.html')


@app.route('/api/status')
def get_status():
    """获取爬取状态"""
    stats = get_db_stats()
    return jsonify({
        'success': True,
        'scrape_status': scrape_status,
        'db_stats': stats
    })


@app.route('/api/start', methods=['POST'])
def start_scrape():
    """开始爬取"""
    global scrape_status
    
    if scrape_status['is_running']:
        return jsonify({
            'success': False,
            'message': '爬虫正在运行中'
        })
    
    data = request.get_json() or {}
    category = data.get('category', '')  # 空表示所有分类
    max_pages = data.get('max_pages', 5)
    skip_existing = data.get('skip_existing', True)
    
    # 重置状态
    scrape_status.update({
        'is_running': True,
        'progress': '准备开始...',
        'current_category': '',
        'current_page': 0,
        'total_articles': 0,
        'should_stop': False
    })
    
    # 在后台线程中执行
    thread = threading.Thread(
        target=run_scrape,
        args=(category, max_pages, skip_existing)
    )
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'success': True,
        'message': '爬虫已启动'
    })


@app.route('/api/stop', methods=['POST'])
def stop_scrape():
    """停止爬取"""
    global scrape_status
    
    if not scrape_status['is_running']:
        return jsonify({
            'success': False,
            'message': '爬虫未在运行'
        })
    
    scrape_status['should_stop'] = True
    scrape_status['progress'] = '正在停止...'
    
    return jsonify({
        'success': True,
        'message': '正在停止爬虫'
    })


def run_scrape(category, max_pages, skip_existing):
    """执行爬取任务"""
    global scrape_status
    
    def progress_callback(msg):
        scrape_status['progress'] = msg
        if '第' in msg and '页' in msg:
            try:
                page = int(msg.split('第')[1].split('页')[0].strip())
                scrape_status['current_page'] = page
            except:
                pass
    
    try:
        if category:
            # 爬取指定分类
            scrape_status['current_category'] = category
            count = scraper.scrape_category(
                category,
                max_pages=max_pages,
                skip_existing=skip_existing,
                progress_callback=progress_callback
            )
            scrape_status['total_articles'] = count
            scrape_status['progress'] = f'完成！共爬取 {count} 篇文章'
        else:
            # 爬取所有分类
            stats = scraper.scrape_all_categories(
                max_pages_per_category=max_pages,
                skip_existing=skip_existing,
                progress_callback=progress_callback
            )
            total = sum(stats.values())
            scrape_status['total_articles'] = total
            stats_text = ', '.join([f'{k}:{v}篇' for k, v in stats.items()])
            scrape_status['progress'] = f'完成！共爬取 {total} 篇 ({stats_text})'
    
    except Exception as e:
        scrape_status['progress'] = f'错误: {str(e)}'
    
    finally:
        scrape_status['is_running'] = False
        scrape_status['should_stop'] = False


@app.route('/api/categories')
def get_categories():
    """获取分类列表"""
    categories = [
        {'id': '', 'name': '全部分类'},
        {'id': '1', 'name': '无圣光'},
        {'id': '2', 'name': '凸凹图'},
        {'id': '3', 'name': '靓人体'},
        {'id': '4', 'name': '写真集'}
    ]
    return jsonify({
        'success': True,
        'data': categories
    })


def main():
    """主函数"""
    import argparse
    import os
    
    parser = argparse.ArgumentParser(description='爬虫 Web 管理界面')
    parser.add_argument('--db', type=str, default='photo.db', help='数据库路径')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='监听地址')
    parser.add_argument('--port', type=int, default=5001, help='监听端口')
    parser.add_argument('--debug', action='store_true', help='调试模式')
    
    args = parser.parse_args()
    
    # 如果没有指定数据库路径，使用根目录的 photo.db
    if args.db == 'photo.db':
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'photo.db')
    else:
        db_path = args.db
    
    # 初始化爬虫
    init_scraper(db_path)
    
    print("=" * 60)
    print("爬虫 Web 管理界面")
    print("=" * 60)
    print(f"数据库: {args.db}")
    print(f"访问地址: http://{args.host}:{args.port}")
    print("=" * 60)
    
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == '__main__':
    main()
