<script setup lang="ts">
import { ref } from 'vue'

const featuredVideos = ref([
  { id: 1, title: '示例电影1', cover: 'https://picsum.photos/200/300?random=1', rating: '8.5' },
  { id: 2, title: '示例电影2', cover: 'https://picsum.photos/200/300?random=2', rating: '9.0' },
  { id: 3, title: '示例电影3', cover: 'https://picsum.photos/200/300?random=3', rating: '7.8' },
  { id: 4, title: '示例电影4', cover: 'https://picsum.photos/200/300?random=4', rating: '8.2' }
])

const latestVideos = ref([
  { id: 5, title: '最新电影1', cover: 'https://picsum.photos/200/300?random=5', rating: '8.0' },
  { id: 6, title: '最新电影2', cover: 'https://picsum.photos/200/300?random=6', rating: '7.5' },
  { id: 7, title: '最新电影3', cover: 'https://picsum.photos/200/300?random=7', rating: '8.8' },
  { id: 8, title: '最新电影4', cover: 'https://picsum.photos/200/300?random=8', rating: '7.2' }
])
</script>

<template>
  <div class="home-view">
    <section class="section">
      <h2 class="section-title">推荐</h2>
      <div class="video-grid">
        <div class="video-card" v-for="video in featuredVideos" :key="video.id">
          <div class="card-cover">
            <img :src="video.cover" :alt="video.title">
            <div class="card-rating">{{ video.rating }}</div>
          </div>
          <div class="card-info">
            <h3 class="card-title">{{ video.title }}</h3>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">最新</h2>
      <div class="video-grid">
        <div class="video-card" v-for="video in latestVideos" :key="video.id">
          <div class="card-cover">
            <img :src="video.cover" :alt="video.title">
            <div class="card-rating">{{ video.rating }}</div>
          </div>
          <div class="card-info">
            <h3 class="card-title">{{ video.title }}</h3>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.home-view {
  padding: 20px;
}

.section {
  margin-bottom: 30px;
}

.section-title {
  font-size: 18px;
  font-weight: 500;
  color: #ffffff;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e94560;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.video-card {
  background-color: #0f3460;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  }
}

.card-cover {
  position: relative;
  aspect-ratio: 2/3;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.card-rating {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: #e94560;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.card-info {
  padding: 10px;
}

.card-title {
  font-size: 14px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
