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
      <div class="content-area" :class="{ 'with-player': showPlayer }">
        <router-view />
      </div>
      <div v-if="showPlayer" class="player-area">
        <PlayerView
          :url="playerUrl"
          :title="playerTitle"
          :episodes="playerEpisodes"
          :currentEpisodeIndex="currentEpisodeIndex"
          @episode-change="onEpisodeChange"
        />
      </div>
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

  &.with-player {
    flex: 1;
  }
}

.player-area {
  width: 450px;
  min-width: 450px;
  background-color: #000;
  border-left: 1px solid #0f3460;
}
</style>
