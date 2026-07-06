<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import Hls from 'hls.js'

const props = defineProps<{
  url?: string
  title?: string
  episodes?: Array<{ name: string; url: string }>
  currentEpisodeIndex?: number
  referer?: string
  detail?: any
}>()

const emit = defineEmits<{
  (e: 'episode-change', index: number): void
  (e: 'close'): void
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(80)
const isMuted = ref(false)
const hls = ref<Hls | null>(null)
const error = ref('')

// Overlay visibility - auto-hide after 5 seconds
const showOverlay = ref(true)
let overlayTimeout: NodeJS.Timeout | null = null

// Selected source tab
const selectedSource = ref(0)

onMounted(() => {
  if (videoRef.value) {
    videoRef.value.volume = volume.value / 100
  }
  startOverlayTimer()
})

onUnmounted(() => {
  destroyHls()
  if (overlayTimeout) clearTimeout(overlayTimeout)
})

watch(() => props.url, (newUrl) => {
  if (newUrl) {
    playUrl(newUrl)
  }
})

const startOverlayTimer = () => {
  if (overlayTimeout) clearTimeout(overlayTimeout)
  overlayTimeout = setTimeout(() => {
    if (isPlaying.value) {
      showOverlay.value = false
    }
  }, 5000)
}

const toggleOverlay = () => {
  showOverlay.value = !showOverlay.value
  if (showOverlay.value) {
    startOverlayTimer()
  }
}

const keepOverlay = () => {
  showOverlay.value = true
  startOverlayTimer()
}

const playUrl = (url: string) => {
  if (!videoRef.value) return

  error.value = ''
  destroyHls()

  let referer = props.referer || ''
  if (!referer) {
    try {
      const urlObj = new URL(url)
      referer = urlObj.origin + '/'
    } catch {}
  }

  if (url.includes('.m3u8') || url.includes('m3u8')) {
    if (Hls.isSupported()) {
      hls.value = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false
          if (referer) {
            xhr.setRequestHeader('Referer', referer)
          }
          xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        }
      })
      hls.value.loadSource(url)
      hls.value.attachMedia(videoRef.value)
      hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.value?.play().catch(() => {})
      })
      hls.value.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            error.value = '网络错误，请检查网络或切换源'
            hls.value?.startLoad()
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            error.value = '媒体错误，尝试恢复...'
            hls.value?.recoverMediaError()
          } else {
            error.value = '播放失败: ' + data.type
          }
        }
      })
    } else if (videoRef.value.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.value.src = url
      videoRef.value.addEventListener('loadedmetadata', () => {
        videoRef.value?.play().catch(() => {})
      })
    } else {
      error.value = '浏览器不支持 HLS 播放'
    }
  } else {
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
    startOverlayTimer()
  } else {
    videoRef.value.pause()
    isPlaying.value = false
    showOverlay.value = true
  }
}

const onTimeUpdate = () => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime
    duration.value = videoRef.value.duration || 0
  }
}

const onEnded = () => {
  isPlaying.value = false
  showOverlay.value = true
  // Auto play next
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
  keepOverlay()
}

const setVolume = (e: Event) => {
  const val = Number((e.target as HTMLInputElement).value)
  volume.value = val
  if (videoRef.value) {
    videoRef.value.volume = val / 100
  }
  isMuted.value = val === 0
  keepOverlay()
}

const toggleMute = () => {
  if (!videoRef.value) return
  isMuted.value = !isMuted.value
  videoRef.value.muted = isMuted.value
  keepOverlay()
}

const prevEpisode = () => {
  if (props.episodes && props.currentEpisodeIndex !== undefined && props.currentEpisodeIndex > 0) {
    emit('episode-change', props.currentEpisodeIndex - 1)
    keepOverlay()
  }
}

