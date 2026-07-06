<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const lives = ref<any[]>([])
const channels = ref<any[]>([])
const currentGroup = ref('')
const selectedLiveIndex = ref(0)
const loading = ref(true)
const selectedChannel = ref<any>(null)

onMounted(async () => {
  await loadLives()
})

const loadLives = async () => {
  loading.value = true
  try {
    const liveList = await window.electronAPI.getLives()
    lives.value = liveList

    // Load channels from first live source
    if (liveList.length > 0) {
      await loadChannels(0)
    }
  } catch (error) {
    console.error('Failed to load lives:', error)
  } finally {
    loading.value = false
  }
}

const loadChannels = async (liveIndex: number) => {
  try {
    const result = await window.electronAPI.parseLiveChannels(liveIndex)
    channels.value = result

    // Set first group as active
    if (result.length > 0) {
      const groups = [...new Set(result.map((c: any) => c.group))]
      currentGroup.value = groups[0] as string
    }
  } catch (error) {
    console.error('Failed to load channels:', error)
  }
}

const groups = computed(() => {
  return [...new Set(channels.value.map(c => c.group))]
})

const filteredChannels = computed(() => {
  if (!currentGroup.value) return channels.value
  return channels.value.filter(c => c.group === currentGroup.value)
})

const playChannel = async (channel: any) => {
  selectedChannel.value = channel
  try {
    // Initialize player if needed
    await window.electronAPI.initPlayer()

    // Play the channel
    await window.electronAPI.playVideo(channel.url)
  } catch (error) {
    console.error('Failed to play channel:', error)
  }
}

const selectGroup = (group: string) => {
  currentGroup.value = group
}
</script>

<template>
  <div class="live-view">
    <div class="live-header">
      <h1>直播</h1>
      <div v-if="lives.length > 0" class="live-source-selector">
        <select v-model="selectedLiveIndex" @change="loadChannels(selectedLiveIndex)">
          <option v-for="(live, index) in lives" :key="index" :value="index">
            {{ live.name }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="channels.length > 0" class="live-content">
      <div class="group-sidebar">
        <div class="group-header">频道分类</div>
        <div class="group-list">
          <div
            v-for="group in groups"
            :key="group"
            class="group-item"
            :class="{ active: currentGroup === group }"
            @click="selectGroup(group)"
          >
            {{ group }}
          </div>
        </div>
      </div>

      <div class="channel-list">
        <div class="channel-header">
          {{ currentGroup }} ({{ filteredChannels.length }}个频道)
        </div>
        <div class="channel-grid">
          <div
            v-for="channel in filteredChannels"
            :key="channel.name"
            class="channel-card"
            :class="{ active: selectedChannel?.name === channel.name }"
            @click="playChannel(channel)"
          >
            <div class="channel-logo">
              <img v-if="channel.logo" :src="channel.logo" :alt="channel.name" />
              <div v-else class="no-logo">📺</div>
            </div>
            <div class="channel-name">{{ channel.name }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>没有可用的直播源</p>
      <p>请在设置中添加直播源</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.live-view {
  padding: 20px;
  color: #ffffff;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.live-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h1 {
    font-size: 24px;
    font-weight: 500;
  }
}

.live-source-selector {
  select {
    padding: 8px 12px;
    background-color: #0f3460;
    color: #ffffff;
    border: 1px solid #1a1a2e;
    border-radius: 4px;
    font-size: 14px;
  }
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.live-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.group-sidebar {
  width: 200px;
  background-color: #0f3460;
  border-radius: 8px;
  margin-right: 20px;
  overflow-y: auto;
}

.group-header {
  padding: 15px;
  font-size: 16px;
  font-weight: 500;
  border-bottom: 1px solid #1a1a2e;
}

.group-list {
  padding: 10px 0;
}

.group-item {
  padding: 12px 15px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  &.active {
    background-color: #e94560;
  }
}

.channel-list {
  flex: 1;
  overflow-y: auto;
}

.channel-header {
  padding: 15px;
  font-size: 16px;
  font-weight: 500;
  background-color: #0f3460;
  border-radius: 8px;
  margin-bottom: 15px;
}

.channel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
}

.channel-card {
  background-color: #0f3460;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }

  &.active {
    background-color: #e94560;
  }
}

.channel-logo {
  width: 60px;
  height: 60px;
  margin: 0 auto 10px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #1a1a2e;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .no-logo {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }
}

.channel-name {
  font-size: 14px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;

  p {
    margin-bottom: 10px;
  }
}
</style>
