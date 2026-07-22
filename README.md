# CopyCloud

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.0-black.svg)](https://www.fastify.io/)
[![Electron](https://img.shields.io/badge/Electron-28+-blue.svg)](https://www.electronjs.org/)

> *"Copy once, paste everywhere."*

A cross-device clipboard synchronization tool for seamless copy and paste across all your devices.

## Features

- 🔄 **Real-time sync** — Clipboard changes sync within 2 seconds
- 🔒 **E2E encryption** — AES-256-GCM encryption for all content
- 📱 **Cross-platform** — Windows, macOS, Linux, iOS, Android
- 📋 **Clipboard history** — Last 100 items with search
- 🏷️ **Auto-categorization** — Text, images, code, links
- 📌 **Pin favorites** — Keep important clips pinned

## Tech Stack

- **Desktop:** Electron + React
- **Mobile:** React Native
- **Backend:** Node.js + Fastify
- **Database:** PostgreSQL + Redis
- **Real-time:** WebSocket (Socket.io)
- **Encryption:** AES-256-GCM

## Quick Start

### Prerequisites

- Node.js 20+

### Installation

```bash
# Clone the repo
git clone https://github.com/suvijya/copycloud.git
cd copycloud

# Install all dependencies (monorepo)
npm install

# Build shared package
npm run build:shared

# Start server
npm run dev:server

# Start desktop app
npm run dev:desktop
```

The server runs on `http://localhost:3000` by default (configurable via the `PORT` environment variable).

## Project Structure

```
copycloud/
├── apps/
│   ├── desktop/          # Electron desktop app
│   ├── mobile/           # React Native mobile app
│   └── server/           # Fastify backend server
├── packages/
│   ├── shared/           # Shared types and utilities
│   ├── ui/               # Shared UI components
│   └── proto/            # Protocol definitions
├── docker/               # Docker configuration
├── docs/                 # Documentation
└── .github/workflows/    # CI/CD pipelines
```

## API Endpoints

### Authentication
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login

### Clipboard
- `GET /api/clipboard` — Get all clips
- `POST /api/clipboard` — Add new clip
- `DELETE /api/clipboard/:id` — Delete clip
- `PATCH /api/clipboard/:id/pin` — Toggle pin

### Devices
- `GET /api/devices` — Get all devices
- `POST /api/devices/register` — Register device
- `PATCH /api/devices/:id/status` — Update status
- `DELETE /api/devices/:id` — Remove device

### WebSocket
- `ws://localhost:3000/ws` — Real-time clipboard sync

## Environment Variables

```bash
JWT_SECRET=<your-random-secret-here>
PORT=3000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

> **Tip:** Keep your fork in sync by running `git fetch upstream && git merge upstream/master` before starting new work to avoid merge conflicts.

## License

MIT © Suvijya Arya
