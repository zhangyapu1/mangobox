<script setup lang="ts">
import { ref, onMounted } from 'vue'

const sources = ref<any[]>([])
const newSourceUrl = ref('')
const newSourceName = ref('')
const loading = ref(false)
const message = ref('')

// Ad Blocker
const adBlockerEnabled = ref(true)
const adBlockerStats = ref<any>(null)

// DNS
const dohServers = ref<any[]>([])
const activeDohServer = ref('')

// DLNA
const dlnaDevices = ref<any[]>([])
const isScanning = ref(false)

// Keyboard
const keyboardEnabled = ref(true)
const keyboardBindings = ref<any[]>([])

onMounted(async () => {
  await loadSources()
  await loadSettings()
})

const loadSources = async () => {
  loading.value = true
  try {
    sources.value = await window.electronAPI.getSources()
  } catch (error) {
    console.error('Failed to load sources:', error)
  } finally {
    loading.value = false
  }
}

const loadSettings = async () => {
  try {
    // Ad Blocker
    adBlockerEnabled.value = await window.electronAPI.isAdBlockerEnabled()
    adBlockerStats.value = await window.electronAPI.getAdBlockerStats()

    // DNS
    dohServers.value = await window.electronAPI.getDohServers()
    const dohStats = await window.electronAPI.getDohStats()
    if (dohStats) {
      activeDohServer.value = dohStats.server
    }

    // Keyboard
    keyboardEnabled.value = await window.electronAPI.isKeyboardEnabled()
    keyboardBindings.value = await window.electronAPI.getKeyboardBindings()
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}

const addSource = async () => {
  if (!newSourceUrl.value.trim()) return

  loading.value = true
  message.value = ''

  try {
    const result = await window.electronAPI.loadSource(newSourceUrl.value)

    if (result.success) {
      await window.electronAPI.addSource(
        newSourceName.value || result.source.sites[0]?.name || 'Unknown Source',
        newSourceUrl.value
      )

      newSourceUrl.value = ''
      newSourceName.value = ''
      message.value = '源添加成功！'
      await loadSources()
    } else {
      message.value = `加载失败: ${result.error}`
    }
  } catch (error: any) {
    message.value = `错误: ${error.message}`
  } finally {
    loading.value = false
  }
}

const removeSource = async (url: string) => {
  try {
    await window.electronAPI.removeSource(url)
    await loadSources()
    message.value = '源已删除'
  } catch (error: any) {
    message.value = `删除失败: ${error.message}`
  }
}

const setActiveSource = async (url: string) => {
  try {
    await window.electronAPI.setActiveSource(url)
    await loadSources()
    message.value = '已切换活动源'
  } catch (error: any) {
    message.value = `切换失败: ${error.message}`
  }
}

const toggleAdBlocker = async () => {
  adBlockerEnabled.value = await window.electronAPI.toggleAdBlocker()
  adBlockerStats.value = await window.electronAPI.getAdBlockerStats()
}

const setDohServer = async (serverName: string) => {
  await window.electronAPI.setDohServer(serverName)
  activeDohServer.value = serverName
}

const startDlnaScan = async () => {
  isScanning.value = true
  try {
    dlnaDevices.value = await window.electronAPI.startDlnaScan()
  } catch (error) {
    console.error('DLNA scan failed:', error)
  } finally {
    isScanning.value = false
  }
}

const toggleKeyboard = async () => {
  keyboardEnabled.value = await window.electronAPI.toggleKeyboardShortcuts()
}
</script>

<template>
  <div class="settings-view">
    <h1>设置</h1>

    <!-- Source Management -->
    <div class="settings-section">
      <h2>源管理</h2>
      <p class="section-desc">添加和管理TVBox JSON源</p>

      <div class="add-source-form">
        <div class="form-group">
          <label>源名称 (可选)</label>
          <input v-model="newSourceName" type="text" placeholder="例如: 饭太硬" />
        </div>
        <div class="form-group">
          <label>源URL</label>
          <input v-model="newSourceUrl" type="text" placeholder="输入TVBox JSON源URL" />
        </div>
        <button class="add-btn" @click="addSource" :disabled="loading">
          {{ loading ? '加载中...' : '添加源' }}
        </button>
      </div>

      <div v-if="message" class="message" :class="{ error: message.includes('失败') || message.includes('错误') }">
        {{ message }}
      </div>

      <div class="sources-list">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="sources.length > 0">
          <div
            v-for="source in sources"
            :key="source[1]"
            class="source-item"
            :class="{ active: source[2] === 1 }"
          >
            <div class="source-info">
              <div class="source-name">{{ source[0] }}</div>
              <div class="source-url">{{ source[1] }}</div>
            </div>
            <div class="source-actions">
              <button
                v-if="source[2] !== 1"
                class="activate-btn"
                @click="setActiveSource(source[1])"
              >
                激活
              </button>
              <span v-else class="active-badge">当前活动</span>
              <button class="remove-btn" @click="removeSource(source[1])">删除</button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          还没有添加任何源
        </div>
      </div>
    </div>

    <!-- Ad Blocker -->
    <div class="settings-section">
      <h2>广告过滤</h2>
      <p class="section-desc">过滤视频播放中的广告</p>

      <div class="setting-item">
        <div class="setting-label">启用广告过滤</div>
        <button class="toggle-btn" :class="{ active: adBlockerEnabled }" @click="toggleAdBlocker">
          {{ adBlockerEnabled ? '已启用' : '已禁用' }}
        </button>
      </div>

      <div v-if="adBlockerStats" class="setting-info">
        <div class="info-item">已屏蔽域名: {{ adBlockerStats.blockedDomains }} 个</div>
      </div>
    </div>

    <!-- DNS-over-HTTPS -->
    <div class="settings-section">
      <h2>DNS-over-HTTPS</h2>
      <p class="section-desc">使用加密DNS解析，提高安全性和速度</p>

      <div class="doh-servers">
        <div
          v-for="server in dohServers"
          :key="server.name"
          class="doh-item"
          :class="{ active: activeDohServer === server.name }"
          @click="setDohServer(server.name)"
        >
          <div class="doh-name">{{ server.name }}</div>
          <div class="doh-url">{{ server.url }}</div>
        </div>
      </div>
    </div>

    <!-- DLNA -->
    <div class="settings-section">
      <h2>DLNA 投屏</h2>
      <p class="section-desc">将视频投屏到电视或其他设备</p>

      <button class="scan-btn" @click="startDlnaScan" :disabled="isScanning">
        {{ isScanning ? '扫描中...' : '扫描设备' }}
      </button>

      <div v-if="dlnaDevices.length > 0" class="device-list">
        <div
          v-for="(device, index) in dlnaDevices"
          :key="index"
          class="device-item"
        >
          <div class="device-name">{{ device.name }}</div>
          <div class="device-info">{{ device.manufacturer }} - {{ device.modelName }}</div>
          <button class="cast-btn" @click="$emit('cast', index)">投屏</button>
        </div>
      </div>
    </div>

    <!-- Keyboard Shortcuts -->
    <div class="settings-section">
      <h2>键盘快捷键</h2>
      <p class="section-desc">使用键盘控制播放和导航</p>

      <div class="setting-item">
        <div class="setting-label">启用键盘快捷键</div>
        <button class="toggle-btn" :class="{ active: keyboardEnabled }" @click="toggleKeyboard">
          {{ keyboardEnabled ? '已启用' : '已禁用' }}
        </button>
      </div>

      <div class="keyboard-bindings">
        <div
          v-for="binding in keyboardBindings"
          :key="binding.key"
          class="binding-item"
        >
          <div class="binding-key">{{ binding.key }}</div>
          <div class="binding-desc">{{ binding.description }}</div>
        </div>
      </div>
    </div>

    <!-- Recommended Sources -->
    <div class="settings-section">
      <h2>常用源推荐</h2>
      <div class="recommended-sources">
        <div class="recommended-item">
          <div class="source-name">饭太硬</div>
          <div class="source-url">https://肥猫.love</div>
          <button class="copy-btn" @click="newSourceUrl = 'https://肥猫.love'">使用</button>
        </div>
        <div class="recommended-item">
          <div class="source-name">欧歌</div>
          <div class="source-url">https://www.ogsource.com/</div>
          <button class="copy-btn" @click="newSourceUrl = 'https://www.ogsource.com/'">使用</button>
        </div>
        <div class="recommended-item">
          <div class="source-name">海豚</div>
          <div class="source-url">https://raw.githubusercontent.com/FGBLH/GHK/main/海豚py.json</div>
          <button class="copy-btn" @click="newSourceUrl = 'https://raw.githubusercontent.com/FGBLH/GHK/main/海豚py.json'">使用</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-view {
  padding: 20px;
  color: #ffffff;
}

h1 {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 30px;
}

.settings-section {
  margin-bottom: 40px;
  background-color: #0f3460;
  border-radius: 8px;
  padding: 20px;

  h2 {
    font-size: 18px;
    font-weight: 500;
    margin-bottom: 10px;
    color: #e94560;
  }

  .section-desc {
    color: #888;
    margin-bottom: 20px;
  }
}

.add-source-form {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;

  label {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
    color: #888;
  }

  input {
    width: 100%;
    padding: 10px 12px;
    background-color: #1a1a2e;
    border: 1px solid #333;
    border-radius: 4px;
    color: #ffffff;
    font-size: 14px;

    &::placeholder {
      color: #666;
    }

    &:focus {
      outline: none;
      border-color: #e94560;
    }
  }
}

.add-btn {
  width: 100%;
  padding: 12px;
  background-color: #e94560;
  color: #fff;
  border: none;
  border-radius: 4px;
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

.message {
  padding: 10px;
  margin-bottom: 20px;
  border-radius: 4px;
  background-color: #1a1a2e;

  &.error {
    background-color: #e94560;
  }
}

.sources-list {
  background-color: #1a1a2e;
  border-radius: 4px;
  overflow: hidden;
}

.source-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #0f3460;

  &:last-child {
    border-bottom: none;
  }

  &.active {
    background-color: rgba(233, 69, 96, 0.1);
  }
}

.source-info {
  flex: 1;
}

.source-name {
  font-size: 16px;
  margin-bottom: 5px;
}

.source-url {
  font-size: 12px;
  color: #888;
}

.source-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.activate-btn {
  padding: 6px 12px;
  background-color: #e94560;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #d63851;
  }
}

