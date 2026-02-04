"""Web 爬虫数据源"""
import requests
from bs4 import BeautifulSoup
import re
import time
import random
from urllib.parse import urljoin
from typing import List, Dict, Any, Optional
from core.data_source import DataSource


class WebScraperDataSource(DataSource):
    """Web 爬虫数据源"""
    
    def __init__(self, base_url: str, config: Dict[str, Any] = None):
        self.base_url = base_url
        self.config = config or {}
        self.session = requests.Session()
        self._update_headers()
    
    @property
    def source_name(self) -> str:
        return "web_scraper"
    
    def _update_headers(self):
        """更新请求头"""
        user_agents = self.config.get('user_agents', [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ])
        
        self.session.headers.update({
            'User-Agent': random.choice(user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Connection': 'keep-alive',
            'Referer': self.base_url
        })
    
    def _request_with_retry(self, url: str, max_retries: int = 3) -> Optional[requests.Response]:
        """带重试的请求"""
        for attempt in range(max_retries):
            try:
                time.sleep(random.uniform(0.5, 1.5))
                response = self.session.get(url, timeout=15)
                response.raise_for_status()
                response.encoding = 'utf-8'
                return response
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(random.uniform(2, 4))
                    self._update_headers()
                else:
                    print(f"请求失败: {url}, {e}")
                    return None
        return None
    
    def get_categories(self) -> List[Dict[str, Any]]:
        """获取分类列表"""
        return [
            {'id': '', 'name': '最新'},
            {'id': '1', 'name': '无圣光'},
            {'id': '2', 'name': '凸凹图'},
            {'id': '3', 'name': '靓人体'},
            {'id': '4', 'name': '写真集'}
        ]
    
    def get_articles(self, category: Optional[str] = None, page: int = 1) -> tuple[List[Dict[str, Any]], bool]:
        """获取文章列表"""
        if category:
            url = f'{self.base_url}/Articles/Categories/{category}?Page={page}'
        else:
            url = f'{self.base_url}/Articles?Page={page}'
        
        response = self._request_with_retry(url)
        if not response:
            return [], False
        
        soup = BeautifulSoup(response.text, 'lxml')
        articles = []
        items = soup.select('.index-imgs')
        
        for item in items:
            try:
                link = item.select_one('a.index-imgcontent-img')
                title_link = item.select_one('a.index-imgcontent-title')
                img = item.select_one('img.lazyimg')
                
                if not link or not title_link:
                    continue
                
                detail_url = link.get('href', '')
                title = title_link.get('title', '').strip()
                thumbnail = img.get('data-original', '') if img else ''
                description = link.get('title', '').strip()
                
                match = re.search(r'/Content/(\d+)\.html', detail_url)
                if match:
                    article_id = int(match.group(1))
                    articles.append({
                        'id': article_id,
                        'title': title,
                        'thumbnail': urljoin(self.base_url, thumbnail),
                        'description': description,
                        'detail_url': urljoin(self.base_url, detail_url),
                        'category': self._get_category_name(category)
                    })
            except Exception as e:
                print(f"解析文章项出错: {e}")
                continue
        
        has_next = bool(soup.select('li a[aria-label="Next"]'))
        return articles, has_next
    
    def get_article_detail(self, article_id: int, detail_url: str) -> Optional[Dict[str, Any]]:
        """获取文章详情"""
        response = self._request_with_retry(detail_url)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        title_elem = soup.select_one('h1.content-title')
        title = title_elem.get_text(strip=True) if title_elem else ''
        
        tags = []
        tag_links = soup.select('.text-primary a[href*="/Articles/Tags"]')
        for tag_link in tag_links:
            tag = tag_link.get_text(strip=True)
            if tag:
                tags.append(tag)
        
        date = ''
        date_elem = soup.select_one('.text-primary')
        if date_elem:
            date_text = date_elem.get_text()
            date_match = re.search(r'日期：(\d{4}-\d{2}-\d{2})', date_text)
            if date_match:
                date = date_match.group(1)
        
        images = []
        raw_content = soup.select_one('#rawContent')
        if raw_content:
            img_tags = raw_content.select('img')
            for img in img_tags:
                img_url = img.get('src', '')
                if img_url:
                    images.append(urljoin(self.base_url, img_url))
        
        return {
            'id': article_id,
            'title': title,
            'tags': tags,
            'date': date,
            'images': images
        }
    
    def test_connection(self) -> bool:
        """测试连接"""
        try:
            response = self._request_with_retry(self.base_url)
            return response is not None
        except:
            return False
    
    def _get_category_name(self, category_id: Optional[str]) -> str:
        """获取分类名称"""
        categories = {
            '': '最新',
            '1': '无圣光',
            '2': '凸凹图',
            '3': '靓人体',
            '4': '写真集'
        }
        return categories.get(category_id or '', '最新')
