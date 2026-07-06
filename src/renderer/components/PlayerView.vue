<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import Hls from 'hls.js'

const props = defineProps<{
  url?: string
  title?: string
  episodes?: Array<{ name: string; url: string }>
  currentEpisodeIndex?: number
}>()

const emit = defineEmits<{
  (e: 'episode-change', index: number): void
  (e: 'time-update', time: number): void
  (e: 'play'): void
  (e: 'pause'): void
  (e: 'ended'): void
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(80)
const isFullscreen = ref(false)
const showControls = ref(true)
const hls = ref<Hls | null>(null)
const error = ref('')

let controlsTimeout: NodeJS.Timeout | null = null

onMounted(() => {
  if (videoRef.value) {
    videoRef.value.volume = volume.value / 100
  }
})

onUnmounted(() => {
  destroyHls()
})

watch(() => props.url, (newUrl) => {
  if (newUrl) {
    playUrl(newUrl)
  }
})

const playUrl = (url: string) => {
  if (!videoRef.value) return

  error.value = ''
  destroyHls()

  if (url.includes('.m3u8') || url.includes('m3u8')) {
    // HLS stream
    if (Hls.isSupported()) {
      hls.value = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60
      })
      hls.value.loadSource(url)
      hls.value.attachMedia(videoRef.value)
      hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.value?.play().catch(() => {})
      })
      hls.value.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          error.value = '播放失败: ' + data.type
          console.error('HLS fatal error:', data)
        }
      })
    } else if (videoRef.value.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      videoRef.value.src = url
      videoRef.value.addEventListener('loadedmetadata', () => {
        videoRef.value?.play().catch(() => {})
      })
    } else {
      error.value = '浏览器不支持 HLS 播放'
    }
  } else {
    // Direct video URL (mp4, etc.)
    videoRef.value.src = url
    videoRef.value.play().catch(() => {})
  }
}

const destroyHls = () => {
  if (hls.value) {
    hls.value.destroy()
    hls.value = null
  }
}

const togglePlay = () => {
  if (!videoRef.value) return

  if (videoRef.value.paused) {
    videoRef.value.play()
    isPlaying.value = true
    emit('play')
  } else {
    videoRef.value.pause()
    isPlaying.value = false
    emit('pause')
  }
}

const onTimeUpdate = () => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime
    duration.value = videoRef.value.duration || 0
    emit('time-update', currentTime.value)
  }
}

const onEnded = () => {
  isPlaying.value = false
  emit('ended')
  // Auto play next episode
  if (props.episodes && props.currentEpisodeIndex !== undefined) {
    if (props.currentEpisodeIndex < props.episodes.length - 1) {
      emit('episode-change', props.currentEpisodeIndex + 1)
    }
  }
}

const seek = (e: MouseEvent) => {
  if (!videoRef.value || !duration.value) return
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  videoRef.value.currentTime = percent * duration.value
}

const setVolume = (e: Event) => {
  const val = Number((e.target as HTMLInputElement).value)
  volume.value = val
  if (videoRef.value) {
    videoRef.value.volume = val / 100
  }
}

const toggleFullscreen = () => {
  if (!videoRef.value) return
  if (document.fullscreenElement) {
    document.exitFullscreen()
    isFullscreen.value = false
  } else {
    videoRef.value.requestFullscreen()
    isFullscreen.value = true
  }
}

const prevEpisode = () => {
  if (props.episodes && props.currentEpisodeIndex !== undefined && props.currentEpisodeIndex > 0) {
    emit('episode-change', props.currentEpisodeIndex - 1)
  }
}

const nextEpisode = () => {
  if (props.episodes && props.currentEpisodeIndex !== undefined) {
    if (props.currentEpisodeIndex < props.episodes.length - 1) {
      emit('episode-change', props.currentEpisodeIndex + 1)
    }
  }
}

const showControlsTemporarily = () => {
  showControls.value = true
  if (controlsTimeout) clearTimeout(controlsTimeout)
  controlsTimeout = setTimeout(() => {
    if (isPlaying.value) {
      showControls.value = false
    }
  }, 3000)
}

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="player-container" @mousemove="showControlsTemporarily">
    <div class="video-wrapper">
      <video
        ref="videoRef"
        @timeupdate="onTimeUpdate"
        @ended="onEnded"
        @play="isPlaying = true"
        @pause="isPlaying = false"
        @click="togglePlay"
        @dblclick="toggleFullscreen"
      />

      <!-- Error overlay -->
      <div v-if="error" class="error-overlay">
        <p>{{ error }}</p>
      </div>

      <!-- No video placeholder -->
      <div v-if="!url && !error" class="placeholder">
        <div class="placeholder-icon">📺</div>
        <p>选择视频开始播放</p>
      </div>

      <!-- Controls overlay -->
      <div class="controls-overlay" :class="{ visible: showControls || !isPlaying }">
        <!-- Top bar -->
        <div class="top-bar">
          <span class="video-title">{{ title || 'MangoBox Player' }}</span>
        </div>

        <!-- Bottom controls -->
        <div class="bottom-controls">
          <!-- Progress bar -->
          <div class="progress-bar" @click="seek">
            <div class="progress" :style="{ width: (duration ? (currentTime / duration * 100) : 0) + '%' }"></div>
          </div>

          <div class="controls-row">
            <!-- Play/Pause -->
            <button class="ctrl-btn" @click="togglePlay">
              {{ isPlaying ? '⏸' : '▶' }}
            </button>

            <!-- Previous episode -->
            <button
              class="ctrl-btn"
              @click="prevEpisode"
              :disabled="!episodes || currentEpisodeIndex === undefined || currentEpisodeIndex <= 0"
            >
              ⏮
            </button>

            <!-- Next episode -->
            <button
              class="ctrl-btn"
              @click="nextEpisode"
              :disabled="!episodes || currentEpisodeIndex === undefined || currentEpisodeIndex >= (episodes?.length || 0) - 1"
            >
              ⏭
            </button>

            <!-- Time -->
            <span class="time-display">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>

            <div class="spacer"></div>

            <!-- Volume -->
            <span class="volume-icon">🔊</span>
            <input type="range" min="0" max="100" :value="volume" @input="setVolume" class="volume-slider" />

            <!-- Fullscreen -->
            <button class="ctrl-btn" @click="toggleFullscreen">
              {{ isFullscreen ? '⊡' : '⊞' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.player-container {
  width: 100%;
  height: 100%;
  background-color: #000;
  position: relative;
}

.video-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #000;
}

.error-overlay,
.placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.8);
  color: #666;
}

.placeholder-icon {
  font-size: 64px;
  margin-bottom: 15px;
}

.error-overlay {
  color: #e94560;
}

.controls-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;

  &.visible {
    opacity: 1;
    pointer-events: auto;
  }
}

.top-bar {
  padding: 15px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent);
}

.video-title {
  color: #fff;
  font-size: 14px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.bottom-controls {
  padding: 0 15px 15px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
}

.progress-bar {
  width: 100%;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  cursor: pointer;
  margin-bottom: 10px;

  &:hover {
    height: 6px;
  }
}

.progress {
  height: 100%;
  background-color: #e94560;
  border-radius: 2px;
  transition: width 0.1s;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ctrl-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  padding: 5px;
  opacity: 0.9;

  &:hover {
    opacity: 1;
    color: #e94560;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.time-display {
  font-size: 12px;
  color: #ccc;
  min-width: 100px;
}

.spacer {
  flex: 1;
}

.volume-icon {
  font-size: 14px;
}

.volume-slider {
  width: 80px;
  height: 4px;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.3);
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
</style>
