import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Http } from '@capacitor-community/http'
import { FileOpener } from '@capacitor-community/file-opener'

export const useUpdateStore = defineStore('update', () => {
  const currentVersion = ref(__APP_VERSION__ || '1.0.0') // 从构建时注入
  const latestVersion = ref(null)
  const downloadUrl = ref(null)
  const updateAvailable = ref(false)
  const checking = ref(false)
  const releaseNotes = ref('')
  const downloading = ref(false)
  const downloadProgress = ref(0)
  const apkFileName = ref('')
  const downloadError = ref(null)
  const isNativePlatform = ref(Capacitor.isNativePlatform())
  
  // 数据库更新相关
  const dbUpdateAvailable = ref(false)
  const dbUpdateInfo = ref(null)
  const checkingDbUpdate = ref(false)
  
  // 更新检查缓存
  const UPDATE_CACHE_KEY = 'update_check_cache'
  const CACHE_DURATION = 3600000 // 1小时
  
  // CDN 加速配置
  const cdnProviders = [
    {
      name: 'jsDelivr',
      transform: (url) => url.replace(
        'https://github.com',
        'https://cdn.jsdelivr.net/gh'
      ).replace('/releases/download/', '@')
    },
    {
      name: 'GitHub',
      transform: (url) => url
    }
  ]
  
  // 检查更新（带缓存）
  async function checkUpdate(forceCheck = false) {
    try {
      // 检查缓存
      if (!forceCheck) {
        const cached = getCachedUpdateInfo()
        if (cached) {
          console.log('使用缓存的更新信息')
          latestVersion.value = cached.latestVersion
          releaseNotes.value = cached.releaseNotes
          downloadUrl.value = cached.downloadUrl
          apkFileName.value = cached.apkFileName
          updateAvailable.value = cached.updateAvailable
          return cached
        }
      }
      
      checking.value = true
      
      // 从 GitHub API 获取最新 Release
      const response = await fetch(
        'https://api.github.com/repos/sky2048/photo-app/releases/latest',
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('检查更新失败')
      }
      
      const release = await response.json()
      latestVersion.value = release.tag_name.replace('v', '')
      releaseNotes.value = release.body || '暂无更新说明'
      
      // 查找 APK 文件
      const apkAsset = release.assets.find(asset => 
        asset.name.endsWith('.apk')
      )
      
      if (apkAsset) {
        // 使用 GitHub 直接下载链接
        downloadUrl.value = apkAsset.browser_download_url
        apkFileName.value = apkAsset.name
      }
      
      // 比较版本号
      updateAvailable.value = compareVersions(latestVersion.value, currentVersion.value) > 0
      
      const result = {
        hasUpdate: updateAvailable.value,
        latestVersion: latestVersion.value,
        currentVersion: currentVersion.value,
        downloadUrl: downloadUrl.value,
        releaseNotes: releaseNotes.value,
        apkFileName: apkFileName.value
      }
      
      // 缓存结果
      cacheUpdateInfo(result)
      
      return result
      
    } catch (error) {
      console.error('检查更新失败:', error)
      return null
    } finally {
      checking.value = false
    }
  }
  
  // 获取缓存的更新信息
  function getCachedUpdateInfo() {
    try {
      const cached = localStorage.getItem(UPDATE_CACHE_KEY)
      if (!cached) return null
      
      const data = JSON.parse(cached)
      const now = Date.now()
      
      // 检查是否过期
      if (now - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(UPDATE_CACHE_KEY)
        return null
      }
      
      return data
    } catch (error) {
      console.error('读取缓存失败:', error)
      return null
    }
  }
  
  // 缓存更新信息
  function cacheUpdateInfo(info) {
    try {
      const data = {
        ...info,
        timestamp: Date.now()
      }
      localStorage.setItem(UPDATE_CACHE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('缓存失败:', error)
    }
  }
  
  // 比较版本号 (返回 1: v1 > v2, -1: v1 < v2, 0: 相等)
  function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0
      const num2 = parts2[i] || 0
      
      if (num1 > num2) return 1
      if (num1 < num2) return -1
    }
    
    return 0
  }
  
  // 下载更新（原生平台使用 HTTP 插件，Web 使用 iframe）
  async function downloadUpdate() {
    if (!downloadUrl.value) return
    
    downloading.value = true
    downloadProgress.value = 0
    downloadError.value = null
    
    try {
      if (isNativePlatform.value) {
        // 原生平台：使用 Capacitor HTTP 插件
        await downloadUpdateNative()
      } else {
        // Web 平台：使用 iframe
        await downloadUpdateWeb()
      }
    } catch (error) {
      console.error('下载失败:', error)
      downloadError.value = error.message
      alert('下载失败: ' + error.message)
      downloading.value = false
      downloadProgress.value = 0
    }
  }
  
  // 原生平台下载（真实进度）
  async function downloadUpdateNative() {
    console.log('原生平台下载，使用 HTTP 插件')
    
    // 尝试使用 CDN 加速
    let downloadSuccess = false
    let lastError = null
    
    for (const provider of cdnProviders) {
      try {
        const url = provider.transform(downloadUrl.value)
        console.log(`尝试从 ${provider.name} 下载: ${url}`)
        
        // 检查文件大小
        const headResponse = await Http.request({
          method: 'HEAD',
          url: url
        })
        
        const contentLength = headResponse.headers['content-length'] || 
                             headResponse.headers['Content-Length']
        const fileSizeMB = contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(2) : '未知'
        
        console.log(`文件大小: ${fileSizeMB} MB`)
        
        // jsDelivr 限制 50MB
        if (provider.name === 'jsDelivr' && contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
          console.log('文件超过 50MB，跳过 jsDelivr')
          continue
        }
        
        // 下载文件
        const result = await Http.downloadFile({
          url: url,
          filePath: apkFileName.value,
          fileDirectory: Directory.Cache,
          method: 'GET',
          progress: true,
          // 进度回调
          connectTimeout: 60000,
          readTimeout: 60000
        })
        
        // 监听进度（注意：某些版本的插件可能不支持进度回调）
        // 这里使用轮询方式检查下载进度
        const checkProgress = setInterval(async () => {
          try {
            const stat = await Filesystem.stat({
              path: apkFileName.value,
              directory: Directory.Cache
            })
            
            if (contentLength) {
              const progress = (stat.size / parseInt(contentLength)) * 100
              downloadProgress.value = Math.min(Math.round(progress), 99)
            }
          } catch (e) {
            // 文件还不存在
          }
        }, 500)
        
        // 等待下载完成
        await new Promise((resolve) => {
          const interval = setInterval(async () => {
            try {
              const stat = await Filesystem.stat({
                path: apkFileName.value,
                directory: Directory.Cache
              })
              
              if (contentLength && stat.size >= parseInt(contentLength)) {
                clearInterval(interval)
                clearInterval(checkProgress)
                resolve()
              }
            } catch (e) {
              // 继续等待
            }
          }, 1000)
          
          // 超时保护（5分钟）
          setTimeout(() => {
            clearInterval(interval)
            clearInterval(checkProgress)
            resolve()
          }, 300000)
        })
        
        downloadProgress.value = 100
        console.log('下载完成')
        
        // 获取文件路径
        const fileUri = await Filesystem.getUri({
          path: apkFileName.value,
          directory: Directory.Cache
        })
        
        console.log('文件路径:', fileUri.uri)
        
        // 自动打开安装界面
        await FileOpener.open({
          filePath: fileUri.uri,
          contentType: 'application/vnd.android.package-archive',
          openWithDefault: true
        })
        
        downloadSuccess = true
        downloading.value = false
        downloadProgress.value = 0
        
        alert('✅ 下载完成！\n\n安装界面已打开，请点击"安装"按钮完成更新。')
        break
        
      } catch (error) {
        console.error(`${provider.name} 下载失败:`, error)
        lastError = error
        
        // 如果不是最后一个，继续尝试
        if (provider !== cdnProviders[cdnProviders.length - 1]) {
          console.log('尝试下一个下载源...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          continue
        }
      }
    }
    
    if (!downloadSuccess) {
      throw lastError || new Error('所有下载源均失败')
    }
  }
  
  // Web 平台下载（iframe 方式）
  async function downloadUpdateWeb() {
    console.log('Web 平台下载，使用 iframe')
    
    // 创建隐藏的 iframe 来触发下载
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = downloadUrl.value
    document.body.appendChild(iframe)
    
    // 模拟进度（因为无法获取真实进度）
    const progressInterval = setInterval(() => {
      if (downloadProgress.value < 90) {
        downloadProgress.value += 10
      }
    }, 500)
    
    // 5秒后认为下载已开始
    setTimeout(() => {
      clearInterval(progressInterval)
      downloadProgress.value = 100
      document.body.removeChild(iframe)
      downloading.value = false
      downloadProgress.value = 0
      alert('下载已开始，请在通知栏查看下载进度，下载完成后点击安装')
    }, 5000)
  }
  
  // 检查是否需要检查数据库更新（每天一次）
  function shouldCheckDatabaseUpdate() {
    try {
      const lastCheckDate = localStorage.getItem('last_db_check_date')
      const today = new Date().toDateString()
      
      if (!lastCheckDate || lastCheckDate !== today) {
        console.log('需要检查数据库更新')
        return true
      }
      
      console.log('今天已检查过数据库更新')
      return false
    } catch (error) {
      console.error('检查更新时间失败:', error)
      return true // 出错时默认检查
    }
  }
  
  // 保存检查时间
  function saveCheckTime() {
    try {
      const today = new Date().toDateString()
      localStorage.setItem('last_db_check_date', today)
    } catch (error) {
      console.error('保存检查时间失败:', error)
    }
  }
  
  // 检查数据库更新
  async function checkDatabaseUpdate(dbStore) {
    if (!dbStore) {
      console.error('需要传入 dbStore')
      return null
    }
    
    try {
      checkingDbUpdate.value = true
      
      const result = await dbStore.checkDatabaseUpdate()
      
      dbUpdateAvailable.value = result.hasUpdate
      dbUpdateInfo.value = result
      
      // 保存检查时间
      saveCheckTime()
      
      return result
    } catch (error) {
      console.error('检查数据库更新失败:', error)
      return null
    } finally {
      checkingDbUpdate.value = false
    }
  }
  
  // 自动检查数据库更新（每天一次）
  async function autoCheckDatabaseUpdate(dbStore) {
    if (!shouldCheckDatabaseUpdate()) {
      return null
    }
    
    console.log('执行每日数据库更新检查...')
    return await checkDatabaseUpdate(dbStore)
  }
  
  return {
    currentVersion,
    latestVersion,
    downloadUrl,
    updateAvailable,
    checking,
    releaseNotes,
    downloading,
    downloadProgress,
    apkFileName,
    downloadError,
    isNativePlatform,
    dbUpdateAvailable,
    dbUpdateInfo,
    checkingDbUpdate,
    checkUpdate,
    downloadUpdate,
    checkDatabaseUpdate,
    autoCheckDatabaseUpdate,
    shouldCheckDatabaseUpdate
  }
})
