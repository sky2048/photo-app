<template>
  <div class="app">
    <div v-if="loading" class="init-loading">
      <div class="spinner"></div>
      <p>{{ loadingMessage }}</p>
      <div v-if="dbStore.downloadProgress > 0" class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: dbStore.downloadProgress + '%' }"></div>
        </div>
        <p class="progress-text">{{ dbStore.downloadProgress }}%</p>
      </div>
      <p v-if="dbStore.downloadError" class="error-hint">{{ dbStore.downloadError }}</p>
      
      <!-- 调试日志 -->
      <div v-if="dbStore.debugLog.length > 0" class="debug-logs">
        <div v-for="(log, index) in dbStore.debugLog" :key="index" class="debug-log">
          {{ log }}
        </div>
      </div>
    </div>
    <div v-else-if="error" class="init-error">
      <p>❌ 下载失败:</p>
      <p class="error-detail">{{ error }}</p>
      <button @click="retry">重试</button>
      <p class="error-tip">提示：请确保网络连接正常</p>
      
      <!-- 调试日志 -->
      <div v-if="dbStore.debugLog.length > 0" class="debug-logs">
        <div v-for="(log, index) in dbStore.debugLog" :key="index" class="debug-log">
          {{ log }}
        </div>
      </div>
    </div>
    <div v-else>
      <!-- 数据库更新通知 -->
      <div v-if="showUpdateNotification" class="update-notification">
        <div class="notification-content">
          <div class="notification-icon">🔄</div>
          <div class="notification-text">
            <div class="notification-title">数据库有更新</div>
            <div class="notification-desc">{{ updateNotificationMessage }}</div>
          </div>
          <div class="notification-actions">
            <button class="btn-update" @click="goToSettings">去更新</button>
            <button class="btn-close" @click="closeUpdateNotification">×</button>
          </div>
        </div>
      </div>
      
      <router-view v-slot="{ Component }">
        <keep-alive include="HomeView,RandomView">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useDbStore } from './stores/db'
import { useUpdateStore } from './stores/update'

const dbStore = useDbStore()
const updateStore = useUpdateStore()
const loading = ref(true)
const error = ref('')
const loadingMessage = ref('正在初始化数据库...')
const showUpdateNotification = ref(false)
const updateNotificationMessage = ref('')

// 监听下载进度
watch(() => dbStore.downloadProgress, (progress) => {
  if (progress > 0 && progress < 100) {
    loadingMessage.value = '正在下载数据库...'
  } else if (progress === 100) {
    loadingMessage.value = '下载完成，正在加载...'
  }
})

async function initApp() {
  try {
    loading.value = true
    error.value = ''
    loadingMessage.value = '正在初始化数据库...'
    
    await dbStore.initDatabase()
    
    loadingMessage.value = '数据库加载成功！'
    setTimeout(() => {
      loading.value = false
      
      // 初始化完成后，检查数据库更新
      checkForDatabaseUpdate()
    }, 500)
  } catch (e) {
    console.error('初始化失败:', e)
    error.value = e.message || '数据库初始化失败'
    loading.value = false
  }
}

// 检查数据库更新（每天一次）
async function checkForDatabaseUpdate() {
  try {
    const result = await updateStore.autoCheckDatabaseUpdate(dbStore)
    
    if (result && result.hasUpdate) {
      // 发现更新，显示通知
      const localCount = dbStore.articleCount || 0
      updateNotificationMessage.value = `发现数据库更新！${result.reason || ''}`
      showUpdateNotification.value = true
      
      console.log('发现数据库更新:', result)
    }
  } catch (error) {
    console.error('自动检查数据库更新失败:', error)
    // 静默失败，不影响用户使用
  }
}

// 关闭更新通知
function closeUpdateNotification() {
  showUpdateNotification.value = false
}

// 前往设置页面更新
function goToSettings() {
  showUpdateNotification.value = false
  // 使用 router 跳转到设置页
  window.location.hash = '#/settings'
}

function retry() {
  initApp()
}

onMounted(() => {
  initApp()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f5f5f5;
}

.app {
  min-height: 100vh;
}

.init-loading, .init-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  text-align: center;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.init-loading p, .init-error p {
  font-size: 16px;
  color: #666;
  margin-bottom: 10px;
}

.progress-container {
  width: 80%;
  max-width: 300px;
  margin-top: 20px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007aff, #00c6ff);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-text {
  font-size: 14px;
  color: #007aff;
  font-weight: 600;
}

.error-hint {
  font-size: 12px;
  color: #ff3b30;
  margin-top: 10px;
  max-width: 300px;
}

.error-detail {
  font-size: 14px;
  color: #ff3b30;
  margin: 10px 0;
  padding: 10px;
  background: #fff0f0;
  border-radius: 8px;
  max-width: 300px;
}

.error-tip {
  font-size: 12px;
  color: #999;
  margin-top: 15px;
}

.init-error button {
  padding: 12px 40px;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
  transition: background 0.2s;
}

.init-error button:active {
  background: #0051d5;
}

.debug-logs {
  margin-top: 20px;
  max-width: 90%;
  max-height: 200px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 10px;
  text-align: left;
}

.debug-log {
  font-size: 11px;
  color: #666;
  font-family: 'Courier New', monospace;
  margin: 2px 0;
  word-break: break-all;
}

/* 更新通知 */
.update-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 90%;
  max-width: 400px;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.notification-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.notification-text {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 4px;
}

.notification-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
}

.notification-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-update {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.95);
  color: #667eea;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-update:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.85);
}

.btn-close {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-close:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.3);
}
</style>
