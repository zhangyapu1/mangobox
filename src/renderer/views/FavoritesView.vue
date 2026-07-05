<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const favorites = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  await loadFavorites()
})

const loadFavorites = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.getFavorites()
    favorites.value = result
  } catch (error) {
    console.error('Failed to load favorites:', error)
  } finally {
    loading.value = false
  }
}

const removeFavorite = async (siteKey: string, vodId: string) => {
  try {
    await window.electronAPI.removeFavorite(siteKey, vodId)
    await loadFavorites()
  } catch (error) {
    console.error('Failed to remove favorite:', error)
  }
}

const goDetail = (siteKey: string, vodId: string) => {
  router.push(`/detail/${siteKey}/${vodId}`)
}
</script>

<template>
  <div class="favorites-view">
    <h1>收藏</h1>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="favorites.length > 0" class="favorites-grid">
      <div
        v-for="fav in favorites"
        :key="`${fav[0]}-${fav[1]}`"
        class="favorite-card"
      >
        <div class="card-cover" @click="goDetail(fav[0], fav[1])">
          <img :src="fav[3]" :alt="fav[2]" />
          <div v-if="fav[4]" class="card-remarks">{{ fav[4] }}</div>
        </div>
        <div class="card-info">
          <h3 class="card-title" @click="goDetail(fav[0], fav[1])">{{ fav[2] }}</h3>
          <button class="remove-btn" @click="removeFavorite(fav[0], fav[1])">取消收藏</button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>还没有收藏任何视频</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.favorites-view {
  padding: 20px;
  color: #ffffff;
}

h1 {
  margin-bottom: 20px;
  font-size: 24px;
  font-weight: 500;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.favorite-card {
  background-color: #0f3460;
  border-radius: 8px;
  overflow: hidden;
}

.card-cover {
  position: relative;
  aspect-ratio: 2/3;
  cursor: pointer;

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
  margin-bottom: 10px;
  cursor: pointer;

  &:hover {
    color: #e94560;
  }
}

.remove-btn {
  width: 100%;
  padding: 8px;
  background-color: #e94560;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #d63851;
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}
</style>
