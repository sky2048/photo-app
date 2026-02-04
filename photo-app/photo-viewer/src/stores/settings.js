import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // 动画类型
  const animationType = ref(localStorage.getItem('animationType') || 'fade-scale')
  
  // 可用的动画类型
  const animationTypes = [
    { name: 'fade-scale', label: '缩放', desc: '淡入淡出 + 轻微缩放' },
    { name: 'zoom-fade', label: '放大', desc: '从小放大到正常大小' },
    { name: 'blur-fade', label: '模糊', desc: '从模糊到清晰的渐变' },
    { name: 'rotate-fade', label: '旋转', desc: '轻微旋转 + 缩放效果' }
  ]
  
  // 设置动画类型
  function setAnimationType(type) {
    animationType.value = type
    localStorage.setItem('animationType', type)
  }
  
  return {
    animationType,
    animationTypes,
    setAnimationType
  }
})
