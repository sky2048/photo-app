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
    <router-view v-else v-slot="{ Component }">
      <keep-alive include="HomeView,RandomView">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useDbStore } from './stores/db'

const dbStore = useDbStore()
const loading = ref(true)
const error = ref('')
const loadingMessage = ref('正在初始化数据库...')

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
    }, 500)
  } catch (e) {
    console.error('初始化失败:', e)
    error.value = e.message || '数据库初始化失败'
    loading.value = false
  }
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
</style>
