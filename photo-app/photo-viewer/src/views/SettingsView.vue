<template>
  <div class="settings-view">
    <!-- 顶部区域 -->
    <div class="top-section">
      <div class="header-row">
        <div class="time-date">
          <div class="time">{{ currentTime }}</div>
          <div class="date">{{ currentDate }}</div>
        </div>
        <div class="page-title">设置</div>
      </div>
    </div>

    <div class="settings-container">
      <div class="settings-section">
        <h3>数据管理</h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">更新数据库</div>
            <div class="setting-desc">从 GitHub 重新下载最新数据库</div>
          </div>
          <button 
            class="btn-primary" 
            @click="handleUpdateDb"
            :disabled="updating"
          >
            {{ updating ? '更新中...' : '更新' }}
          </button>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">数据库地址</div>
            <div class="setting-desc">{{ dbUrl }}</div>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">数据库状态</div>
            <div class="setting-desc">
              {{ dbStore.isInitialized ? '✅ 已初始化' : '❌ 未初始化' }}
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>显示设置</h3>
        
        <div class="setting-item-full">
          <div class="setting-info">
            <div class="setting-title">图片切换动画</div>
            <div class="setting-desc">选择图片切换时的动画效果</div>
          </div>
          <div class="animation-options">
            <div 
              v-for="anim in settingsStore.animationTypes" 
              :key="anim.name"
              class="animation-option"
              :class="{ active: settingsStore.animationType === anim.name }"
              @click="selectAnimation(anim.name)"
            >
              <div class="option-label">{{ anim.label }}</div>
              <div class="option-desc">{{ anim.desc }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>关于</h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">应用名称</div>
            <div class="setting-desc">写真图库</div>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">版本</div>
            <div class="setting-desc">1.0.0</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部导航 -->
    <nav class="bottom-nav">
      <router-link to="/" class="nav-item">
        <div class="nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
        <div class="nav-label">主页</div>
      </router-link>
      <router-link to="/random" class="nav-item">
        <div class="nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 3 21 3 21 8"></polyline>
            <line x1="4" y1="20" x2="21" y2="3"></line>
            <polyline points="21 16 21 21 16 21"></polyline>
            <line x1="15" y1="15" x2="21" y2="21"></line>
            <line x1="4" y1="4" x2="9" y2="9"></line>
          </svg>
        </div>
        <div class="nav-label">随机</div>
      </router-link>
      <router-link to="/settings" class="nav-item">
        <div class="nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m0-18a11 11 0 0 1 0 22 11 11 0 0 1 0-22"></path>
            <path d="M16.24 7.76l-4.24 4.24m0 0l-4.24 4.24m4.24-4.24l4.24 4.24m-4.24-4.24l-4.24-4.24"></path>
          </svg>
        </div>
        <div class="nav-label">设置</div>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useDbStore } from '../stores/db'
import { useSettingsStore } from '../stores/settings'

const dbStore = useDbStore()
const settingsStore = useSettingsStore()
const updating = ref(false)

// 时间和日期
const currentTime = ref('')
const currentDate = ref('')
let timeInterval = null

function updateTime() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}`
  
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const month = months[now.getMonth()]
  const day = String(now.getDate()).padStart(2, '0')
  const year = now.getFullYear()
  currentDate.value = `${year}年${month}${day}日`
}

const dbUrl = computed(() => {
  return 'https://cdn.jsdelivr.net/gh/sky2048/photo-app@master/photo.db'
})

async function handleUpdateDb() {
  if (updating.value) return
  
  if (!confirm('确定要更新数据库吗？这将下载最新的数据。')) {
    return
  }
  
  updating.value = true
  
  try {
    const success = await dbStore.updateDatabase()
    if (success) {
      alert('数据库更新成功！')
    } else {
      alert('数据库更新失败，请重试')
    }
  } catch (error) {
    alert('更新失败: ' + error.message)
  } finally {
    updating.value = false
  }
}

function selectAnimation(type) {
  settingsStore.setAnimationType(type)
}

onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 60000)
})

onBeforeUnmount(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.settings-view {
  height: 100vh;
  background: #4a5f5f;
  overflow: hidden;
}

/* 顶部区域 */
.top-section {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #4a5f5f;
  z-index: 10;
  padding: 12px 16px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.time-date {
  flex-shrink: 0;
}

.time {
  font-size: 32px;
  font-weight: 300;
  color: #ffffff;
  letter-spacing: 1px;
  line-height: 1;
}

.date {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.page-title {
  font-size: 24px;
  font-weight: 500;
  color: #ffffff;
  letter-spacing: 0.5px;
  padding-top: 8px;
}

/* 设置容器 */
.settings-container {
  position: absolute;
  top: 80px;
  left: 0;
  right: 0;
  bottom: 60px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px;
}

.settings-section {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.settings-section h3 {
  font-size: 18px;
  margin-bottom: 15px;
  color: #ffffff;
  font-weight: 600;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item-full {
  padding: 15px 0;
}

.setting-info {
  flex: 1;
}

.setting-title {
  font-size: 16px;
  color: #ffffff;
  margin-bottom: 5px;
  font-weight: 500;
}

.setting-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  word-break: break-all;
}

/* 动画选项 */
.animation-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 15px;
}

.animation-option {
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.animation-option:hover {
  background: rgba(255, 255, 255, 0.12);
}

.animation-option.active {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.option-label {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 4px;
}

.option-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

.animation-option.active .option-desc {
  color: rgba(255, 255, 255, 0.8);
}

.btn-primary {
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: rgba(255, 255, 255, 0.25);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.4);
  cursor: not-allowed;
}

/* 底部导航 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  background: rgba(45, 61, 61, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: clamp(10px, 2vh, 16px) 0 calc(clamp(10px, 2vh, 16px) + env(safe-area-inset-bottom));
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(4px, 1vh, 8px);
  text-decoration: none;
  color: rgba(255, 255, 255, 0.5);
  transition: all 0.3s ease;
  padding: clamp(6px, 1.5vh, 10px) clamp(16px, 4vw, 24px);
  position: relative;
}

.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 3px;
  background: #ffffff;
  transition: width 0.3s ease;
  border-radius: 0 0 2px 2px;
}

.nav-item.router-link-active {
  color: #ffffff;
}

.nav-item.router-link-active::before {
  width: 70%;
}

.nav-icon {
  font-size: clamp(20px, 5vw, 24px);
  transition: transform 0.3s ease;
}

.nav-item.router-link-active .nav-icon {
  transform: scale(1.15);
}

.nav-item.router-link-active .nav-icon svg {
  stroke-width: 2.5;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.5));
}

.nav-label {
  font-size: clamp(10px, 2.5vw, 12px);
  font-weight: 500;
  letter-spacing: 0.5px;
}

.nav-item.router-link-active .nav-label {
  font-weight: 700;
}
</style>
