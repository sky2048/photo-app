import sqlite3

conn = sqlite3.connect('public/photo.db')
cursor = conn.cursor()

# 查看 articles 表结构
print("=== articles 表结构 ===")
cursor.execute("PRAGMA table_info(articles)")
for col in cursor.fetchall():
    print(f"  {col[1]} ({col[2]})")

# 查看 images 表结构
print("\n=== images 表结构 ===")
cursor.execute("PRAGMA table_info(images)")
for col in cursor.fetchall():
    print(f"  {col[1]} ({col[2]})")

# 查看一条图片数据示例
print("\n=== images 表数据示例 ===")
cursor.execute("SELECT * FROM images LIMIT 1")
row = cursor.fetchone()
if row:
    cursor.execute("PRAGMA table_info(images)")
    cols = [col[1] for col in cursor.fetchall()]
    for i, col in enumerate(cols):
        print(f"  {col}: {row[i]}")

conn.close()
