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
      await downloadAndInstallApk()
    } catch (error) {
      console.error('下载失败:', error)
      alert('下载失败: ' + error.message)
    } finally {
      downloading.value = false
      downloadProgress.value = 0
    }
  }
  
  // 下载并安装 APK
  async function downloadAndInstallApk() {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      xhr.open('GET', downloadUrl.value, true)
      xhr.responseType = 'arraybuffer'
      
      // 监听下载进度
      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          downloadProgress.value = Math.round((event.loaded / event.total) * 100)
        }
      }
      
      // 下载完成
      xhr.onload = async () => {
        if (xhr.status === 200) {
          try {
            const arrayBuffer = xhr.response
            const base64Data = arrayBufferToBase64(arrayBuffer)
            
            // 保存到本地
            const fileName = apkFileName.value
            await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Cache
            })
            
            // 获取文件 URI
            const fileUri = await Filesystem.getUri({
              path: fileName,
              directory: Directory.Cache
            })
            
            // 打开 APK 安装
            window.open(fileUri.uri, '_system')
            
            resolve()
          } catch (error) {
            reject(error)
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`))
        }
      }
      
      // 下载失败
      xhr.onerror = () => {
        reject(new Error('网络错误，请检查网络连接'))
      }
      
      xhr.ontimeout = () => {
        reject(new Error('下载超时'))
      }
      
      // 设置超时时间（5分钟）
      xhr.timeout = 300000
      
      xhr.send()
    })
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
  
  return {
    currentVersion,
    latestVersion,
    downloadUrl,
    updateAvailable,
    checking,
    releaseNotes,
    downloading,
    downloadProgress,
    checkUpdate,
    downloadUpdate
  }
})
