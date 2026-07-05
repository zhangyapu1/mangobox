<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const keyword = ref('')
const searchResults = ref<any[]>([])
const loading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)

const handleSearch = async () => {
  if (!keyword.value.trim()) return

  loading.value = true
  try {
    const sites = await window.electronAPI.getSites()
    const searchableSites = sites.filter((s: any) => s.searchable === 1)

    const results: any[] = []

    // Search across all searchable sites
    for (const site of searchableSites) {
      try {
        const result = await window.electronAPI.search(site.key, keyword.value, currentPage.value)
        if (result.list) {
          results.push(...result.list.map((item: any) => ({
            ...item,
            siteKey: site.key,
            siteName: site.name
          })))
        }
      } catch (e) {
        console.error(`Search failed for ${site.name}:`, e)
      }
    }

    searchResults.value = results
  } catch (error) {
    console.error('Search failed:', error)
  } finally {
    loading.value = false
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
        v-model="keyword"
        type="text"
        placeholder="搜索视频..."
        class="search-input"
        @keyup.enter="handleSearch"
      />
      <button class="search-btn" @click="handleSearch" :disabled="loading">
        {{ loading ? '搜索中...' : '搜索' }}
      </button>
    </div>

    <div v-if="loading" class="loading">搜索中...</div>

    <div v-else-if="searchResults.length > 0" class="search-results">
      <div class="result-count">找到 {{ searchResults.length }} 个结果</div>
      <div class="result-grid">
        <div
          v-for="item in searchResults"
          :key="`${item.siteKey}-${item.vod_id}`"
          class="result-card"
          @click="goDetail(item.siteKey, item.vod_id)"
        >
          <div class="card-cover">
            <img :src="item.vod_pic" :alt="item.vod_name" />
            <div v-if="item.vod_remarks" class="card-remarks">{{ item.vod_remarks }}</div>
          </div>
          <div class="card-info">
            <h3 class="card-title">{{ item.vod_name }}</h3>
            <div class="card-site">{{ item.siteName }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="keyword && !loading" class="no-results">
      没有找到相关视频
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
  text-align: center;
  padding: 40px;
  color: #666;
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

.no-results {
  text-align: center;
  padding: 40px;
  color: #666;
}
</style>
