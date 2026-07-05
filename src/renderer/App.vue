<script setup lang="ts">
import TopTabs from './components/TopTabs.vue'
import SideNav from './components/SideNav.vue'
import PlayerView from './components/PlayerView.vue'
</script>

<template>
  <div class="app-container">
    <TopTabs />
    <div class="main-content">
      <SideNav />
      <div class="content-area">
        <router-view />
      </div>
      <PlayerView />
    </div>
  </div>
</template>

<style lang="scss">
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
