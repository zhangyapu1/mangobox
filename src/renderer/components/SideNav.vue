<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentCategory = ref('')
const categories = ref<any[]>([])
const loading = ref(true)

// Category icons mapping
const categoryIcons: Record<string, string> = {
  '电影': '🎬', '电影片': '🎬', '动作片': '🎬', '喜剧片': '😂', '爱情片': '💕',
  '科幻片': '🚀', '恐怖片': '👻', '剧情片': '🎭', '战争片': '⚔️', '记录片': '📹',
  '动画片': '🎬', '预告片': '🎬', '伦理片': '🔞',
  '电视剧': '📺', '连续剧': '📺', '国产剧': '🇨🇳', '香港剧': '🇭🇰', '韩国剧': '🇰🇷',
  '欧美剧': '🌍', '台湾剧': '🇹🇼', '日本剧': '🇯🇵', '海外剧': '🌏', '泰国剧': '🇹🇭',
  '综艺': '🎤', '综艺片': '🎤', '大陆综艺': '🎤', '港台综艺': '🎤', '日韩综艺': '🎤', '欧美综艺': '🎤',
  '动漫': '🎌', '动漫片': '🎌', '国产动漫': '🎌', '日韩动漫': '🎌', '欧美动漫': '🎌',
  '港台动漫': '🎌', '海外动漫': '🎌',
  '少儿': '👶', '体育': '⚽', '足球': '⚽', '篮球': '🏀', '网球': '🎾',
  '新闻资讯': '📰', '短剧': '📱', 'AI漫剧': '🤖'
}

onMounted(async () => {
  await loadCategories()
})

const loadCategories = async () => {
  loading.value = true
  try {
    // Get home content which includes categories
    const result = await window.electronAPI.getHomeContent()
    if (result.categories && result.categories.length > 0) {
      categories.value = result.categories.map((cat: any) => ({
        key: cat.type_id,
        label: cat.type_name,
        icon: categoryIcons[cat.type_name] || '📁'
      }))
    }
  } catch (error) {
    console.error('Failed to load categories:', error)
  } finally {
    loading.value = false
  }
}

const handleCategoryClick = (key: string | number) => {
  currentCategory.value = String(key)
  router.push(`/category?key=${key}`)
}
</script>

<template>
  <aside class="side-nav">
    <div class="nav-header">
      <h3>分类</h3>
    </div>
    <div class="nav-items">
      <div v-if="loading" class="loading">加载中...</div>
      <div
        v-for="cat in categories"
        :key="cat.key"
        class="nav-item"
        :class="{ active: currentCategory === String(cat.key) }"
        @click="handleCategoryClick(cat.key)"
      >
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

.loading {
  padding: 20px;
  text-align: center;
  color: #666;
  font-size: 14px;
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
