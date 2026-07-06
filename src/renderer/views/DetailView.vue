<script setup lang="ts">
import { ref, watch, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const videoInfo = ref<any>(null)
const selectedSource = ref(0)
const selectedEpisode = ref(0)
const isFavorite = ref(false)

// Inject player function from App.vue
const playVideo = inject<(url: string, title: string, episodes?: Array<{ name: string; url: string }>, episodeIndex?: number) => void>('playVideo')

onMounted(async () => {
  await loadDetail()
})

// Watch for route param changes
watch(() => route.params.id, async () => {
  if (route.params.id) {
    await loadDetail()
  }
})

const loadDetail = async () => {
  loading.value = true
  error.value = ''
  try {
    const { siteKey, id } = route.params
    if (!siteKey || !id) {
      error.value = '缺少必要参数'
      return
    }

    videoInfo.value = await window.electronAPI.getDetail(siteKey as string, id as string)

    if (videoInfo.value) {
      isFavorite.value = await window.electronAPI.isFavorite(siteKey as string, id as string)
      await window.electronAPI.addHistory(
        siteKey as string,
        id as string,
        videoInfo.value.name,
        videoInfo.value.pic
      )
    }
  } catch (err: any) {
    console.error('Failed to load detail:', err)
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const toggleFavorite = async () => {
  if (!videoInfo.value) return
  const { siteKey, id } = route.params
  if (isFavorite.value) {
    await window.electronAPI.removeFavorite(siteKey as string, id as string)
  } else {
    await window.electronAPI.addFavorite(
      siteKey as string, id as string,
      videoInfo.value.name, videoInfo.value.pic, videoInfo.value.remarks
    )
  }
  isFavorite.value = !isFavorite.value
}

const playEpisode = async (sourceIndex: number, episodeIndex: number) => {
  if (!videoInfo.value?.playSources) return

  selectedSource.value = sourceIndex
  selectedEpisode.value = episodeIndex

  const source = videoInfo.value.playSources[sourceIndex]
  if (!source?.episodes) return

  const episode = source.episodes[episodeIndex]
  if (!episode) return

  // Update history
  const { siteKey, id } = route.params
  await window.electronAPI.addHistory(
    siteKey as string, id as string,
    videoInfo.value.name, videoInfo.value.pic,
    episode.name, episode.url
  )

  // Get the site API URL for Referer
  const activeSite = await window.electronAPI.getActiveSite()
  const referer = activeSite?.api ? new URL(activeSite.api).origin + '/' : ''

  // Use fullscreen player
  if (playVideo) {
    const episodes = source.episodes.map((ep: any) => ({ name: ep.name, url: ep.url }))
    playVideo(
      episode.url,
      videoInfo.value.name,
      episodes,
      episodeIndex,
      referer,
      videoInfo.value  // Pass full detail for overlay
    )
  }
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="detail-view">
    <button class="back-btn" @click="goBack">← 返回</button>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="loadDetail">重试</button>
    </div>

    <template v-else-if="videoInfo">
      <div class="video-header">
        <div class="video-cover">
          <img :src="videoInfo.pic" :alt="videoInfo.name" />
        </div>
        <div class="video-info">
          <h1 class="video-title">{{ videoInfo.name }}</h1>
          <div class="video-meta">
            <span v-if="videoInfo.year" class="meta-item">{{ videoInfo.year }}</span>
            <span v-if="videoInfo.area" class="meta-item">{{ videoInfo.area }}</span>
            <span v-if="videoInfo.type" class="meta-item">{{ videoInfo.type }}</span>
          </div>
          <div v-if="videoInfo.director" class="video-detail">
            <span class="label">导演:</span> {{ videoInfo.director }}
          </div>
          <div v-if="videoInfo.actor" class="video-detail">
            <span class="label">主演:</span> {{ videoInfo.actor }}
          </div>
          <div class="video-actions">
            <button class="action-btn" :class="{ active: isFavorite }" @click="toggleFavorite">
              {{ isFavorite ? '❤️ 已收藏' : '🤍 收藏' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="videoInfo.content" class="video-content">
        <h3>简介</h3>
        <p>{{ videoInfo.content }}</p>
      </div>

      <!-- Play Sources -->
      <div class="play-sources" v-if="videoInfo.playSources && videoInfo.playSources.length > 0">
        <div class="source-tabs">
          <div
            v-for="(source, index) in videoInfo.playSources"
            :key="index"
            class="source-tab"
            :class="{ active: selectedSource === index }"
            @click="selectedSource = index"
          >
            {{ source.name }}
          </div>
        </div>

        <div class="episode-grid" v-if="videoInfo.playSources[selectedSource]?.episodes">
          <div
            v-for="(episode, index) in videoInfo.playSources[selectedSource].episodes"
            :key="index"
            class="episode-item"
            :class="{ active: selectedEpisode === index }"
            @click="playEpisode(selectedSource, index)"
          >
            {{ episode.name }}
          </div>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <p>视频信息加载失败</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.detail-view {
  padding: 20px;
  color: #ffffff;
}

.back-btn {
  background: none;
  border: none;
  color: #e94560;
  font-size: 16px;
  cursor: pointer;
  margin-bottom: 20px;
  padding: 5px 0;

  &:hover {
    text-decoration: underline;
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

.video-header {
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
}

.video-cover {
  width: 250px;
  flex-shrink: 0;

  img {
    width: 100%;
    border-radius: 8px;
  }
}

.video-info {
  flex: 1;
}

.video-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 15px;
}

.video-meta {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.meta-item {
  padding: 4px 12px;
  background-color: #0f3460;
  border-radius: 4px;
  font-size: 14px;
}

.video-detail {
  margin-bottom: 10px;
  font-size: 14px;
  color: #ccc;

  .label {
    color: #888;
  }
}

.video-actions {
  margin-top: 20px;
}

.action-btn {
  padding: 10px 20px;
  background-color: #0f3460;
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background-color: #1a4a7a;
  }

  &.active {
    background-color: #e94560;
  }
}

.video-content {
  margin-bottom: 30px;

  h3 {
    font-size: 18px;
    margin-bottom: 10px;
  }

  p {
    font-size: 14px;
    color: #ccc;
    line-height: 1.6;
  }
}

.play-sources {
  margin-top: 30px;
}

.source-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  overflow-x: auto;
}

.source-tab {
  padding: 8px 16px;
  background-color: #0f3460;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background-color: #1a4a7a;
  }

  &.active {
    background-color: #e94560;
  }
}

.episode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}

.episode-item {
  padding: 10px;
  background-color: #0f3460;
  border-radius: 4px;
  text-align: center;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    background-color: #1a4a7a;
  }

  &.active {
    background-color: #e94560;
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}
</style>
