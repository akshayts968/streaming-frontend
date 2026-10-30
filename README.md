# Antigravity Stream - Modern Video Streaming Frontend

A production-ready Netflix/Hotstar-style video streaming frontend application built with Next.js 16 (App Router & Turbopack), React 19, and Tailwind CSS.

---

## 🎬 Features

* **Custom Netflix-Style HTML5 Video Player (`VideoPlayer.js`)**:
  - Dual HLS (`hls.js`) and progressive MP4 streaming support.
  - Multi-language audio switching and subtitle menu (CC).
  - Dedicated subtitle upload support (`.srt` and `.vtt`).
  - High-visibility subtitles overlay with immediate cue feedback badge.
  - Keyboard shortcuts (`Space`/`k` to play/pause, `j`/`l` to skip 10s, `c` to toggle subtitles, `f` for fullscreen, `m` for mute).
  - Video rotation (0°, 90°, 180°, 270°).
* **Hover Scene Preview (`VideoSeekPreview.jsx`)**:
  - Dynamic thumbnail previews along the progress bar using WebVTT sprite storyboard sheets.
* **Auto-Resume & Progress Persistence**:
  - Automatically remembers watch position per movie in `localStorage`.
  - Displays instant resumption toast (`Resuming from MM:SS`) upon loading.
* **Episode Prefetching**:
  - Prefetches the next episode manifest when the current video reaches 70% or 30s remaining.
* **Paywall & Preview Tracking**:
  - Timed preview system for unregistered guests with payment modal triggers.
* **Admin Dashboard**:
  - Manage and link video catalog entries and TV series.

---

## 🛠️ Tech Stack

* **Framework**: Next.js 16 (Turbopack) & React 19
* **Styling**: Modern Glassmorphism CSS & Lucide React icons
* **Media Client**: `hls.js`
* **Containerization**: Multi-stage Docker production image

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup (`.env.local`)
Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Docker Deployment

Build and run standalone:
```bash
docker build -t antigravity-frontend:latest .

docker run -d \
  --name antigravity-frontend \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:5001 \
  antigravity-frontend:latest
```

Or run together with the backend using Docker Compose from the root workspace:
```bash
docker compose up -d
```
