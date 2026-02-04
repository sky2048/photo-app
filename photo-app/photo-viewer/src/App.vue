<template>
  <div class="app">
    <div v-if="loading" class="init-loading">
      <div class="spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>
    <div v-else-if="error" class="init-error">
      <p>❌ {{ error }}</p>
      <button @click="retry">重试</button>
    </div>
    <router-view v-else v-slot="{ Component }">
      <keep-alive include="HomeView,RandomView">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useDbStore } from './stores/db'

const dbStore = useDbStore()
const loading = ref(true)
const error = ref('')
const loadingMessage = ref('正在初始化数据库...')

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

.init-error button {
  padding: 10px 30px;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
}
</style>
