"""爬虫 GUI 界面 - 使用 Tkinter"""
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import threading
import sqlite3
from datetime import datetime
from scraper import PhotoScraper


class ScraperGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("照片爬虫管理器")
        self.root.geometry("900x700")
        self.root.resizable(True, True)
        
        # 配置样式
        self.setup_styles()
        
        # 初始化爬虫
        self.scraper = None
        # 使用前端 public 目录的数据库
        import os
        self.db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'photo-viewer', 'public', 'photo.db')
        self.init_scraper()
        
        # 爬取状态
        self.is_running = False
        self.should_stop = False
        
        # 创建界面
        self.create_widgets()
        
        # 启动状态更新
        self.update_status()
    
    def setup_styles(self):
        """配置样式"""
        style = ttk.Style()
        style.theme_use('clam')
        
        # 配置颜色
        style.configure('Title.TLabel', font=('Arial', 16, 'bold'), foreground='#667eea')
        style.configure('Header.TLabel', font=('Arial', 12, 'bold'), foreground='#333')
        style.configure('Info.TLabel', font=('Arial', 10), foreground='#666')
        style.configure('Value.TLabel', font=('Arial', 10, 'bold'), foreground='#333')
        style.configure('Success.TLabel', font=('Arial', 10, 'bold'), foreground='#28a745')
        style.configure('Error.TLabel', font=('Arial', 10, 'bold'), foreground='#dc3545')
        
        # 按钮样式
        style.configure('Start.TButton', font=('Arial', 11, 'bold'), foreground='white', background='#667eea')
        style.configure('Stop.TButton', font=('Arial', 11, 'bold'), foreground='white', background='#dc3545')
    
    def init_scraper(self):
        """初始化爬虫"""
        config = {
            'base_url': 'https://www.tuao.cc',
            'db_path': self.db_path,
            'scraper': {
                'user_agents': [
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ]
            }
        }
        self.scraper = PhotoScraper(config)
    
    def create_widgets(self):
        """创建界面组件"""
        # 主容器
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 配置网格权重
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        
        # 标题
        title_label = ttk.Label(main_frame, text="🕷️ 照片爬虫管理器", style='Title.TLabel')
        title_label.grid(row=0, column=0, pady=(0, 20))
        
        # 控制面板
        self.create_control_panel(main_frame)
        
        # 状态显示
        self.create_status_panel(main_frame)
        
        # 数据库统计
        self.create_stats_panel(main_frame)
        
        # 日志显示
        self.create_log_panel(main_frame)
    
    def create_control_panel(self, parent):
        """创建控制面板"""
        frame = ttk.LabelFrame(parent, text="⚙️ 控制面板", padding="10")
        frame.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        frame.columnconfigure(1, weight=1)
        
        # 分类选择
        ttk.Label(frame, text="选择分类:", style='Info.TLabel').grid(row=0, column=0, sticky=tk.W, pady=5)
        self.category_var = tk.StringVar(value="")
        category_combo = ttk.Combobox(frame, textvariable=self.category_var, state='readonly', width=30)
        category_combo['values'] = ('全部分类', '无圣光', '凸凹图', '靓人体', '写真集')
        category_combo.current(0)
        category_combo.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=(10, 0), pady=5)
        
        # 最大页数
        ttk.Label(frame, text="最大页数:", style='Info.TLabel').grid(row=1, column=0, sticky=tk.W, pady=5)
        self.max_pages_var = tk.StringVar(value="5")
        max_pages_spin = ttk.Spinbox(frame, from_=1, to=100, textvariable=self.max_pages_var, width=30)
        max_pages_spin.grid(row=1, column=1, sticky=(tk.W, tk.E), padx=(10, 0), pady=5)
        
        # 跳过已存在
        self.skip_existing_var = tk.BooleanVar(value=True)
        skip_check = ttk.Checkbutton(frame, text="跳过已存在的文章", variable=self.skip_existing_var)
        skip_check.grid(row=2, column=0, columnspan=2, sticky=tk.W, pady=5)
        
        # 按钮框架
        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=3, column=0, columnspan=2, pady=(10, 0))
        
        # 开始按钮
        self.start_btn = ttk.Button(btn_frame, text="▶️ 开始爬取", command=self.start_scrape, width=15)
        self.start_btn.grid(row=0, column=0, padx=5)
        
        # 停止按钮
        self.stop_btn = ttk.Button(btn_frame, text="⏹️ 停止", command=self.stop_scrape, width=15, state='disabled')
        self.stop_btn.grid(row=0, column=1, padx=5)
    
    def create_status_panel(self, parent):
        """创建状态面板"""
        frame = ttk.LabelFrame(parent, text="📊 爬取状态", padding="10")
        frame.grid(row=2, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        frame.columnconfigure(1, weight=1)
        
        # 状态
        ttk.Label(frame, text="状态:", style='Info.TLabel').grid(row=0, column=0, sticky=tk.W, pady=3)
        self.status_label = ttk.Label(frame, text="就绪", style='Value.TLabel')
        self.status_label.grid(row=0, column=1, sticky=tk.W, padx=(10, 0), pady=3)
        
        # 进度
        ttk.Label(frame, text="进度:", style='Info.TLabel').grid(row=1, column=0, sticky=tk.W, pady=3)
        self.progress_label = ttk.Label(frame, text="-", style='Info.TLabel')
        self.progress_label.grid(row=1, column=1, sticky=tk.W, padx=(10, 0), pady=3)
        
        # 当前分类
        ttk.Label(frame, text="当前分类:", style='Info.TLabel').grid(row=2, column=0, sticky=tk.W, pady=3)
        self.current_category_label = ttk.Label(frame, text="-", style='Info.TLabel')
        self.current_category_label.grid(row=2, column=1, sticky=tk.W, padx=(10, 0), pady=3)
        
        # 当前页数
        ttk.Label(frame, text="当前页数:", style='Info.TLabel').grid(row=3, column=0, sticky=tk.W, pady=3)
        self.current_page_label = ttk.Label(frame, text="-", style='Info.TLabel')
        self.current_page_label.grid(row=3, column=1, sticky=tk.W, padx=(10, 0), pady=3)
        
        # 已爬取文章
        ttk.Label(frame, text="已爬取文章:", style='Info.TLabel').grid(row=4, column=0, sticky=tk.W, pady=3)
        self.total_articles_label = ttk.Label(frame, text="0", style='Value.TLabel')
        self.total_articles_label.grid(row=4, column=1, sticky=tk.W, padx=(10, 0), pady=3)
        
        # 进度条
        self.progress_bar = ttk.Progressbar(frame, mode='indeterminate')
        self.progress_bar.grid(row=5, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(10, 0))
    
    def create_stats_panel(self, parent):
        """创建统计面板"""
        frame = ttk.LabelFrame(parent, text="📈 数据库统计", padding="10")
        frame.grid(row=3, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # 统计信息框架
        stats_frame = ttk.Frame(frame)
        stats_frame.grid(row=0, column=0, sticky=(tk.W, tk.E))
        stats_frame.columnconfigure((0, 1, 2, 3), weight=1)
        
        # 总文章数
        articles_frame = ttk.Frame(stats_frame, relief='solid', borderwidth=1, padding="10")
        articles_frame.grid(row=0, column=0, padx=5, pady=5, sticky=(tk.W, tk.E))
        self.db_articles_label = ttk.Label(articles_frame, text="0", font=('Arial', 20, 'bold'), foreground='#667eea')
        self.db_articles_label.pack()
        ttk.Label(articles_frame, text="总文章数", style='Info.TLabel').pack()
        
        # 总图片数
        images_frame = ttk.Frame(stats_frame, relief='solid', borderwidth=1, padding="10")
        images_frame.grid(row=0, column=1, padx=5, pady=5, sticky=(tk.W, tk.E))
        self.db_images_label = ttk.Label(images_frame, text="0", font=('Arial', 20, 'bold'), foreground='#764ba2')
        self.db_images_label.pack()
        ttk.Label(images_frame, text="总图片数", style='Info.TLabel').pack()
    
    def create_log_panel(self, parent):
        """创建日志面板"""
        frame = ttk.LabelFrame(parent, text="📝 运行日志", padding="10")
        frame.grid(row=4, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 10))
        parent.rowconfigure(4, weight=1)
        
        # 日志文本框
        self.log_text = scrolledtext.ScrolledText(frame, height=10, wrap=tk.WORD, font=('Consolas', 9))
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        frame.columnconfigure(0, weight=1)
        frame.rowconfigure(0, weight=1)
        
        # 清空日志按钮
        clear_btn = ttk.Button(frame, text="清空日志", command=self.clear_log)
        clear_btn.grid(row=1, column=0, pady=(5, 0))
    
    def log(self, message):
        """添加日志"""
        timestamp = datetime.now().strftime('%H:%M:%S')
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
    
    def clear_log(self):
        """清空日志"""
        self.log_text.delete(1.0, tk.END)
    
    def start_scrape(self):
        """开始爬取"""
        if self.is_running:
            messagebox.showwarning("警告", "爬虫正在运行中")
            return
        
        # 获取参数
        category_name = self.category_var.get()
        category_map = {
            '全部分类': '',
            '无圣光': '1',
            '凸凹图': '2',
            '靓人体': '3',
            '写真集': '4'
        }
        category = category_map.get(category_name, '')
        
        try:
            max_pages = int(self.max_pages_var.get())
        except ValueError:
            messagebox.showerror("错误", "请输入有效的页数")
            return
        
        skip_existing = self.skip_existing_var.get()
        
        # 更新状态
        self.is_running = True
        self.should_stop = False
        self.start_btn.config(state='disabled')
        self.stop_btn.config(state='normal')
        self.status_label.config(text="运行中", style='Success.TLabel')
        self.progress_bar.start(10)
        
        # 清空日志
        self.clear_log()
        self.log(f"开始爬取 - 分类: {category_name}, 页数: {max_pages}")
        
        # 在后台线程中执行
        thread = threading.Thread(
            target=self.run_scrape,
            args=(category, max_pages, skip_existing),
            daemon=True
        )
        thread.start()
    
    def stop_scrape(self):
        """停止爬取"""
        if not self.is_running:
            return
        
        self.should_stop = True
        self.log("正在停止爬虫...")
        self.stop_btn.config(state='disabled')
    
    def run_scrape(self, category, max_pages, skip_existing):
        """执行爬取任务"""
        total_count = 0
        
        def progress_callback(msg):
            self.root.after(0, lambda: self.progress_label.config(text=msg))
            self.root.after(0, lambda: self.log(msg))
            
            if '第' in msg and '页' in msg:
                try:
                    page = int(msg.split('第')[1].split('页')[0].strip())
                    self.root.after(0, lambda: self.current_page_label.config(text=str(page)))
                except:
                    pass
        
        try:
            if category:
                # 爬取指定分类
                category_names = {'1': '无圣光', '2': '凸凹图', '3': '靓人体', '4': '写真集'}
                self.root.after(0, lambda: self.current_category_label.config(text=category_names.get(category, category)))
                
                count = self.scraper.scrape_category(
                    category,
                    max_pages=max_pages,
                    skip_existing=skip_existing,
                    progress_callback=progress_callback
                )
                total_count = count
                self.root.after(0, lambda: self.log(f"完成！共爬取 {count} 篇文章"))
            else:
                # 爬取所有分类
                stats = self.scraper.scrape_all_categories(
                    max_pages_per_category=max_pages,
                    skip_existing=skip_existing,
                    progress_callback=progress_callback
                )
                total_count = sum(stats.values())
                stats_text = ', '.join([f'{k}:{v}篇' for k, v in stats.items()])
                self.root.after(0, lambda: self.log(f"完成！共爬取 {total_count} 篇 ({stats_text})"))
            
            self.root.after(0, lambda: self.total_articles_label.config(text=str(total_count)))
            self.root.after(0, lambda: messagebox.showinfo("完成", f"爬取完成！共 {total_count} 篇文章"))
        
        except Exception as e:
            error_msg = f"错误: {str(e)}"
            self.root.after(0, lambda: self.log(error_msg))
            self.root.after(0, lambda: messagebox.showerror("错误", error_msg))
        
        finally:
            self.is_running = False
            self.should_stop = False
            self.root.after(0, self.finish_scrape)
    
    def finish_scrape(self):
        """完成爬取"""
        self.start_btn.config(state='normal')
        self.stop_btn.config(state='disabled')
        self.status_label.config(text="就绪", style='Value.TLabel')
        self.progress_bar.stop()
        self.update_db_stats()
    
    def update_status(self):
        """更新状态"""
        if not self.is_running:
            self.update_db_stats()
        
        # 每2秒更新一次
        self.root.after(2000, self.update_status)
    
    def update_db_stats(self):
        """更新数据库统计"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 总文章数
            cursor.execute('SELECT COUNT(*) FROM articles')
            total_articles = cursor.fetchone()[0]
            self.db_articles_label.config(text=str(total_articles))
            
            # 总图片数
            cursor.execute('SELECT COUNT(*) FROM images')
            total_images = cursor.fetchone()[0]
            self.db_images_label.config(text=str(total_images))
            
            conn.close()
        except Exception as e:
            pass


def main():
    """主函数"""
    root = tk.Tk()
    app = ScraperGUI(root)
    root.mainloop()


if __name__ == '__main__':
    main()
