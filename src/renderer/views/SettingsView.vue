<script setup lang="ts">
import { ref, onMounted } from 'vue'

const sources = ref<any[]>([])
const newSourceUrl = ref('')
const newSourceName = ref('')
const loading = ref(false)
const message = ref('')

onMounted(async () => {
  await loadSources()
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

const addSource = async () => {
  if (!newSourceUrl.value.trim()) return

  loading.value = true
  message.value = ''

  try {
    // Load the source first to validate it
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
</script>

<template>
  <div class="settings-view">
    <h1>设置</h1>

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
  background-color: #0f3460;
  padding: 20px;
  border-radius: 8px;
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
  background-color: #0f3460;

  &.error {
    background-color: #e94560;
  }
}

.sources-list {
  background-color: #0f3460;
  border-radius: 8px;
  overflow: hidden;
}

.source-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #1a1a2e;

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

.recommended-sources {
  background-color: #0f3460;
  border-radius: 8px;
  overflow: hidden;
}

.recommended-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #1a1a2e;

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
