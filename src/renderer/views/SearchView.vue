<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchStore } from '../stores/search'

const router = useRouter()
const searchStore = useSearchStore()
const error = ref('')

onMounted(() => {
  // Restore search state from store
})

const handleSearch = async () => {
  if (!searchStore.keyword.trim()) return

  searchStore.setLoading(true)
  error.value = ''
  try {
    const sites = await window.electronAPI.getSites()
    const searchableSites = sites.filter((s: any) => s.searchable === 1)

    // Search all sites in parallel
    const searchPromises = searchableSites.map(async (site: any) => {
      try {
        const result = await window.electronAPI.search(site.key, searchStore.keyword, 1)
        if (result.list) {
          return result.list.map((item: any) => ({
            ...item,
            siteKey: site.key,
            siteName: site.name
          }))
        }
      } catch (e) {
        // Silently skip failed sources
      }
      return []
    })

    const results = await Promise.all(searchPromises)
    searchStore.setResults(results.flat())
  } catch (err: any) {
    console.error('Search failed:', err)
    error.value = err.message || '搜索失败'
  } finally {
    searchStore.setLoading(false)
  }
}

const goDetail = (siteKey: string, vodId: string) => {
  router.push(`/detail/${siteKey}/${vodId}`)
}
</script>

<template>
  <div class="search-view">
    <div class="search-header">
      <input
        v-model="searchStore.keyword"
        type="text"
        placeholder="搜索视频..."
        class="search-input"
        @keyup.enter="handleSearch"
      />
      <button class="search-btn" @click="handleSearch" :disabled="searchStore.loading">
        {{ searchStore.loading ? '搜索中...' : '搜索' }}
      </button>
    </div>

    <div v-if="searchStore.loading" class="loading">
      <div class="loading-spinner"></div>
      <p>搜索中...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="handleSearch">重试</button>
    </div>

    <div v-else-if="searchStore.results.length > 0" class="search-results">
      <div class="result-count">找到 {{ searchStore.results.length }} 个结果</div>
      <div class="result-grid">
        <div
          v-for="item in searchStore.results"
          :key="`${item.siteKey}-${item.vod_id}`"
          class="result-card"
          @click="goDetail(item.siteKey, item.vod_id)"
        >
          <div class="card-cover">
            <img :src="item.vod_pic" :alt="item.vod_name" loading="lazy" />
            <div v-if="item.vod_remarks" class="card-remarks">{{ item.vod_remarks }}</div>
          </div>
          <div class="card-info">
            <h3 class="card-title">{{ item.vod_name }}</h3>
            <div class="card-site">{{ item.siteName }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="searchStore.hasSearched && !searchStore.loading" class="no-results">
      没有找到相关视频
    </div>

    <div v-else class="empty-state">
      <div class="search-icon">🔍</div>
      <p>输入关键词搜索视频</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search-view {
  padding: 20px;
  color: #ffffff;
}

.search-header {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  background-color: #0f3460;
  border: 1px solid #1a1a2e;
  border-radius: 8px;
  color: #ffffff;
  font-size: 16px;

  &::placeholder {
    color: #666;
  }

  &:focus {
    outline: none;
    border-color: #e94560;
  }
}

.search-btn {
  padding: 12px 24px;
  background-color: #e94560;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;

  &:hover {
    background-color: #d63851;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

.result-count {
  margin-bottom: 15px;
  color: #888;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.result-card {
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
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-site {
  font-size: 12px;
  color: #888;
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

.no-results {
  text-align: center;
  padding: 40px;
  color: #666;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #666;
}

.search-icon {
  font-size: 64px;
  margin-bottom: 15px;
}
</style>
