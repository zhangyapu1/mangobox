<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const videos = ref<any[]>([])
const categoryName = ref('')
const currentPage = ref(1)
const totalPages = ref(1)

onMounted(async () => {
  await loadCategoryContent()
})

watch(() => route.query.key, async () => {
  if (route.query.key) {
    currentPage.value = 1
    await loadCategoryContent()
  }
})

const loadCategoryContent = async () => {
  loading.value = true
  error.value = ''
  try {
    const categoryId = route.query.key as string
    if (!categoryId) {
      error.value = '未选择分类'
      return
    }

    const activeSite = await window.electronAPI.getActiveSite()
    if (!activeSite) {
      error.value = '未选择视频源'
      return
    }

    const result = await window.electronAPI.getCategoryList(activeSite.key, categoryId, currentPage.value)
    videos.value = result.list || []
    totalPages.value = result.pageCount || 1

    // Get category name from the categories list
    const homeResult = await window.electronAPI.getHomeContent()
    const category = homeResult.categories?.find((c: any) => String(c.type_id) === String(categoryId))
    categoryName.value = category?.type_name || '分类'
  } catch (err: any) {
    console.error('Failed to load category:', err)
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const goDetail = async (vodId: string) => {
  const activeSite = await window.electronAPI.getActiveSite()
  if (activeSite) {
    router.push(`/detail/${activeSite.key}/${vodId}`)
  }
}

const nextPage = async () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    await loadCategoryContent()
  }
}

const prevPage = async () => {
  if (currentPage.value > 1) {
    currentPage.value--
    await loadCategoryContent()
  }
}
</script>

<template>
  <div class="category-view">
    <div class="category-header">
      <h1>{{ categoryName }}</h1>
      <div class="pagination">
        <button @click="prevPage" :disabled="currentPage <= 1">上一页</button>
        <span>{{ currentPage }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage >= totalPages">下一页</button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="loadCategoryContent">重试</button>
    </div>

    <div v-else-if="videos.length > 0" class="video-grid">
      <div
        v-for="video in videos"
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

    <div v-else class="empty-state">
      <p>没有找到视频</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.category-view {
  padding: 20px;
  color: #ffffff;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h1 {
    font-size: 24px;
    font-weight: 500;
  }
}

.pagination {
  display: flex;
  align-items: center;
  gap: 15px;

  button {
    padding: 8px 16px;
    background-color: #0f3460;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover:not(:disabled) {
      background-color: #1a4a7a;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  span {
    font-size: 14px;
    color: #888;
  }
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

.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #e94560;

  button {
    margin-top: 15px;
    padding: 8px 16px;
    background-color: #e94560;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
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
  text-align: center;
  padding: 60px 20px;
  color: #666;
}
</style>
