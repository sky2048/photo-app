<template>
  <div class="home-view">
    <!-- 顶部区域 -->
    <div class="top-section">
      <!-- 时间和搜索栏 -->
      <div class="header-row">
        <div class="time-date">
          <div class="time">{{ currentTime }}</div>
          <div class="date">{{ currentDate }}</div>
        </div>

        <div class="search-box">
          <input 
            v-model="searchKeyword" 
            type="text" 
            placeholder="EXPLORE"
            @keyup.enter="handleSearch"
          >
          <button class="search-btn" @click="handleSearch">
            🔍
          </button>
        </div>
      </div>

      <!-- 分类标签 -->
      <div class="category-tabs">
        <div 
          v-for="(cat, index) in categories" 
          :key="index"
          class="tab-item"
          :class="{ active: currentCategoryIndex === index }"
          @click="switchCategory(index)"
        >
          {{ index === 0 ? '全部' : cat.category }}
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div 
      class="content-container"
      :class="{ 'is-restoring': isRestoring }"
      @touchstart.passive="handleSwipeStart"
      @touchmove="handleSwipeMove"
      @touchend.passive="handleSwipeEnd"
    >
      <div 
        class="content-wrapper"
        :style="{ transform: `translateX(${-currentCategoryIndex * 100 + swipeOffset}%)` }"
      >
        <div 
          v-for="(cat, index) in categories" 
          :key="index"
          class="category-panel"
        >
          <div class="waterfall-container" @scroll="handleScroll(index)">
            <div class="waterfall-grid">
              <div 
                v-for="(article, articleIndex) in categoryArticles[index]" 
                :key="article.id"
                class="photo-card"
                @click="showDetail(article)"
              >
                <img 
                  :src="article.thumbnail" 
                  :alt="article.title" 
                  :loading="articleIndex < 6 ? 'eager' : 'lazy'"
                >
                <div class="photo-info">
                  <div class="photo-title">{{ article.title }}</div>
                  <div class="photo-category">{{ article.category || '未分类' }}</div>
                </div>
              </div>
            </div>
            
            <div v-if="categoryLoading[index]" class="loading">加载中...</div>
            <div v-if="!categoryHasMore[index] && categoryArticles[index]?.length > 0" class="no-more">
              没有更多了
            </div>
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
import { ref, onMounted, reactive, onActivated, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useDbStore } from '../stores/db'

// 定义组件名称，用于 keep-alive
defineOptions({
  name: 'HomeView'
})

const router = useRouter()
const dbStore = useDbStore()

const categories = ref([])
const currentCategoryIndex = ref(0)

// 使用 sessionStorage 保存滚动位置，更可靠
const SCROLL_KEY = 'home_scroll_position'
const isRestoring = ref(false) // 标记是否正在恢复滚动位置
const categoryArticles = reactive({})
const categoryLoading = reactive({})
const categoryHasMore = reactive({})
const categoryOffset = reactive({})
const limit = 20

const searchKeyword = ref('')
const scrollContainers = ref([])

// 滑动相关
let swipeStartX = 0
let swipeStartY = 0
const swipeOffset = ref(0)
let isSwiping = false

// 时间和日期
const currentTime = ref('')
const currentDate = ref('')

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

// 加载分类
async function loadCategories() {
  const cats = await dbStore.getCategories()
  
  // 构建新的分类列表：全部 + 其他分类
  const newCategories = [
    { category: '', count: 0 }, // 全部（空字符串表示全部）
    ...cats.filter(cat => cat.category) // 过滤掉空分类
  ]
  
  categories.value = newCategories
  
  // 初始化每个分类的数据
  newCategories.forEach((cat, index) => {
    categoryArticles[index] = []
    categoryLoading[index] = false
    categoryHasMore[index] = true
    categoryOffset[index] = 0
  })
  
  // 加载第一个分类的内容
  if (newCategories.length > 0) {
    loadCategoryArticles(0)
  }
}

