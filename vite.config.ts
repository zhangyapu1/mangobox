import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    electron({
      entry: 'src/main/index.ts',
      vite: {
        build: {
          outDir: 'dist-electron/main',
          rollupOptions: {
            external: ['electron']
          }
        }
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
