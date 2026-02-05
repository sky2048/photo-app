import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUpdateStore = defineStore('update', () => {
  const currentVersion = ref('1.0.0') // 当前版本
  const latestVersion = ref(null)
  const downloadUrl = ref(null)
  const updateAvailable = ref(false)
  const checking = ref(false)
  const releaseNotes = ref('')
  
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
        // 使用 jsDelivr 加速下载
        downloadUrl.value = `https://cdn.jsdelivr.net/gh/sky2048/photo-app@${release.tag_name}/${apkAsset.name}`
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
  function downloadUpdate() {
    if (downloadUrl.value) {
      window.open(downloadUrl.value, '_blank')
    }
  }
  
  return {
    currentVersion,
    latestVersion,
    downloadUrl,
    updateAvailable,
    checking,
    releaseNotes,
    checkUpdate,
    downloadUpdate
  }
})
