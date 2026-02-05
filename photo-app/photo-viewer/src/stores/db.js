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
  const dbVersion = ref(null) // 当前数据库版本（文件修改时间）
  const articleCount = ref(0) // 文章总数
  
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
    'https://cdn.jsdelivr.net/gh/sky2048/photo-app@master/photo-app/photo-viewer/public/photo.db',
    'https://raw.githubusercontent.com/sky2048/photo-app/master/photo-app/photo-viewer/public/photo.db',
    'https://ghproxy.com/https://raw.githubusercontent.com/sky2048/photo-app/master/photo-app/photo-viewer/public/photo.db'
  ]
  
  // GitHub API 地址（用于获取文件信息）
  const githubApiUrl = 'https://api.github.com/repos/sky2048/photo-app/contents/photo-app/photo-viewer/public/photo.db'
  
  
  // 检查是否有待应用的更新
  async function checkPendingUpdate() {
    try {
      const pendingUpdate = localStorage.getItem('pending_db_update')
      if (pendingUpdate === 'true') {
        addLog('检测到待应用的数据库更新')
        return true
      }
      return false
    } catch (error) {
      addLog('检查待更新状态失败: ' + error.message)
      return false
    }
  }
  
  // 应用待更新的数据库
  async function applyPendingUpdate() {
    try {
      addLog('=== 开始应用待更新的数据库 ===')
      
      if (isWebPlatform.value) {
        // Web 平台：localStorage 中已经是新数据库了
        addLog('Web 平台，数据库已更新')
      } else {
        // 原生平台：需要替换数据库文件
        addLog('原生平台，准备替换数据库文件')
        
        // 检查下载的文件是否存在
        try {
          const downloadedFile = await Filesystem.stat({
            path: 'photo_downloaded.db',
            directory: Directory.Data
          })
          addLog('找到下载的数据库文件: ' + downloadedFile.size + ' bytes')
          
          // 读取下载的文件
          const downloadedData = await Filesystem.readFile({
            path: 'photo_downloaded.db',
            directory: Directory.Data
          })
          addLog('读取下载文件成功')
          
          // 保存到 databases 目录
          await Filesystem.writeFile({
            path: '../databases/photo.db',
            data: downloadedData.data,
            directory: Directory.Data
          })
          addLog('数据库文件已替换')
          
          // 删除临时文件
          await Filesystem.deleteFile({
            path: 'photo_downloaded.db',
            directory: Directory.Data
          })
          addLog('临时文件已删除')
          
        } catch (error) {
          addLog('应用更新失败: ' + error.message)
          throw error
        }
      }
      
      // 清除待更新标记
      localStorage.removeItem('pending_db_update')
      addLog('待更新标记已清除')
      
      return true
    } catch (error) {
      addLog('应用更新失败: ' + error.message)
      throw error
    }
  }
  
  // 初始化数据库
  async function initDatabase() {
    try {
      addLog('=== 开始初始化数据库 ===')
      addLog('平台: ' + Capacitor.getPlatform())
      addLog('是否原生: ' + Capacitor.isNativePlatform())
      
      // 检查是否有待应用的更新
      const hasPendingUpdate = await checkPendingUpdate()
      if (hasPendingUpdate) {
        addLog('发现待应用的更新，先应用更新')
        try {
          await applyPendingUpdate()
          addLog('更新应用成功')
        } catch (error) {
          addLog('应用更新失败，继续正常初始化: ' + error.message)
        }
      }
      
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
          
          // 打开数据库
          addLog('打开数据库...')
          await db.value.open()
          addLog('数据库打开成功')
          
          // 如果是首次创建，需要从下载的文件导入数据
          if (!dbExists) {
            addLog('导入下载的数据库...')
            await importDownloadedDatabase()
            addLog('数据导入完成')
          }
        }
        
        // 测试查询并获取文章数量
        try {
          addLog('测试查询数据库...')
          const testResult = await db.value.query('SELECT COUNT(*) as total FROM articles', [])
          addLog('查询结果: ' + JSON.stringify(testResult))
          
          if (testResult && testResult.values && testResult.values.length > 0) {
            const total = testResult.values[0].total || testResult.values[0][0]
            articleCount.value = total
            addLog('数据库中有 ' + total + ' 篇文章')
          }
        } catch (testError) {
          addLog('测试查询失败: ' + testError.message)
          throw new Error('数据库文件无法读取: ' + testError.message)
        }
        
        // 获取数据库版本信息
        await loadDatabaseVersion()
        
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
  
  // 检查数据库是否存在
  async function checkDatabaseExists() {
    try {
      addLog('检查数据库文件...')
      // 尝试检查 databases 目录
      const result = await Filesystem.stat({
        path: '../databases/photo.db',
        directory: Directory.Data
      })
      addLog('数据库文件存在')
      return true
    } catch (error) {
      addLog('数据库文件不存在')
      return false
    }
  }
  
  // 导入下载的数据库
  async function importDownloadedDatabase() {
    try {
      // 获取下载文件的路径
      const downloadedUri = await Filesystem.getUri({
        path: 'photo_downloaded.db',
        directory: Directory.Data
      })
      
      const dbPath = downloadedUri.uri.replace('file://', '')
      addLog('下载文件路径: ' + dbPath)
      
      // 使用 ATTACH 附加数据库
      addLog('附加下载的数据库...')
      await db.value.execute(`ATTACH DATABASE '${dbPath}' AS downloaded;`)
      addLog('数据库附加成功')
      
      // 获取所有表名（一次性获取，避免多次查询）
      const tablesResult = await db.value.query(
        "SELECT name FROM downloaded.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        []
      )
      
      addLog('找到 ' + (tablesResult.values?.length || 0) + ' 个表')
      
      if (tablesResult.values && tablesResult.values.length > 0) {
        // 提取所有表名
        const tableNames = tablesResult.values.map(row => row.name || row[0])
        addLog('表列表: ' + tableNames.join(', '))
        
        for (const tableName of tableNames) {
          addLog('处理表: ' + tableName)
          
          // 获取表结构（一次性获取）
          const createTableResult = await db.value.query(
            `SELECT sql FROM downloaded.sqlite_master WHERE type='table' AND name=?`,
            [tableName]
          )
          
          if (createTableResult.values && createTableResult.values.length > 0) {
            const createSql = createTableResult.values[0].sql || createTableResult.values[0][0]
            
            // 创建表
            try {
              await db.value.execute(createSql)
              addLog('✓ 创建表: ' + tableName)
            } catch (e) {
              if (e.message.includes('already exists')) {
                addLog('表已存在: ' + tableName)
              } else {
                addLog('✗ 创建表失败: ' + e.message)
                continue
              }
            }
            
            // 复制数据（使用事务）
            try {
              await db.value.execute(`INSERT INTO ${tableName} SELECT * FROM downloaded.${tableName};`)
              addLog('✓ 复制数据: ' + tableName)
            } catch (e) {
              addLog('✗ 复制数据失败: ' + e.message)
            }
          }
        }
      }
      
      // 关键：关闭数据库连接，这会自动分离所有附加的数据库
      addLog('关闭数据库连接...')
      await db.value.close()
      addLog('数据库已关闭')
      
      // 重新打开数据库
      addLog('重新打开数据库...')
      await db.value.open()
      addLog('数据库已重新打开')
      
    } catch (error) {
      addLog('导入失败: ' + error.message)
      throw error
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
        
        // 获取文章数量
        const testResult = sqlJsDb.value.exec('SELECT COUNT(*) as total FROM articles')
        if (testResult.length > 0 && testResult[0].values.length > 0) {
          articleCount.value = testResult[0].values[0][0]
        }
        
        downloadProgress.value = 100
        console.log('数据库下载完成')
        
        // 获取数据库版本信息
        await loadDatabaseVersion()
        
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
  
  // 从 GitHub 下载数据库（原生平台）- 简化版本
  async function downloadDatabase() {
    downloadProgress.value = 0
    downloadError.value = null
    
    const dbName = 'photo'
    
    // 尝试所有 CDN 地址
    for (let i = 0; i < dbUrls.length; i++) {
      try {
        addLog(`尝试 CDN ${i + 1}: ${dbUrls[i]}`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          addLog('请求超时，中止...')
          controller.abort()
        }, 60000)  // 60 秒超时
        
        const response = await fetch(dbUrls[i], {
          signal: controller.signal,
          method: 'GET',
          mode: 'cors'
        })
        
        clearTimeout(timeoutId)
        
        addLog(`响应状态: ${response.status}`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        addLog('开始接收数据...')
        const arrayBuffer = await response.arrayBuffer()
        const receivedLength = arrayBuffer.byteLength
        
        addLog(`下载完成: ${receivedLength} bytes`)
        
        const base64Data = arrayBufferToBase64(arrayBuffer)
        addLog('Base64 转换完成')
        
        // 直接保存到 SQLite 的 databases 目录
        // 使用相对路径 ../databases/ 从 files 目录跳到 databases 目录
        addLog('保存到 databases 目录...')
        
        try {
          await Filesystem.writeFile({
            path: '../databases/photo.db',
            data: base64Data,
            directory: Directory.Data
          })
          addLog('数据库文件已保存到 databases 目录')
        } catch (e) {
          addLog('保存失败: ' + e.message)
          // 如果失败，尝试另一种方式
          addLog('尝试备用方案...')
          await Filesystem.writeFile({
            path: 'photo_downloaded.db',
            data: base64Data,
            directory: Directory.Data
          })
          addLog('已保存到备用位置')
        }
        
        downloadProgress.value = 100
        return
        
      } catch (error) {
        addLog(`CDN ${i + 1} 失败: ${error.message}`)
        downloadError.value = error.message
        
        if (i < dbUrls.length - 1) {
          addLog('等待 2 秒后尝试下一个源...')
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
        
        throw new Error('所有下载源均失败: ' + error.message)
      }
    }
  }
  
  // 检查远程数据库版本（使用 GitHub API）
  async function checkRemoteDatabaseVersion() {
    try {
      addLog('检查远程数据库版本...')
      
      const response = await fetch(githubApiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      // GitHub API 返回文件的 SHA 和大小
      const remoteVersion = {
        sha: data.sha,
        size: data.size,
        lastModified: new Date(data.commit?.committer?.date || Date.now()).getTime()
      }
      
      addLog('远程版本: ' + JSON.stringify(remoteVersion))
      
      return remoteVersion
    } catch (error) {
      addLog('检查远程版本失败: ' + error.message)
      // 如果 API 失败，尝试备用方案：HEAD 请求获取文件信息
      try {
        const response = await fetch(dbUrls[0], { method: 'HEAD' })
        const lastModified = response.headers.get('last-modified')
        const contentLength = response.headers.get('content-length')
        
        return {
          size: parseInt(contentLength) || 0,
          lastModified: lastModified ? new Date(lastModified).getTime() : Date.now()
        }
      } catch (fallbackError) {
        addLog('备用方案也失败: ' + fallbackError.message)
        throw new Error('无法检查远程版本')
      }
    }
  }
  
  // 加载本地数据库版本信息
  async function loadDatabaseVersion() {
    try {
      const savedVersion = localStorage.getItem('db_version')
      if (savedVersion) {
        dbVersion.value = JSON.parse(savedVersion)
        addLog('本地数据库版本: ' + JSON.stringify(dbVersion.value))
      }
    } catch (error) {
      addLog('加载本地版本信息失败: ' + error.message)
    }
  }
  
  // 保存数据库版本信息
  function saveDatabaseVersion(versionInfo) {
    try {
      dbVersion.value = versionInfo
      localStorage.setItem('db_version', JSON.stringify(versionInfo))
      addLog('版本信息已保存: ' + JSON.stringify(versionInfo))
    } catch (error) {
      addLog('保存版本信息失败: ' + error.message)
    }
  }
  
  // 检查是否需要更新数据库
  async function checkDatabaseUpdate() {
    try {
      addLog('=== 检查数据库更新 ===')
      
      // 获取远程版本
      const remoteVersion = await checkRemoteDatabaseVersion()
      
      // 获取本地版本
      await loadDatabaseVersion()
      
      if (!dbVersion.value) {
        addLog('本地无版本信息，建议更新')
        return {
          hasUpdate: true,
          remoteVersion,
          localVersion: null,
          reason: '首次使用'
        }
      }
      
      // 比较版本（使用文件大小或 SHA）
      let hasUpdate = false
      let reason = ''
      
      if (remoteVersion.sha && dbVersion.value.sha) {
        hasUpdate = remoteVersion.sha !== dbVersion.value.sha
        reason = 'SHA 不同'
      } else if (remoteVersion.size !== dbVersion.value.size) {
        hasUpdate = true
        reason = '文件大小不同'
      } else if (remoteVersion.lastModified > dbVersion.value.lastModified) {
        hasUpdate = true
        reason = '远程文件更新'
      }
      
      addLog(`更新检查结果: ${hasUpdate ? '有更新' : '无更新'} (${reason})`)
      
      return {
        hasUpdate,
        remoteVersion,
        localVersion: dbVersion.value,
        reason
      }
    } catch (error) {
      addLog('检查更新失败: ' + error.message)
      throw error
    }
  }
  
  // 更新数据库（下载到临时位置，重启后应用）
  async function updateDatabase() {
    try {
      addLog('=== 开始更新数据库 ===')
      
      if (isWebPlatform.value) {
        // Web 平台：直接更新
        addLog('Web 平台，直接更新')
        localStorage.removeItem('photo_db')
        await downloadDatabaseWeb()
        
        // 获取远程版本信息并保存
        const remoteVersion = await checkRemoteDatabaseVersion()
        saveDatabaseVersion(remoteVersion)
        
        addLog('数据库更新成功')
        return { success: true, needRestart: false }
      } else {
        // 原生平台：下载到临时位置
        addLog('原生平台，下载到临时位置')
        
        // 下载新数据库到临时文件
        await downloadDatabase()
        
        // 获取远程版本信息并保存
        const remoteVersion = await checkRemoteDatabaseVersion()
        saveDatabaseVersion(remoteVersion)
        
        // 标记为待更新
        localStorage.setItem('pending_db_update', 'true')
        addLog('数据库已下载，标记为待更新')
        
        return { success: true, needRestart: true }
      }
    } catch (error) {
      addLog('更新失败: ' + error.message)
      console.error('更新数据库失败:', error)
      return { success: false, error: error.message }
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
      if (!db.value) {
        addLog('数据库未初始化')
        return []
      }
      
      try {
        addLog('查询分类列表...')
        const result = await db.value.query(`
          SELECT category, COUNT(*) as count 
          FROM articles 
          GROUP BY category
        `)
        
        addLog('分类查询结果: ' + JSON.stringify(result))
        
        // Capacitor SQLite 返回的数据结构
        if (result.values && result.values.length > 0) {
          const categories = result.values.map(row => ({
            category: row[0] || row.category,
            count: row[1] || row.count
          }))
          addLog('找到 ' + categories.length + ' 个分类')
          return categories
        }
        
        addLog('未找到分类数据')
        return []
      } catch (error) {
        addLog('获取分类失败: ' + error.message)
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
      if (!db.value) {
        addLog('数据库未初始化')
        return []
      }
      
      try {
        let query = 'SELECT * FROM articles'
        const params = []
        
        if (category) {
          query += ' WHERE category = ?'
          params.push(category)
        }
        
        query += ' ORDER BY id DESC LIMIT ? OFFSET ?'
        params.push(limit, offset)
        
        addLog('查询文章: ' + query)
        const result = await db.value.query(query, params)
        addLog('文章查询结果: ' + JSON.stringify(result))
        
        // 处理返回的数据
        if (result.values && result.values.length > 0) {
          addLog('找到 ' + result.values.length + ' 篇文章')
          return result.values
        }
        
        addLog('未找到文章')
        return []
      } catch (error) {
        addLog('获取文章失败: ' + error.message)
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
    dbVersion,
    articleCount,
    initDatabase,
    checkDatabaseUpdate,
    updateDatabase,
    getCategories,
    getArticles,
    getArticleDetail,
    searchArticles,
    getRandomArticle
  }
})