const nextEpisode = () => {
  if (props.episodes && props.currentEpisodeIndex !== undefined) {
    if (props.currentEpisodeIndex < props.episodes.length - 1) {
      emit('episode-change', props.currentEpisodeIndex + 1)
      keepOverlay()
    }
  }
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
  <div class="player-fullscreen" @mousemove="keepOverlay" @click="toggleOverlay">
    <!-- Video -->
    <video
      ref="videoRef"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @play="isPlaying = true; startOverlayTimer()"
      @pause="isPlaying = false; showOverlay = true"
    />

    <!-- Error overlay -->
    <div v-if="error" class="error-overlay" @click.stop>
      <p>{{ error }}</p>
      <button @click="error = ''; playUrl(url!)">重试</button>
    </div>

    <!-- Detail overlay (auto-hides) -->
    <div v-if="showOverlay" class="overlay" @click.stop>
      <!-- Top bar -->
      <div class="top-bar">
        <button class="back-btn" @click="$emit('close')">← 返回</button>
        <span class="video-title">{{ title }}</span>
      </div>

      <!-- Center: episode list (if available) -->
      <div v-if="detail?.playSources?.length" class="episode-panel">
        <div class="source-tabs">
          <div
            v-for="(source, idx) in detail.playSources"
            :key="idx"
            class="source-tab"
            :class="{ active: selectedSource === idx }"
            @click="selectedSource = idx"
          >
            {{ source.name }}
          </div>
        </div>
        <div class="episode-list">
          <div
            v-for="(ep, idx) in detail.playSources[selectedSource]?.episodes"
            :key="idx"
            class="episode-item"
            :class="{ active: currentEpisodeIndex === idx && selectedSource === selectedSource }"
            @click="$emit('episode-change', idx)"
          >
            {{ ep.name }}
          </div>
        </div>
      </div>

      <!-- Bottom controls -->
      <div class="bottom-bar">
        <!-- Progress -->
        <div class="progress-bar" @click="seek">
          <div class="progress" :style="{ width: (duration ? (currentTime / duration * 100) : 0) + '%' }"></div>
        </div>

        <div class="controls-row">
          <button class="ctrl-btn" @click="togglePlay">
            {{ isPlaying ? '⏸' : '▶' }}
          </button>
          <button class="ctrl-btn" @click="prevEpisode" :disabled="!episodes || currentEpisodeIndex === 0">⏮</button>
          <button class="ctrl-btn" @click="nextEpisode" :disabled="!episodes || currentEpisodeIndex === (episodes?.length || 0) - 1">⏭</button>

          <span class="time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>

          <div class="spacer"></div>

          <button class="ctrl-btn" @click="toggleMute">{{ isMuted ? '🔇' : '🔊' }}</button>
          <input type="range" min="0" max="100" :value="volume" @input="setVolume" class="volume-slider" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.player-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #000;
  z-index: 1000;
  cursor: none;

  &:hover {
    cursor: default;
  }
}

video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.error-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  padding: 30px 40px;
  border-radius: 12px;
  text-align: center;
  color: #e94560;

  p {
    margin-bottom: 15px;
    font-size: 16px;
  }

  button {
    padding: 10px 24px;
    background-color: #e94560;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  }
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.top-bar {
  display: flex;
  align-items: center;
  padding: 20px 30px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent);
}

.back-btn {
  background: none;
  border: none;
  color: #e94560;
  font-size: 16px;
  cursor: pointer;
  margin-right: 20px;

  &:hover {
    text-decoration: underline;
  }
}

.video-title {
  color: #fff;
  font-size: 18px;
  font-weight: 500;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
}

.episode-panel {
  align-self: flex-end;
  width: 350px;
  max-height: 60vh;
  margin-right: 30px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  overflow: hidden;
}

.source-tabs {
  display: flex;
  overflow-x: auto;
  padding: 10px;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.source-tab {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: #ccc;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  &.active {
    background: #e94560;
    color: #fff;
  }
}

.episode-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 15px;
  max-height: 50vh;
  overflow-y: auto;
}

.episode-item {
  padding: 10px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  text-align: center;
  color: #ccc;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  &.active {
    background: #e94560;
    color: #fff;
  }
}

.bottom-bar {
  padding: 0 30px 20px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
}

.progress-bar {
  width: 100%;
  height: 5px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  cursor: pointer;
  margin-bottom: 15px;
  transition: height 0.2s;

  &:hover {
    height: 8px;
  }
}

.progress {
  height: 100%;
  background: #e94560;
  border-radius: 3px;
  transition: width 0.1s;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 15px;
}

.ctrl-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 22px;
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

.time {
  font-size: 14px;
  color: #ccc;
  min-width: 120px;
}

.spacer {
  flex: 1;
}

.volume-slider {
  width: 100px;
  height: 4px;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: #e94560;
    border-radius: 50%;
    cursor: pointer;
  }
}
</style>
