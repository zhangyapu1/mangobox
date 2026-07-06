<script setup lang="ts">
import { ref, provide } from 'vue'
import TopTabs from './components/TopTabs.vue'
import SideNav from './components/SideNav.vue'
import PlayerView from './components/PlayerView.vue'

// Player state
const playerUrl = ref('')
const playerTitle = ref('')
const playerEpisodes = ref<Array<{ name: string; url: string }>>([])
const currentEpisodeIndex = ref(0)
const showPlayer = ref(false)
const playerReferer = ref('')

// Detail info for overlay
const playerDetail = ref<any>(null)

const playVideo = (url: string, title: string, episodes?: Array<{ name: string; url: string }>, episodeIndex?: number, referer?: string, detail?: any) => {
  playerUrl.value = url
  playerTitle.value = title
  playerEpisodes.value = episodes || []
  currentEpisodeIndex.value = episodeIndex || 0
  playerReferer.value = referer || ''
  playerDetail.value = detail || null
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
  playerDetail.value = null
}

provide('playVideo', playVideo)
provide('closePlayer', closePlayer)
provide('playerState', {
  playerUrl,
  playerTitle,
  playerEpisodes,
  currentEpisodeIndex,
  showPlayer,
  playerReferer,
  playerDetail,
  onEpisodeChange
})
</script>

<template>
  <div class="app-container">
    <!-- Normal layout when not playing -->
    <template v-if="!showPlayer">
      <TopTabs />
      <div class="main-content">
        <SideNav />
        <div class="content-area">
          <router-view />
        </div>
      </div>
    </template>

    <!-- Fullscreen player when playing -->
    <template v-else>
      <PlayerView
        :url="playerUrl"
        :title="playerTitle"
        :episodes="playerEpisodes"
        :currentEpisodeIndex="currentEpisodeIndex"
        :referer="playerReferer"
        :detail="playerDetail"
        @episode-change="onEpisodeChange"
        @close="closePlayer"
      />
    </template>
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
</style>
