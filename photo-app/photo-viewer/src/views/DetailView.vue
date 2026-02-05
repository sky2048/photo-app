<template>
  <div class="detail-view">
    <!-- 顶部区域 -->
    <div class="top-section">
      <div class="header-row">
        <div class="time-date">
          <div class="time">{{ currentTime }}</div>
          <div class="date">{{ currentDate }}</div>
        </div>
        <div class="page-title">详情</div>
      </div>
    </div>

    <!-- 图片展示区域 -->
    <div class="content-wrapper" 
         :style="{ transform: `translateX(${swipeOffset}px)`, transition: isSwiping ? 'none' : 'transform 0.3s ease' }">
      <div class="image-container"
           @touchstart="handleTouchStart"
           @touchmove="handleTouchMove"
           @touchend="handleTouchEnd">
        <transition :name="settingsStore.animationType" mode="out-in">
          <img 
            v-if="currentImage"
            :key="currentImageIndex"
            :src="currentImage" 
            :alt="articleDetail?.title"
            class="main-image"
          >
        </transition>
      </div>
      
      <!-- 预加载前后各1张图片 -->
      <div style="display: none;">
        <img v-if="preloadImages.prev" :src="preloadImages.prev" alt="preload">
        <img v-if="preloadImages.next" :src="preloadImages.next" alt="preload">
      </div>
      
      <!-- 页码指示器 -->
      <transition name="fade">
        <div v-if="!isTransitioning" class="page-indicator">
          {{ currentImageIndex + 1 }}/{{ totalImages }}
        </div>
      </transition>
    </div>

    <!-- 操作提示 -->
    <div class="tips">
      <span>上下滑动切换图片</span>
      <span class="separator">·</span>
      <span>右滑返回</span>
    </div>

    <!-- 底部导航 -->
    <nav class="bottom-nav">
      <router-link to="/" class="nav-item" :class="{ active: fromRoute.startsWith('/') && !fromRoute.startsWith('/random') && !fromRoute.startsWith('/settings') }">
        <div class="nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
        <div class="nav-label">主页</div>
      </router-link>
      <router-link to="/random" class="nav-item" :class="{ active: fromRoute.startsWith('/random') }">
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
      <router-link to="/settings" class="nav-item" :class="{ active: fromRoute.startsWith('/settings') }">
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
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDbStore } from '../stores/db'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const router = useRouter()
const dbStore = useDbStore()
const settingsStore = useSettingsStore()

const articleDetail = ref(null)
const currentImageIndex = ref(0)
const isTransitioning = ref(false)

// 获取来源页面，用于保持导航栏选中状态
const fromRoute = computed(() => {
  const back = router.options.history.state.back
  return back ? String(back) : '/'
})

// 时间和日期
const currentTime = ref('')
const currentDate = ref('')

// 滑动相关
const touchStartX = ref(0)
const touchStartY = ref(0)
const touchEndX = ref(0)
const touchEndY = ref(0)
const swipeOffset = ref(0)
const isSwiping = ref(false)

// 计算属性
const currentImage = computed(() => {
  if (!articleDetail.value?.images || articleDetail.value.images.length === 0) {
    return articleDetail.value?.thumbnail
  }
  return articleDetail.value.images[currentImageIndex.value]
})

const totalImages = computed(() => {
  return articleDetail.value?.images?.length || 1
})

// 预加载前后各1张图片
const preloadImages = computed(() => {
  if (!articleDetail.value?.images || articleDetail.value.images.length === 0) {
    return { prev: null, next: null }
  }
  
  const images = articleDetail.value.images
  const current = currentImageIndex.value
  
  return {
    prev: current >= 1 ? images[current - 1] : null,
    next: current < images.length - 1 ? images[current + 1] : null
  }
})

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

async function loadArticle() {
  const articleId = parseInt(route.params.id)
  articleDetail.value = await dbStore.getArticleDetail(articleId)
  currentImageIndex.value = 0
}

function goBack() {
  router.back()
}

function nextImage() {
  if (currentImageIndex.value < totalImages.value - 1) {
    isTransitioning.value = true
    currentImageIndex.value++
    
    setTimeout(() => {
      isTransitioning.value = false
    }, 400)
  }
}

function prevImage() {
  if (currentImageIndex.value > 0) {
    isTransitioning.value = true
    currentImageIndex.value--
    
    setTimeout(() => {
      isTransitioning.value = false
    }, 400)
  }
}

