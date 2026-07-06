<script setup lang="ts">
import { ref } from 'vue'

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(80)
const isFullscreen = ref(false)

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const progressPercent = (): number => {
  if (!duration.value || duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
}

const togglePlay = () => {
  isPlaying.value = !isPlaying.value
  window.electronAPI.togglePause()
}

const seek = (time: number) => {
  currentTime.value = time
  window.electronAPI.seekVideo(time)
}

const setVolume = (vol: number) => {
  volume.value = vol
  window.electronAPI.setVolume(vol)
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  window.electronAPI.toggleFullscreen()
}

const handleVolumeInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  setVolume(Number(target.value))
}
</script>

<template>
  <div class="player-view" :class="{ fullscreen: isFullscreen }">
    <div class="player-container" id="player-container">
      <div class="video-placeholder">
        <div class="play-icon" @click="togglePlay">
          {{ isPlaying ? '⏸' : '▶' }}
        </div>
        <p class="placeholder-text">选择视频开始播放</p>
      </div>
    </div>
    <div class="player-controls">
      <button class="control-btn" @click="togglePlay">
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      <div class="progress-bar">
        <div class="progress" :style="{ width: progressPercent() + '%' }"></div>
      </div>
      <span class="time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
      <div class="volume-control">
        <span>🔊</span>
        <input type="range" min="0" max="100" :value="volume" @input="handleVolumeInput">
      </div>
      <button class="control-btn" @click="toggleFullscreen">
        {{ isFullscreen ? '⊡' : '⊞' }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.player-view {
  width: 400px;
  background-color: #0a0a1a;
  border-left: 1px solid #0f3460;
  display: flex;
  flex-direction: column;

  &.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
    border: none;
  }
}

.player-container {
  flex: 1;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-placeholder {
  text-align: center;
  color: #666;
}

.play-icon {
  font-size: 64px;
  cursor: pointer;
  margin-bottom: 10px;

  &:hover {
    color: #e94560;
  }
}

.placeholder-text {
  font-size: 14px;
}

.player-controls {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: #0f3460;
  gap: 10px;
}

.control-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  padding: 5px;

  &:hover {
    color: #e94560;
  }
}

.progress-bar {
  flex: 1;
  height: 4px;
  background-color: #333;
  border-radius: 2px;
  cursor: pointer;
}

.progress {
  height: 100%;
  background-color: #e94560;
  border-radius: 2px;
}

.time {
  font-size: 12px;
  color: #ccc;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 5px;

  input[type="range"] {
    width: 80px;
    height: 4px;
    -webkit-appearance: none;
    background: #333;
    border-radius: 2px;
    outline: none;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 12px;
      height: 12px;
      background: #e94560;
      border-radius: 50%;
      cursor: pointer;
    }
  }
}
</style>