.active-badge {
  padding: 6px 12px;
  background-color: #4caf50;
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
}

.remove-btn {
  padding: 6px 12px;
  background-color: #666;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #888;
  }
}

.loading {
  padding: 20px;
  text-align: center;
  color: #666;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #666;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #1a1a2e;
}

.setting-label {
  font-size: 14px;
}

.toggle-btn {
  padding: 8px 16px;
  background-color: #666;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &.active {
    background-color: #4caf50;
  }
}

.setting-info {
  margin-top: 10px;
  padding: 10px;
  background-color: #1a1a2e;
  border-radius: 4px;
}

.info-item {
  font-size: 14px;
  color: #888;
}

.doh-servers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.doh-item {
  padding: 15px;
  background-color: #1a1a2e;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #2a2a4e;
  }

  &.active {
    background-color: #e94560;
  }
}

.doh-name {
  font-size: 16px;
  margin-bottom: 5px;
}

.doh-url {
  font-size: 12px;
  color: #888;
}

.scan-btn {
  padding: 10px 20px;
  background-color: #e94560;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #d63851;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.device-list {
  margin-top: 15px;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #1a1a2e;
  border-radius: 4px;
  margin-bottom: 10px;
}

.device-name {
  font-size: 16px;
  margin-bottom: 5px;
}

.device-info {
  font-size: 12px;
  color: #888;
}

.cast-btn {
  padding: 8px 16px;
  background-color: #e94560;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #d63851;
  }
}

.keyboard-bindings {
  margin-top: 15px;
}

.binding-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: #1a1a2e;
  border-radius: 4px;
  margin-bottom: 5px;
}

.binding-key {
  width: 100px;
  padding: 5px 10px;
  background-color: #0f3460;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  margin-right: 15px;
}

.binding-desc {
  font-size: 14px;
  color: #888;
}

.recommended-sources {
  background-color: #1a1a2e;
  border-radius: 4px;
  overflow: hidden;
}

.recommended-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #0f3460;

  &:last-child {
    border-bottom: none;
  }
}

.copy-btn {
  padding: 6px 12px;
  background-color: #e94560;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #d63851;
  }
}
</style>
