"""存储接口 - 定义数据存储的统一接口"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any


class Storage(ABC):
    """存储基类"""
    
    @property
    @abstractmethod
    def storage_name(self) -> str:
        """存储名称"""
        pass
    
    @abstractmethod
    def initialize(self) -> None:
        """初始化存储"""
        pass
    
    @abstractmethod
    def save_article(self, article: Dict[str, Any]) -> None:
        """保存文章"""
        pass
    
    @abstractmethod
    def save_images(self, article_id: int, images: List[str]) -> None:
        """保存图片"""
        pass
    
    @abstractmethod
    def article_exists(self, article_id: int) -> bool:
        """检查文章是否存在"""
        pass


class StorageManager:
    """存储管理器"""
    
    def __init__(self):
        self.storages: Dict[str, Storage] = {}
        self.active_storage: str = None
    
    def register_storage(self, storage: Storage) -> None:
        """注册存储"""
        self.storages[storage.storage_name] = storage
        storage.initialize()
        if not self.active_storage:
            self.active_storage = storage.storage_name
        print(f"✓ 存储已注册: {storage.storage_name}")
    
    def get_active_storage(self) -> Storage:
        """获取活动存储"""
        if not self.active_storage:
            raise ValueError("没有活动的存储")
        return self.storages[self.active_storage]
