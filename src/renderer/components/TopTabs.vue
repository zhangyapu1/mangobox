<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const tabs = [
  { key: 'home', label: '首页', icon: '🏠' },
  { key: 'live', label: '直播', icon: '📺' },
  { key: 'search', label: '搜索', icon: '🔍' },
  { key: 'favorites', label: '收藏', icon: '❤️' },
  { key: 'history', label: '历史', icon: '⏰' },
  { key: 'settings', label: '设置', icon: '⚙️' }
]

const currentTab = computed(() => {
  const path = route.path
  const tab = tabs.find(t => path.startsWith('/' + t.key))
  return tab?.key || 'home'
})

const handleTabClick = (key: string) => {
  router.push(`/${key}`)
}

const minimizeWindow = () => {
  window.electronAPI.minimizeWindow()
}

const maximizeWindow = () => {
  window.electronAPI.maximizeWindow()
}

const closeWindow = () => {
  window.electronAPI.closeWindow()
}
</script>

<template>
  <header class="top-tabs">
    <div class="tabs-container">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: currentTab === tab.key }"
        @click="handleTabClick(tab.key)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </div>
    </div>
    <div class="window-controls">
      <button class="control-btn" @click="minimizeWindow">─</button>
      <button class="control-btn" @click="maximizeWindow">□</button>
      <button class="control-btn close" @click="closeWindow">✕</button>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.top-tabs {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 50px;
  background-color: #0f3460;
  border-bottom: 1px solid #1a1a2e;
  -webkit-app-region: drag;
}

.tabs-container {
  display: flex;
  height: 100%;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 0 20px;
  cursor: pointer;
  -webkit-app-region: no-drag;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  &.active {
    background-color: #e94560;
    border-bottom: 3px solid #e94560;
  }
}

.tab-icon {
  margin-right: 8px;
  font-size: 16px;
}

.tab-label {
  font-size: 14px;
  color: #ffffff;
}

.window-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 40px;
  height: 50px;
  border: none;
  background: transparent;
  color: #ffffff;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  &.close:hover {
    background-color: #e94560;
  }
}
</style>
