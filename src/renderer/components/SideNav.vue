<script setup lang="ts">
import { ref } from 'vue'

const currentCategory = ref('')
const categories = [
  { key: 'movie', label: '电影', icon: '🎬' },
  { key: 'tv', label: '电视剧', icon: '📺' },
  { key: 'anime', label: '动漫', icon: '🎌' },
  { key: 'variety', label: '综艺', icon: '🎤' },
  { key: 'documentary', label: '纪录片', icon: '📹' },
  { key: 'kids', label: '少儿', icon: '👶' }
]

const handleCategoryClick = (key: string) => {
  currentCategory.value = key
}
</script>

<template>
  <aside class="side-nav">
    <div class="nav-header">
      <h3>分类</h3>
    </div>
    <div class="nav-items">
      <div class="nav-item" v-for="cat in categories" :key="cat.key"
        :class="{ active: currentCategory === cat.key }"
        @click="handleCategoryClick(cat.key)">
        <span class="nav-icon">{{ cat.icon }}</span>
        <span class="nav-label">{{ cat.label }}</span>
      </div>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.side-nav {
  width: 200px;
  background-color: #1a1a2e;
  border-right: 1px solid #0f3460;
  display: flex;
  flex-direction: column;
}

.nav-header {
  padding: 20px;
  border-bottom: 1px solid #0f3460;

  h3 {
    color: #ffffff;
    font-size: 16px;
    font-weight: 500;
  }
}

.nav-items {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  &.active {
    background-color: #0f3460;
    border-left: 3px solid #e94560;
  }
}

.nav-icon {
  margin-right: 12px;
  font-size: 18px;
}

.nav-label {
  font-size: 14px;
  color: #ffffff;
}
</style>
