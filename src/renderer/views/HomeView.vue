<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(true)
const categories = ref<any[]>([])
const featuredVideos = ref<any[]>([])
const selectedCategory = ref('')

onMounted(async () => {
  await loadHomeContent()
})

const loadHomeContent = async () => {
  loading.value = true
  try {
    // Check if source is loaded
    const source = await window.electronAPI.getSource()
    if (!source) {
      // Load default source
      await window.electronAPI.loadSource('https://raw.githubusercontent.com/FGBLH/GHK/main/海豚py.json')
    }

    // Get home content
    const result = await window.electronAPI.getHomeContent()
    categories.value = result.categories || []
    featuredVideos.value = result.list || []

    if (categories.value.length > 0) {
      selectedCategory.value = categories.value[0].type_id
    }
  } catch (error) {
    console.error('Failed to load home content:', error)
  } finally {
    loading.value = false
  }
}

const goDetail = (vodId: string) => {
  const activeSite = window.electronAPI.getActiveSite()
  if (activeSite) {
    router.push(`/detail/${activeSite.key}/${vodId}`)
  }
}

const loadCategory = async (categoryId: string) => {
  selectedCategory.value = categoryId
  loading.value = true
  try {
    const activeSite = await window.electronAPI.getActiveSite()
    if (activeSite) {
      const result = await window.electronAPI.getCategoryList(activeSite.key, categoryId, 1)
      featuredVideos.value = result.list || []
    }
  } catch (error) {
    console.error('Failed to load category:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="home-view">
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <template v-else>
      <!-- Category Tabs -->
      <div class="category-tabs" v-if="categories.length > 0">
        <div
          v-for="cat in categories"
          :key="cat.type_id"
          class="category-tab"
          :class="{ active: selectedCategory === cat.type_id }"
          @click="loadCategory(cat.type_id)"
        >
          {{ cat.type_name }}
        </div>
      </div>

      <!-- Video Grid -->
      <div class="video-grid" v-if="featuredVideos.length > 0">
        <div
          v-for="video in featuredVideos"
          :key="video.vod_id"
          class="video-card"
          @click="goDetail(video.vod_id)"
        >
          <div class="card-cover">
            <img :src="video.vod_pic" :alt="video.vod_name" loading="lazy" />
            <div v-if="video.vod_remarks" class="card-remarks">{{ video.vod_remarks }}</div>
          </div>
          <div class="card-info">
            <h3 class="card-title">{{ video.vod_name }}</h3>
            <div v-if="video.vod_year" class="card-year">{{ video.vod_year }}</div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="empty-icon">📺</div>
        <p>没有找到视频内容</p>
        <p class="empty-hint">请在设置中添加源</p>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.home-view {
  padding: 20px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #0f3460;
  border-top-color: #e94560;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.category-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.category-tab {
  padding: 8px 16px;
  background-color: #0f3460;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s;

  &:hover {
    background-color: #1a4a7a;
  }

  &.active {
    background-color: #e94560;
  }
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

.video-card {
  background-color: #0f3460;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  }
}

.card-cover {
  position: relative;
  aspect-ratio: 2/3;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.card-remarks {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: #e94560;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.card-info {
  padding: 10px;
}

.card-title {
  font-size: 14px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 5px;
}

.card-year {
  font-size: 12px;
  color: #888;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #666;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-hint {
  margin-top: 10px;
  font-size: 14px;
  color: #888;
}
</style>