// 触摸滑动处理 - 支持上下切换图片和左滑退出
function handleTouchStart(e) {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
  touchEndX.value = e.touches[0].clientX
  touchEndY.value = e.touches[0].clientY
  isSwiping.value = false
  swipeOffset.value = 0
}

function handleTouchMove(e) {
  touchEndX.value = e.touches[0].clientX
  touchEndY.value = e.touches[0].clientY
  
  const deltaX = touchEndX.value - touchStartX.value
  const deltaY = touchEndY.value - touchStartY.value
  
  // 判断是横向还是纵向滑动
  if (!isSwiping.value && Math.abs(deltaX) > 10) {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      isSwiping.value = true
      // 只允许向右滑动（退出）
      if (deltaX > 0) {
        swipeOffset.value = deltaX
      }
    }
  }
  
  // 如果是横向滑动，更新偏移量
  if (isSwiping.value && deltaX > 0) {
    swipeOffset.value = deltaX
  }
}

function handleTouchEnd() {
  const deltaX = touchEndX.value - touchStartX.value
  const deltaY = touchEndY.value - touchStartY.value
  
  // 如果是横向滑动
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // 向右滑动超过 50px，退出详情页（降低阈值提高灵敏度）
    if (deltaX > 50) {
      router.back()
      return
    }
  } else {
    // 纵向滑动，切换图片
    const threshold = 80
    
    // 向上滑动，显示下一张
    if (deltaY < -threshold) {
      nextImage()
    }
    // 向下滑动，显示上一张
    else if (deltaY > threshold) {
      prevImage()
    }
  }
  
  // 重置
  swipeOffset.value = 0
  isSwiping.value = false
  touchStartX.value = 0
  touchStartY.value = 0
  touchEndX.value = 0
  touchEndY.value = 0
}

onMounted(() => {
  updateTime()
  setInterval(updateTime, 60000)
  loadArticle()
})
</script>

<style scoped>
.detail-view {
  height: 100vh;
  background: #4a5f5f;
  position: relative;
  overflow: hidden;
  width: 100%;
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

/* 时间和标题行 */
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

/* 内容包装器 */
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
  background: #4a5f5f;
  overflow: hidden;
}

/* 图片容器 */
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
}

.main-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  border-radius: clamp(12px, 3vw, 20px);
  object-fit: contain;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  background: #4a5f5f;
  will-change: transform, opacity;
}

/* 页码指示器 */
.page-indicator {
  padding: clamp(8px, 2vh, 12px) clamp(16px, 4vw, 24px);
  background: rgba(0, 0, 0, 0.4);
  border-radius: 24px;
  color: #ffffff;
  font-size: clamp(14px, 3.5vw, 20px);
  font-weight: 600;
  backdrop-filter: blur(10px);
  letter-spacing: 1px;
  margin-bottom: clamp(40px, 8vh, 60px);
}

/* 页码淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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

/* 1. 淡入淡出 + 缩放动画（默认）*/
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s ease;
}

.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.fade-scale-leave-to {
  opacity: 0;
  transform: scale(1.05);
}

.fade-scale-enter-to,
.fade-scale-leave-from {
  opacity: 1;
  transform: scale(1);
}

/* 2. 放大淡入效果 */
.zoom-fade-enter-active,
.zoom-fade-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.zoom-fade-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.zoom-fade-leave-to {
  opacity: 0;
  transform: scale(1.2);
}

.zoom-fade-enter-to,
.zoom-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

/* 3. 模糊淡入效果 */
.blur-fade-enter-active,
.blur-fade-leave-active {
  transition: all 0.3s ease;
}

.blur-fade-enter-from {
  opacity: 0;
  filter: blur(10px);
  transform: scale(0.98);
}

.blur-fade-leave-to {
  opacity: 0;
  filter: blur(10px);
  transform: scale(1.02);
}

.blur-fade-enter-to,
.blur-fade-leave-from {
  opacity: 1;
  filter: blur(0);
  transform: scale(1);
}

/* 4. 旋转淡入效果 */
.rotate-fade-enter-active,
.rotate-fade-leave-active {
  transition: all 0.35s ease-out;
}

.rotate-fade-enter-from {
  opacity: 0;
  transform: scale(0.9) rotate(5deg);
}

.rotate-fade-leave-to {
  opacity: 0;
  transform: scale(0.9) rotate(-5deg);
}

.rotate-fade-enter-to,
.rotate-fade-leave-from {
  opacity: 1;
  transform: scale(1) rotate(0deg);
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
