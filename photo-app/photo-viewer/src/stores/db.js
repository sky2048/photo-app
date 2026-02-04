import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import initSqlJs from 'sql.js'

export const useDbStore = defineStore('db', () => {
  const db = ref(null)
  const sqlJsDb = ref(null) // Web 平台使用
  const isInitialized = ref(false)
  const isWebPlatform = ref(false)
  const dbUrl = 'https://raw.githubusercontent.com/sky2048/photo-app/master/photo.db'
  
  // 初始化数据库
  async function initDatabase() {
    try {
      if (Capacitor.isNativePlatform()) {
        // 原生平台（iOS/Android）- 使用 Capacitor SQLite
        isWebPlatform.value = false
        const sqlite = new SQLiteConnection(CapacitorSQLite)
        
        // 检查数据库是否存在
        const dbExists = await checkDatabaseExists()
        
        if (!dbExists) {
          console.log('数据库不存在，开始下载...')
          await downloadDatabase()
        }
        
        // 打开数据库
        db.value = await sqlite.createConnection('photo.db', false, 'no-encryption', 1, false)
        await db.value.open()
        
      } else {
        // Web 平台 - 使用 sql.js
        isWebPlatform.value = true
        console.log('Web 平台，使用 sql.js')
        
        // 初始化 sql.js
        const SQL = await initSqlJs({
          locateFile: file => `https://sql.js.org/dist/${file}`
        })
        
        // 尝试从 localStorage 加载数据库
        const savedDb = localStorage.getItem('photo_db')
        
        if (savedDb) {
          console.log('从本地加载数据库')
          const uint8Array = base64ToUint8Array(savedDb)
          sqlJsDb.value = new SQL.Database(uint8Array)
        } else {
          console.log('首次使用，从 GitHub 下载数据库')
          await downloadDatabaseWeb()
        }
      }
      
      isInitialized.value = true
      console.log('数据库初始化成功')
      
    } catch (error) {
      console.error('数据库初始化失败:', error)
      throw error
    }
  }
  
  // 检查数据库是否存在
  async function checkDatabaseExists() {
    try {
      const result = await Filesystem.stat({
        path: 'photo.db',
        directory: Directory.Data
      })
      return result !== null
    } catch {
      return false
    }
  }
  
  // 从 GitHub 下载数据库（Web 平台）
  async function downloadDatabaseWeb() {
    try {
      console.log('正在从 GitHub 下载数据库...')
      
      const response = await fetch(dbUrl)
      if (!response.ok) {
        throw new Error('下载失败: ' + response.statusText)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // 初始化数据库
      const SQL = await initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
      })
      sqlJsDb.value = new SQL.Database(uint8Array)
      
      // 保存到 localStorage
      const base64 = uint8ArrayToBase64(uint8Array)
      localStorage.setItem('photo_db', base64)
      
      console.log('数据库下载完成')
      
    } catch (error) {
      console.error('下载数据库失败:', error)
      throw error
    }
  }
  
  // 从 GitHub 下载数据库（原生平台）
  async function downloadDatabase() {
    try {
      console.log('正在从 GitHub 下载数据库...')
      
      // 下载文件
      const response = await fetch(dbUrl)
      if (!response.ok) {
        throw new Error('下载失败: ' + response.statusText)
      }
      
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const base64Data = arrayBufferToBase64(arrayBuffer)
      
      // 保存到本地
      await Filesystem.writeFile({
        path: 'photo.db',
        data: base64Data,
        directory: Directory.Data
      })
      
      console.log('数据库下载完成')
      
    } catch (error) {
      console.error('下载数据库失败:', error)
      throw error
    }
  }
  
  // 更新数据库（重新下载）
  async function updateDatabase() {
    try {
      if (isWebPlatform.value) {
        // Web 平台
        localStorage.removeItem('photo_db')
        await downloadDatabaseWeb()
      } else {
        // 原生平台
        if (db.value) {
          await db.value.close()
        }
        
        await Filesystem.deleteFile({
          path: 'photo.db',
          directory: Directory.Data
        })
        
        await downloadDatabase()
        await initDatabase()
      }
      
      return true
    } catch (error) {
      console.error('更新数据库失败:', error)
      return false
    }
  }
  
  // 获取分类列表
  async function getCategories() {
    if (isWebPlatform.value) {
      if (!sqlJsDb.value) return []
      
      try {
        const result = sqlJsDb.value.exec(`
          SELECT category, COUNT(*) as count 
          FROM articles 
          GROUP BY category
        `)
        
        if (result.length === 0) return []
        
        return result[0].values.map(row => ({
          category: row[0],
          count: row[1]
        }))
      } catch (error) {
        console.error('获取分类失败:', error)
        return []
      }
    } else {
      if (!db.value) return []
      
      try {
        const result = await db.value.query(`
          SELECT category, COUNT(*) as count 
          FROM articles 
          GROUP BY category
        `)
        
        return result.values || []
      } catch (error) {
        console.error('获取分类失败:', error)
        return []
      }
    }
  }
  
  // 获取文章列表
  async function getArticles(category = '', limit = 20, offset = 0) {
    if (isWebPlatform.value) {
      if (!sqlJsDb.value) return []
      
      try {
        let query = 'SELECT * FROM articles'
        const params = []
        
        if (category) {
          query += ' WHERE category = ?'
          params.push(category)
        }
        
        query += ' ORDER BY id DESC LIMIT ? OFFSET ?'
        params.push(limit, offset)
        
        const stmt = sqlJsDb.value.prepare(query)
        stmt.bind(params)
        
        const articles = []
        while (stmt.step()) {
          const row = stmt.getAsObject()
          articles.push(row)
        }
        stmt.free()
        
        return articles
      } catch (error) {
        console.error('获取文章失败:', error)
        return []
      }
    } else {
      if (!db.value) return []
      
      try {
        let query = 'SELECT * FROM articles'
        const params = []
        
        if (category) {
          query += ' WHERE category = ?'
          params.push(category)
        }
        
        query += ' ORDER BY id DESC LIMIT ? OFFSET ?'
        params.push(limit, offset)
        
        const result = await db.value.query(query, params)
        return result.values || []
      } catch (error) {
        console.error('获取文章失败:', error)
        return []
      }
    }
  }
  
  // 获取文章详情
  async function getArticleDetail(articleId) {
    if (isWebPlatform.value) {
      if (!sqlJsDb.value) return null
      
      try {
        const stmt = sqlJsDb.value.prepare('SELECT * FROM articles WHERE id = ?')
        stmt.bind([articleId])
        
        if (stmt.step()) {
          const article = stmt.getAsObject()
          stmt.free()
          
          // 获取图片列表
          const imgStmt = sqlJsDb.value.prepare(
            'SELECT image_url FROM images WHERE article_id = ? ORDER BY img_order'
          )
          imgStmt.bind([articleId])
          
          const images = []
          while (imgStmt.step()) {
            const row = imgStmt.getAsObject()
            images.push(row.image_url)
          }
          imgStmt.free()
          
          article.images = images
          return article
        }
        
        stmt.free()
        return null
      } catch (error) {
        console.error('获取文章详情失败:', error)
        return null
      }
    } else {
      if (!db.value) return null
      
      try {
        const result = await db.value.query(
          'SELECT * FROM articles WHERE id = ?',
          [articleId]
        )
        
        if (result.values && result.values.length > 0) {
          const article = result.values[0]
          
          // 获取图片列表
          const imagesResult = await db.value.query(
            'SELECT image_url FROM images WHERE article_id = ? ORDER BY img_order',
            [articleId]
          )
          
          article.images = imagesResult.values?.map(img => img.image_url) || []
          
          return article
        }
        
        return null
      } catch (error) {
        console.error('获取文章详情失败:', error)
        return null
      }
    }
  }
  
  // 搜索文章
  async function searchArticles(keyword) {
    if (isWebPlatform.value) {
      if (!sqlJsDb.value) return []
      
      try {
        const stmt = sqlJsDb.value.prepare(
          'SELECT * FROM articles WHERE title LIKE ? ORDER BY id DESC LIMIT 50'
        )
        stmt.bind([`%${keyword}%`])
        
        const articles = []
        while (stmt.step()) {
          articles.push(stmt.getAsObject())
        }
        stmt.free()
        
        return articles
      } catch (error) {
        console.error('搜索失败:', error)
        return []
      }
    } else {
      if (!db.value) return []
      
      try {
        const result = await db.value.query(
          'SELECT * FROM articles WHERE title LIKE ? ORDER BY id DESC LIMIT 50',
          [`%${keyword}%`]
        )
        
        return result.values || []
      } catch (error) {
        console.error('搜索失败:', error)
        return []
      }
    }
  }
  
  // 获取随机文章
  async function getRandomArticle() {
    if (isWebPlatform.value) {
      if (!sqlJsDb.value) return null
      
      try {
        const stmt = sqlJsDb.value.prepare(
          'SELECT * FROM articles ORDER BY RANDOM() LIMIT 1'
        )
        
        if (stmt.step()) {
          const article = stmt.getAsObject()
          stmt.free()
          return article
        }
        
        stmt.free()
        return null
      } catch (error) {
        console.error('获取随机文章失败:', error)
        return null
      }
    } else {
      if (!db.value) return null
      
      try {
        const result = await db.value.query(
          'SELECT * FROM articles ORDER BY RANDOM() LIMIT 1'
        )
        
        return result.values?.[0] || null
      } catch (error) {
        console.error('获取随机文章失败:', error)
        return null
      }
    }
  }
  
  // 工具函数：ArrayBuffer 转 Base64
  function arrayBufferToBase64(buffer) {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }
  
  // 工具函数：Uint8Array 转 Base64
  function uint8ArrayToBase64(uint8Array) {
    let binary = ''
    const len = uint8Array.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i])
    }
    return btoa(binary)
  }
  
  // 工具函数：Base64 转 Uint8Array
  function base64ToUint8Array(base64) {
    const binary = atob(base64)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
  
  return {
    db,
    isInitialized,
    initDatabase,
    updateDatabase,
    getCategories,
    getArticles,
    getArticleDetail,
    searchArticles,
    getRandomArticle
  }
})
