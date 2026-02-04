<template>
  <div class="random-view">
    <!-- 顶部区域 -->
    <div class="top-section">
      <div class="header-row">
        <div class="time-date">
          <div class="time">{{ currentTime }}</div>
          <div class="date">{{ currentDate }}</div>
        </div>
        <div class="page-title">随机</div>
      </div>
    </div>

    <!-- 图片展示区域 -->
    <div 
      v-if="article"
      class="content-wrapper"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div class="image-container" @click="showDetail">
        <transition name="slide-fade" mode="out-in">
          <img 
            v-if="article"
            :key="article.id"
            :src="article.images?.[1] || article.thumbnail" 
            :alt="article.title"
          >
        </transition>
      </div>
      
      <!-- 信息卡片 -->
      <transition name="fade">
        <div v-if="!isTransitioning" class="info-card" @click="showDetail">
          <div class="info-content">
            <h2 class="title">{{ article.title }}</h2>
            <p class="subtitle">{{ article.category }}</p>
          </div>
          <div class="arrow-icon">›</div>
        </div>
      </transition>
    </div>
    
    <div v-else class="loading">加载中...</div>

    <!-- 操作提示 -->
    <div class="tips">
      <span>左滑换一张</span>
      <span class="separator">·</span>
      <span>点击查看详情</span>
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
      <router-link to="/random" class="nav-item active">
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
import { ref, onMounted, onActivated, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useDbStore } from '../stores/db'

// 定义组件名称，用于 keep-alive
defineOptions({
  name: 'RandomView'
})

const router = useRouter()
const dbStore = useDbStore()

const article = ref(null)
const isInitialized = ref(false) // 标记是否已初始化
const isTransitioning = ref(false) // 动画过渡状态

// 时间和日期
const currentTime = ref('')
const currentDate = ref('')
let timeInterval = null

let touchStartX = 0
let touchStartY = 0

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

async function loadRandomArticle() {
  isTransitioning.value = true
  
  const randomArticle = await dbStore.getRandomArticle()
  if (randomArticle) {
    // 获取完整的文章详情（包含图片列表）
    article.value = await dbStore.getArticleDetail(randomArticle.id)
  }
  
  setTimeout(() => {
    isTransitioning.value = false
  }, 400)
}

function handleTouchStart(e) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function handleTouchMove(e) {
  // 可以添加滑动预览效果
}

function handleTouchEnd(e) {
  const touchEndX = e.changedTouches[0].clientX
  const touchEndY = e.changedTouches[0].clientY
  const diffX = touchEndX - touchStartX
  const diffY = touchEndY - touchStartY
  
  // 左右滑动切换
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
    if (diffX > 0) {
      // 向右滑动 - 上一个（或者不做处理）
    } else {
      // 向左滑动 - 下一个
      loadRandomArticle()
    }
  }
}

function showDetail() {
  if (!article.value) return
  router.push(`/detail/${article.value.id}`)
}

onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 60000)
  
  // 只在首次加载时获取随机文章
  if (!isInitialized.value) {
    loadRandomArticle()
    isInitialized.value = true
  }
})

// keep-alive 激活时不重新加载
onActivated(() => {
  // 如果已经有内容，不重新加载
  if (!article.value && !isInitialized.value) {
    loadRandomArticle()
    isInitialized.value = true
  }
})

onBeforeUnmount(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.random-view {
  height: 100vh;
  background: #3d4f4f;
  overflow: hidden;
}

/* 顶部区域 */
.top-section {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #3d4f4f;
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

/* 内容包装器 - 参考详情页 */
.content-wrapper {
  position: fixed;
  top: 80px;
  left: 0;
  right: 0;
  bottom: clamp(50px, 10vh, 70px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #3d4f4f;
  overflow: hidden;
}

/* 图片容器 - 参考详情页 */
.image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  touch-action: pan-y;
  perspective: 1200px;
  padding: clamp(8px, 2vh, 20px) clamp(12px, 3vw, 20px);
  overflow: hidden;
  position: relative;
  cursor: pointer;
}

/* 信息卡片 - 在content-wrapper内部，参考page-indicator */
.info-card {
  background: rgba(45, 61, 61, 0.95);
  padding: clamp(16px, 3vh, 20px);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: blur(10px);
  margin: 0 clamp(20px, 5vw, 40px) clamp(40px, 8vh, 60px);
  max-width: 85%;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}

.info-card:active {
  transform: scale(0.98);
  background: rgba(45, 61, 61, 1);
}

.image-container img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: clamp(12px, 3vw, 20px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  background: #3d4f4f;
  will-change: transform, opacity;
}

.info-content {
  flex: 1;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.subtitle {
  font-size: 14px;
  color: #8a9a9a;
  margin: 0;
}

.arrow-icon {
  font-size: 32px;
  color: #8a9a9a;
  margin-left: 16px;
}

.loading {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a9a9a;
  font-size: 16px;
}

/* 操作提示 */
.tips {
  position: fixed;
  bottom: clamp(60px, 12vh, 80px);
  left: 0;
  right: 0;
  text-align: center;
  font-size: clamp(10px, 2.5vw, 12px);
  color: rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  z-index: 90;
  letter-spacing: 0.5px;
}

.tips .separator {
  margin: 0 8px;
  opacity: 0.5;
}

/* 侧滑动画 - 从右侧滑入 */
.slide-fade-enter-active {
  transition: all 0.4s ease;
}

.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-fade-enter-to,
.slide-fade-leave-from {
  transform: translateX(0);
  opacity: 1;
}

/* 信息卡片淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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

.nav-item.active {
  color: #ffffff;
}

.nav-item.active::before {
  width: 70%;
}

.nav-icon {
  font-size: clamp(20px, 5vw, 24px);
  transition: transform 0.3s ease;
}

.nav-item.active .nav-icon {
  transform: scale(1.15);
}

.nav-item.active .nav-icon svg {
  stroke-width: 2.5;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.5));
}

.nav-label {
  font-size: clamp(10px, 2.5vw, 12px);
  font-weight: 500;
  letter-spacing: 0.5px;
}

.nav-item.active .nav-label {
  font-weight: 700;
}
</style>
