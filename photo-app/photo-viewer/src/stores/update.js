import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Filesystem, Directory } from '@capacitor/filesystem'

export const useUpdateStore = defineStore('update', () => {
  const currentVersion = ref('1.0.0') // 当前版本
  const latestVersion = ref(null)
  const downloadUrl = ref(null)
  const updateAvailable = ref(false)
  const checking = ref(false)
  const releaseNotes = ref('')
  const downloading = ref(false)
  const downloadProgress = ref(0)
  const apkFileName = ref('')
  
  // 数据库更新相关
  const dbUpdateAvailable = ref(false)
  const dbUpdateInfo = ref(null)
  const checkingDbUpdate = ref(false)
  
  // 检查更新
  async function checkUpdate() {
    try {
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
      
      return {
        hasUpdate: updateAvailable.value,
        latestVersion: latestVersion.value,
        currentVersion: currentVersion.value,
        downloadUrl: downloadUrl.value,
        releaseNotes: releaseNotes.value
      }
      
    } catch (error) {
      console.error('检查更新失败:', error)
      return null
    } finally {
      checking.value = false
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
  
  // 下载更新
  async function downloadUpdate() {
    if (!downloadUrl.value) return
    
    downloading.value = true
    downloadProgress.value = 0
    
    try {
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
      
    } catch (error) {
      console.error('下载失败:', error)
      alert('下载失败: ' + error.message)
      downloading.value = false
      downloadProgress.value = 0
    }
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
