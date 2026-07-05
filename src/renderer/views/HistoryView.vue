<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const history = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  await loadHistory()
})

const loadHistory = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.getHistory()
    history.value = result
  } catch (error) {
    console.error('Failed to load history:', error)
  } finally {
    loading.value = false
  }
}

const goDetail = (siteKey: string, vodId: string) => {
  router.push(`/detail/${siteKey}/${vodId}`)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="history-view">
    <h1>观看历史</h1>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="history.length > 0" class="history-list">
      <div
        v-for="item in history"
        :key="`${item[0]}-${item[1]}`"
        class="history-item"
        @click="goDetail(item[0], item[1])"
      >
        <div class="item-cover">
          <img :src="item[3]" :alt="item[2]" />
        </div>
        <div class="item-info">
          <h3 class="item-title">{{ item[2] }}</h3>
          <div v-if="item[4]" class="item-episode">看到: {{ item[4] }}</div>
          <div class="item-time">{{ formatDate(item[7]) }}</div>
        </div>
        <div v-if="item[5] && item[6]" class="item-progress">
          <div class="progress-bar">
            <div class="progress" :style="{ width: (item[5] / item[6] * 100) + '%' }"></div>
          </div>
          <div class="progress-text">{{ Math.floor(item[5] / 60) }}:{{ Math.floor(item[5] % 60).toString().padStart(2, '0') }}</div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>还没有观看历史</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.history-view {
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

.history-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.history-item {
  display: flex;
  align-items: center;
  background-color: #0f3460;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #1a4a7a;
  }
}

.item-cover {
  width: 80px;
  height: 120px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.item-info {
  flex: 1;
  margin-left: 15px;
}

.item-title {
  font-size: 16px;
  color: #ffffff;
  margin-bottom: 8px;
}

.item-episode {
  font-size: 14px;
  color: #e94560;
  margin-bottom: 4px;
}

.item-time {
  font-size: 12px;
  color: #888;
}

.item-progress {
  width: 150px;
  text-align: right;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background-color: #333;
  border-radius: 2px;
  margin-bottom: 4px;
}

.progress {
  height: 100%;
  background-color: #e94560;
  border-radius: 2px;
}

.progress-text {
  font-size: 12px;
  color: #888;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}
</style>
