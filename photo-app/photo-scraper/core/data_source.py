"""数据源接口 - 定义获取数据的统一接口"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


class DataSource(ABC):
    """数据源基类"""
    
    @property
    @abstractmethod
    def source_name(self) -> str:
        """数据源名称"""
        pass
    
    @abstractmethod
    def get_categories(self) -> List[Dict[str, Any]]:
        """获取分类列表"""
        pass
    
    @abstractmethod
    def get_articles(self, category: Optional[str] = None, page: int = 1) -> tuple[List[Dict[str, Any]], bool]:
        """
        获取文章列表
        返回: (文章列表, 是否有下一页)
        """
        pass
    
    @abstractmethod
    def get_article_detail(self, article_id: int, detail_url: str) -> Optional[Dict[str, Any]]:
        """获取文章详情"""
        pass
    
    @abstractmethod
    def test_connection(self) -> bool:
        """测试连接"""
        pass


class DataSourceManager:
    """数据源管理器"""
    
    def __init__(self):
        self.sources: Dict[str, DataSource] = {}
        self.active_source: Optional[str] = None
    
    def register_source(self, source: DataSource) -> None:
        """注册数据源"""
        self.sources[source.source_name] = source
        if not self.active_source:
            self.active_source = source.source_name
        print(f"✓ 数据源已注册: {source.source_name}")
    
    def set_active_source(self, source_name: str) -> None:
        """设置活动数据源"""
        if source_name not in self.sources:
            raise ValueError(f"数据源 {source_name} 不存在")
        self.active_source = source_name
    
    def get_active_source(self) -> DataSource:
        """获取活动数据源"""
        if not self.active_source:
            raise ValueError("没有活动的数据源")
        return self.sources[self.active_source]
    
    def list_sources(self) -> List[str]:
        """列出所有数据源"""
        return list(self.sources.keys())