// 切换分类
function switchCategory(index) {
  if (index === currentCategoryIndex.value) return
  
  currentCategoryIndex.value = index
  
  // 滚动分类标签，确保选中的标签可见
  setTimeout(() => {
    const tabsContainer = document.querySelector('.category-tabs')
    const activeTab = document.querySelectorAll('.tab-item')[index]
    if (tabsContainer && activeTab) {
      const containerWidth = tabsContainer.offsetWidth
      const tabLeft = activeTab.offsetLeft
      const tabWidth = activeTab.offsetWidth
      
      // 计算滚动位置，让选中的标签居中显示
      const scrollLeft = tabLeft - (containerWidth / 2) + (tabWidth / 2)
      tabsContainer.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      })
    }
  }, 0)
  
  // 如果该分类还没有加载过数据，则加载
  if (!categoryArticles[index] || categoryArticles[index].length === 0) {
    loadCategoryArticles(index)
  }
}

// 加载指定分类的文章
async function loadCategoryArticles(index) {
  if (categoryLoading[index] || !categoryHasMore[index]) return
  
  categoryLoading[index] = true
  
  const category = categories.value[index]?.category || ''
  const newArticles = await dbStore.getArticles(
    category,
    limit,
    categoryOffset[index]
  )
  
  if (newArticles.length === 0) {
    categoryHasMore[index] = false
  } else {
    if (!categoryArticles[index]) {
      categoryArticles[index] = []
    }
    categoryArticles[index].push(...newArticles)
    categoryOffset[index] += newArticles.length
  }
  
  categoryLoading[index] = false
}

// 搜索
async function handleSearch() {
  if (!searchKeyword.value.trim()) return
  // TODO: 实现搜索功能
}

// 显示详情
async function showDetail(article) {
  // 保存当前分类的滚动位置到 sessionStorage
  const containers = document.querySelectorAll('.waterfall-container')
  const currentContainer = containers[currentCategoryIndex.value]
  if (currentContainer) {
    sessionStorage.setItem(SCROLL_KEY, currentContainer.scrollTop.toString())
    sessionStorage.setItem('home_category_index', currentCategoryIndex.value.toString())
  }
  router.push({ name: 'detail', params: { id: article.id } })
}

// 左右滑动切换分类
function handleSwipeStart(e) {
  swipeStartX = e.touches[0].clientX
  swipeStartY = e.touches[0].clientY
  isSwiping = false
}

function handleSwipeMove(e) {
  const deltaX = e.touches[0].clientX - swipeStartX
  const deltaY = e.touches[0].clientY - swipeStartY
  
  // 判断是横向滑动还是纵向滑动
  if (!isSwiping && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
    isSwiping = true
  }
  
  if (isSwiping) {
    // 只在确定是横向滑动时才阻止默认行为
    if (e.cancelable) {
      e.preventDefault()
    }
    const maxOffset = 30 // 最大偏移百分比
    const offsetPercent = (deltaX / window.innerWidth) * 100
    swipeOffset.value = Math.max(-maxOffset, Math.min(maxOffset, offsetPercent))
  }
}

function handleSwipeEnd(e) {
  if (!isSwiping) {
    swipeOffset.value = 0
    return
  }
  
  const deltaX = e.changedTouches[0].clientX - swipeStartX
  const threshold = window.innerWidth * 0.25 // 25% 的屏幕宽度作为阈值
  
  if (Math.abs(deltaX) > threshold) {
    if (deltaX > 0 && currentCategoryIndex.value > 0) {
      // 向右滑动，切换到上一个分类
      switchCategory(currentCategoryIndex.value - 1)
    } else if (deltaX < 0 && currentCategoryIndex.value < categories.value.length - 1) {
      // 向左滑动，切换到下一个分类
      switchCategory(currentCategoryIndex.value + 1)
    }
  }
  
  swipeOffset.value = 0
  isSwiping = false
}

// 上下滚动加载更多
function handleScroll(index) {
  if (index !== currentCategoryIndex.value) return
  
  const container = event.target
  if (!container) return
  
  const scrollTop = container.scrollTop
  const scrollHeight = container.scrollHeight
  const clientHeight = container.clientHeight
  
  // 距离底部 500px 时开始加载
  if (scrollTop + clientHeight >= scrollHeight - 500) {
    loadCategoryArticles(index)
  }
}

