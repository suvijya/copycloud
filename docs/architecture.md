# CopyCloud Architecture

## Overview

CopyCloud is a cross-device clipboard sync application.

## Components

### Desktop (Electron)
- System tray integration
- Clipboard monitoring
- WebSocket connection to server

### Server (Fastify)
- REST API for clipboard data
- WebSocket for real-time sync
- JWT authentication

### Mobile (React Native)
- Clipboard access
- Push notifications
- Background sync

## Data Flow

1. Device A copies text
2. Electron captures clipboard change
3. Sends to server via WebSocket
4. Server broadcasts to all connected devices
5. Device B receives and updates clipboard
