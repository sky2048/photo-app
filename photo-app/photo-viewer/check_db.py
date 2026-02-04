import sqlite3

conn = sqlite3.connect('public/photo.db')
cursor = conn.cursor()

# 检查表
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("数据库中的表:", tables)

# 检查文章数量
try:
    cursor.execute("SELECT COUNT(*) FROM articles")
    count = cursor.fetchone()[0]
    print(f"文章数量: {count}")
    
    # 查看前5条数据
    cursor.execute("SELECT id, title, category FROM articles LIMIT 5")
    articles = cursor.fetchall()
    print("\n前5条文章:")
    for article in articles:
        print(f"  ID: {article[0]}, 标题: {article[1]}, 分类: {article[2]}")
except Exception as e:
    print(f"查询失败: {e}")

conn.close()