onMounted(() => {
  updateTime()
  setInterval(updateTime, 60000) // 每分钟更新一次时间
  
  // 检查是否需要恢复滚动位置
  const savedPosition = sessionStorage.getItem(SCROLL_KEY)
  const savedCategoryIndex = sessionStorage.getItem('home_category_index')
  
  if (savedPosition && savedCategoryIndex) {
    isRestoring.value = true
    currentCategoryIndex.value = parseInt(savedCategoryIndex)
  }
  
  loadCategories()
  
  // 恢复滚动位置
  if (savedPosition && savedCategoryIndex) {
    // 使用 requestAnimationFrame 确保在下一帧恢复
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const containers = document.querySelectorAll('.waterfall-container')
        const targetContainer = containers[parseInt(savedCategoryIndex)]
        if (targetContainer) {
          targetContainer.scrollTop = parseInt(savedPosition)
        }
        // 清除保存的位置
        sessionStorage.removeItem(SCROLL_KEY)
        sessionStorage.removeItem('home_category_index')
        // 立即显示内容
        isRestoring.value = false
      })
    })
  }
})

// 组件激活时恢复滚动位置（keep-alive 场景）
onActivated(() => {
  const savedPosition = sessionStorage.getItem(SCROLL_KEY)
  const savedCategoryIndex = sessionStorage.getItem('home_category_index')
  
  if (savedPosition && savedCategoryIndex) {
    isRestoring.value = true
    currentCategoryIndex.value = parseInt(savedCategoryIndex)
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const containers = document.querySelectorAll('.waterfall-container')
        const targetContainer = containers[parseInt(savedCategoryIndex)]
        if (targetContainer) {
          targetContainer.scrollTop = parseInt(savedPosition)
        }
        sessionStorage.removeItem(SCROLL_KEY)
        sessionStorage.removeItem('home_category_index')
        isRestoring.value = false
      })
    })
  }
})

// 离开页面前保存滚动位置
onBeforeRouteLeave((to, from, next) => {
  if (to.name === 'detail') {
    const containers = document.querySelectorAll('.waterfall-container')
    const currentContainer = containers[currentCategoryIndex.value]
    if (currentContainer) {
      sessionStorage.setItem(SCROLL_KEY, currentContainer.scrollTop.toString())
      sessionStorage.setItem('home_category_index', currentCategoryIndex.value.toString())
    }
  }
  next()
})
</script>

<style scoped>
.home-view {
  height: 100vh;
  position: relative;
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

/* 头部行 - 时间和搜索 */
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

/* 时间和日期 */
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

/* 搜索框容器 */
.search-box {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  padding: 4px 4px 4px 16px;
  gap: 8px;
  flex: 1;
  max-width: 280px;
  margin-left: 16px;
}

.search-box input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  font-weight: 500;
  outline: none;
  color: #ffffff;
  letter-spacing: 0.5px;
  padding: 8px 0;
  min-width: 0;
}

.search-box input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

/* 搜索按钮 */
.search-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  color: rgba(255, 255, 255, 0.8);
  padding: 0;
  margin: 0;
}

.search-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.search-btn:active {
  transform: scale(0.95);
}

/* 分类标签 */
.category-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 0 0;
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.tab-item {
  padding: 8px 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;
}

.tab-item.active {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

/* 内容容器 */
.content-container {
  position: absolute;
  top: 120px;
  left: 0;
  right: 0;
  bottom: 60px;
  overflow: hidden;
}

.content-container.is-restoring {
  visibility: hidden;
}

.content-wrapper {
  display: flex;
  height: 100%;
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
}

.category-panel {
  min-width: 100%;
  width: 100%;
  height: 100%;
  flex-shrink: 0;
}

/* 瀑布流容器 */
.waterfall-container {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.waterfall-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 16px;
}

/* 图片卡片 */
.photo-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  background: #3a4a4a;
}

.photo-card:active {
  transform: scale(0.98);
}

.photo-card img {
  width: 100%;
  height: auto;
  display: block;
  aspect-ratio: 3/4;
  object-fit: cover;
}

.photo-info {
  padding: 12px;
  background: #3a4a4a;
}

.photo-title {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.photo-category {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 加载状态 */
.loading, .no-more {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
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

/* 响应式 */
@media (min-width: 768px) {
  .waterfall-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .waterfall-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
