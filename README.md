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
- PostgreSQL
- Redis

### Installation

```bash
# Clone the repo
git clone https://github.com/suvijya/copycloud.git
cd copycloud

# Install all dependencies (monorepo)
pnpm install

# Build shared package
pnpm run build:shared

# Start server
pnpm run dev:server

# Start desktop app
pnpm run dev:desktop
```

The server runs on `http://localhost:3737` by default (configurable via the `PORT` environment variable).

### Docker

You can also run the full stack with Docker Compose, which provisions PostgreSQL, Redis, and the server automatically:

```bash
# Copy the environment template and set your secrets
cp .env.example .env   # edit JWT_SECRET and passwords before starting

# Start all services (server + Postgres + Redis)
docker compose -f docker/docker-compose.yml up -d

# Include the Nginx reverse proxy for production-like setup
docker compose -f docker/docker-compose.yml --profile production up -d
```

The Docker setup exposes the server on port `3737` by default (override with the `PORT` environment variable).

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
├── scripts/              # Utility scripts
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
- `ws://localhost:3737/ws` — Real-time clipboard sync

## Environment Variables

```bash
# Server
PORT=3737
HOST=0.0.0.0
NODE_ENV=development

# Auth
JWT_SECRET=your-random-secret-here
JWT_EXPIRES_IN=7d

# Database (individual fields or a single URL)
DATABASE_URL=postgresql://user:pass@localhost:5432/copycloud
DB_HOST=localhost
DB_PORT=5432
DB_USER=copycloud
DB_PASSWORD=copycloud
DB_NAME=copycloud

# Redis
REDIS_URL=redis://localhost:6379

# Rate limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# WebSocket
WS_MAX_PAYLOAD=1048576
WS_HEARTBEAT_INTERVAL=30000

# File storage
STORAGE_PATH=./storage
MAX_FILE_SIZE=10485760
OTP_EXPIRY=120000
```

## FAQ

**Q: What happens when a device goes offline?**
A: Clipboard content is stored securely in the database. When the device reconnects, it syncs any clips it missed automatically.

**Q: How is my clipboard data encrypted?**
A: All clipboard content is encrypted with AES-256-GCM using a key derived from your account credentials. Data is encrypted before leaving your device and can only be decrypted by your other authorized devices.

**Q: Can I use this without an internet connection?**
A: No — CopyCloud requires a network connection between your devices and the server for synchronization. However, clipboard history is cached locally so you can still access past clips offline.

**Q: Is there a limit to clipboard size?**
A: Text clips have no practical limit. Image clips are supported up to 10 MB. Very large items may experience slower sync times.

**Q: Which clipboard content types are supported?**
A: CopyCloud auto-categorizes content into text, images, code snippets, and URLs. All four types sync across devices with full encryption.

## Troubleshooting

**Server won't start**
- Ensure PostgreSQL and Redis are running and accessible.
- Verify your `DATABASE_URL` and `REDIS_URL` match your local setup.
- Check that port 3737 (or your configured `PORT`) is not already in use.

**Clipboard not syncing**
- Confirm both devices are registered and online (`GET /api/devices`).
- Check WebSocket connection in the browser developer console.
- Ensure `JWT_SECRET` is set and identical across server restarts.

**Docker build fails**
- Run `docker compose -f docker/docker-compose.yml down -v` to clear stale volumes, then rebuild.
- Make sure `.env` exists (copy from `.env.example`) with all required variables.

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

> **Tip:** Keep your fork in sync by running `git fetch upstream && git merge upstream/master` before starting new work to avoid merge conflicts.

## License

MIT © Suvijya Arya
