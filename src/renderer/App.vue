<script setup lang="ts">
import { ref, provide } from 'vue'
import TopTabs from './components/TopTabs.vue'
import SideNav from './components/SideNav.vue'
import PlayerView from './components/PlayerView.vue'

// Player state shared across components
const playerUrl = ref('')
const playerTitle = ref('')
const playerEpisodes = ref<Array<{ name: string; url: string }>>([])
const currentEpisodeIndex = ref(0)
const showPlayer = ref(false)
const playerWidth = ref(450)

const playVideo = (url: string, title: string, episodes?: Array<{ name: string; url: string }>, episodeIndex?: number) => {
  playerUrl.value = url
  playerTitle.value = title
  playerEpisodes.value = episodes || []
  currentEpisodeIndex.value = episodeIndex || 0
  showPlayer.value = true
}

const onEpisodeChange = (index: number) => {
  if (playerEpisodes.value && index >= 0 && index < playerEpisodes.value.length) {
    currentEpisodeIndex.value = index
    playerUrl.value = playerEpisodes.value[index].url
  }
}

const closePlayer = () => {
  showPlayer.value = false
  playerUrl.value = ''
}

// Resize player
let isResizing = false
let startX = 0
let startWidth = 0

const startResize = (e: MouseEvent) => {
  isResizing = true
  startX = e.clientX
  startWidth = playerWidth.value
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const onResize = (e: MouseEvent) => {
  if (!isResizing) return
  const diff = startX - e.clientX
  const newWidth = Math.max(300, Math.min(800, startWidth + diff))
  playerWidth.value = newWidth
}

const stopResize = () => {
  isResizing = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// Provide player functions to child components
provide('playVideo', playVideo)
provide('playerState', {
  playerUrl,
  playerTitle,
  playerEpisodes,
  currentEpisodeIndex,
  showPlayer,
  onEpisodeChange
})
</script>

<template>
  <div class="app-container">
    <TopTabs />
    <div class="main-content">
      <SideNav />
      <div class="content-area">
        <router-view />
      </div>
      <template v-if="showPlayer">
        <div class="resize-handle" @mousedown="startResize"></div>
        <div class="player-area" :style="{ width: playerWidth + 'px' }">
          <div class="player-header">
            <span class="player-title">{{ playerTitle }}</span>
            <button class="close-btn" @click="closePlayer">✕</button>
          </div>
          <PlayerView
            :url="playerUrl"
            :title="playerTitle"
            :episodes="playerEpisodes"
            :currentEpisodeIndex="currentEpisodeIndex"
            @episode-change="onEpisodeChange"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1a1a2e;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #16213e;
}

.resize-handle {
  width: 4px;
  background-color: #0f3460;
  cursor: col-resize;
  transition: background-color 0.2s;

  &:hover {
    background-color: #e94560;
  }
}

.player-area {
  background-color: #000;
  border-left: 1px solid #0f3460;
  display: flex;
  flex-direction: column;
  min-width: 300px;
  max-width: 800px;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #0f3460;
  border-bottom: 1px solid #1a1a2e;
}

.player-title {
  font-size: 13px;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;

  &:hover {
    color: #e94560;
  }
}
</style>
