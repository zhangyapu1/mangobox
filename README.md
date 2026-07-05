# MangoBox

PC端TVBox完整克隆 - Electron + Vue 3 + mpv + Python Spider

## 功能特性

- 🎬 支持TVBox JSON源配置
- 📺 IPTV直播，秒切台
- 🔍 跨源搜索
- ❤️ 收藏和历史记录
- 🎮 mpv播放器，格式支持广泛
- 🐍 Python Spider支持
- 📦 Windows便携版，免安装

## 技术栈

- Electron 33+
- Vue 3 + TypeScript + Vite
- Naive UI
- mpv (播放器)
- Python 3.10+ (Spider执行)
- SQLite (数据存储)

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

## 目录结构

```
mangobox/
├── src/
│   ├── main/          # Electron主进程
│   ├── renderer/      # Vue3前端
│   └── shared/        # 共享代码
├── resources/         # 打包资源
│   ├── mpv/          # mpv播放器
│   └── python/       # 嵌入式Python
└── package.json
```

## 许可证

MIT License
