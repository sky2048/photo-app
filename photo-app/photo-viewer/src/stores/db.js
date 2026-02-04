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
  const downloadProgress = ref(0) // 下载进度
  const downloadError = ref(null) // 下载错误信息
  const debugLog = ref([]) // 调试日志
  
  // 添加调试日志
  function addLog(message) {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    debugLog.value.push(logMessage)
    console.log(message)
    
    // 只保留最后 30 条
    if (debugLog.value.length > 30) {
      debugLog.value.shift()
    }
  }
  
  // 多个备用 CDN 地址
  const dbUrls = [
    'https://cdn.jsdelivr.net/gh/sky2048/photo-app@master/photo.db',
    'https://raw.githubusercontent.com/sky2048/photo-app/master/photo.db',
    'https://ghproxy.com/https://raw.githubusercontent.com/sky2048/photo-app/master/photo.db'
  ]
  
  
  // 初始化数据库
  async function initDatabase() {
    try {
      addLog('=== 开始初始化数据库 ===')
      addLog('平台: ' + Capacitor.getPlatform())
      addLog('是否原生: ' + Capacitor.isNativePlatform())
      
      if (Capacitor.isNativePlatform()) {
        // 原生平台（iOS/Android）- 使用 Capacitor SQLite
        isWebPlatform.value = false
        addLog('使用 Capacitor SQLite')
        
        const sqlite = new SQLiteConnection(CapacitorSQLite)
        addLog('SQLite 连接对象创建成功')
        
        // 检查连接列表中是否已存在
        addLog('检查连接一致性...')
        const ret = await sqlite.checkConnectionsConsistency()
        addLog('一致性: ' + JSON.stringify(ret))
        
        addLog('检查连接是否存在...')
        const isConn = (await sqlite.isConnection('photo', false)).result
        addLog('连接存在: ' + isConn)
        
        if (ret.result && isConn) {
          // 数据库连接已存在，直接获取
          addLog('恢复现有连接...')
          db.value = await sqlite.retrieveConnection('photo', false)
          addLog('连接恢复成功')
        } else {
          // 检查数据库文件是否存在
          addLog('检查数据库文件...')
          const dbExists = await checkDatabaseExists()
          addLog('数据库存在: ' + dbExists)
          
          if (!dbExists) {
            addLog('开始下载数据库...')
            await downloadDatabase()
            addLog('下载完成')
          }
          
          // 创建新连接
          addLog('创建数据库连接...')
          db.value = await sqlite.createConnection('photo', false, 'no-encryption', 1, false)
          addLog('连接创建成功')
        }
        
        // 打开数据库
        addLog('打开数据库...')
        await db.value.open()
        addLog('数据库打开成功')
        
      } else {
        // Web 平台 - 使用 sql.js
        isWebPlatform.value = true
        console.log('Web 平台，使用 sql.js')
        
        // 初始化 sql.js - 使用国内 CDN 加速
        const SQL = await initSqlJs({
          locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/${file}`
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
  
  // 检查数据库是否存在 - 简化版本，避免触发 createSyncTable 错误
  async function checkDatabaseExists() {
    try {
      addLog('使用文件系统检查数据库...')
      // 直接检查文件是否存在，不使用 getDatabaseList
      const result = await Filesystem.stat({
        path: 'databases/photo.db',
        directory: Directory.Data
      })
      addLog('数据库文件存在')
      return true
    } catch (error) {
      addLog('数据库文件不存在: ' + error.message)
      return false
    }
  }
  
  // 从 GitHub 下载数据库（Web 平台）- 带进度和重试
  async function downloadDatabaseWeb() {
    downloadProgress.value = 0
    downloadError.value = null
    
    // 尝试所有 CDN 地址
    for (let i = 0; i < dbUrls.length; i++) {
      try {
        console.log(`尝试从 CDN ${i + 1} 下载数据库...`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时
        
        const response = await fetch(dbUrls[i], {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        // 获取文件大小
        const contentLength = response.headers.get('content-length')
        const total = parseInt(contentLength, 10)
        
        // 使用流式读取以显示进度
        const reader = response.body.getReader()
        const chunks = []
        let receivedLength = 0
        
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          chunks.push(value)
          receivedLength += value.length
          
          if (total) {
            downloadProgress.value = Math.round((receivedLength / total) * 100)
          }
        }
        
        // 合并所有块
        const arrayBuffer = new Uint8Array(receivedLength)
        let position = 0
        for (const chunk of chunks) {
          arrayBuffer.set(chunk, position)
          position += chunk.length
        }
        
        // 初始化数据库
        const SQL = await initSqlJs({
          locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/${file}`
        })
        sqlJsDb.value = new SQL.Database(arrayBuffer)
        
        // 保存到 localStorage
        const base64 = uint8ArrayToBase64(arrayBuffer)
        localStorage.setItem('photo_db', base64)
        
        downloadProgress.value = 100
        console.log('数据库下载完成')
        return
        
      } catch (error) {
        console.error(`CDN ${i + 1} 下载失败:`, error)
        downloadError.value = error.message
        
        // 如果不是最后一个 URL，继续尝试下一个
        if (i < dbUrls.length - 1) {
          console.log('尝试下一个 CDN...')
          continue
        }
        
        // 所有 CDN 都失败了
        throw new Error('所有下载源均失败，请检查网络连接')
      }
    }
  }
  
  // 从 GitHub 下载数据库（原生平台）- 修复版本
  async function downloadDatabase() {
    downloadProgress.value = 0
    downloadError.value = null
    
    const dbName = 'photo'
    
    // 尝试所有 CDN 地址
    for (let i = 0; i < dbUrls.length; i++) {
      try {
        addLog(`尝试 CDN ${i + 1}...`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)
        
        const response = await fetch(dbUrls[i], {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        addLog('开始接收数据...')
        const contentLength = response.headers.get('content-length')
        const total = parseInt(contentLength, 10)
        
        // 流式读取
        const reader = response.body.getReader()
        const chunks = []
        let receivedLength = 0
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          chunks.push(value)
          receivedLength += value.length
          
          if (total) {
            downloadProgress.value = Math.round((receivedLength / total) * 100)
          }
        }
        
        // 合并数据
        const arrayBuffer = new Uint8Array(receivedLength)
        let position = 0
        for (const chunk of chunks) {
          arrayBuffer.set(chunk, position)
          position += chunk.length
        }
        
        addLog(`下载完成: ${receivedLength} bytes`)
        
        const base64Data = arrayBufferToBase64(arrayBuffer.buffer)
        addLog('Base64 转换完成')
        
        // 保存数据库文件到正确的位置
        addLog('保存数据库文件...')
        
        // 确保目录存在
        try {
          await Filesystem.mkdir({
            path: 'databases',
            directory: Directory.Data,
            recursive: true
          })
        } catch (e) {
          // 目录可能已存在，忽略错误
        }
        
        // 保存文件
        await Filesystem.writeFile({
          path: `databases/${dbName}.db`,
          data: base64Data,
          directory: Directory.Data
        })
        
        addLog('数据库文件保存成功')
        downloadProgress.value = 100
        return
        
      } catch (error) {
        addLog(`CDN ${i + 1} 失败: ${error.message}`)
        downloadError.value = error.message
        
        if (i < dbUrls.length - 1) {
          addLog('尝试下一个源...')
          continue
        }
        
        throw new Error('所有下载源均失败: ' + error.message)
      }
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
    downloadProgress,
    downloadError,
    debugLog,
    initDatabase,
    updateDatabase,
    getCategories,
    getArticles,
    getArticleDetail,
    searchArticles,
    getRandomArticle
  }
})
