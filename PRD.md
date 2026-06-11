# CopyCloud — Product Requirements Document

## Overview
CopyCloud is a lightweight, open-source cross-device clipboard synchronization tool that enables seamless copy-paste of text, images, files, and other clipboard content across desktop (Windows, macOS, Linux), mobile (iOS, Android), and laptops in real-time.

---

## Vision
> *"Copy once, paste everywhere."*

A frictionless, privacy-first clipboard cloud that works across all your devices without requiring manual setup or complex configuration.

---

## Problem Statement
- Users constantly switch between devices (phone ↔ laptop ↔ desktop)
- Copying text/images/files from one device to another requires workarounds (email, messaging apps, cloud drives)
- Existing solutions are either **paid**, **bloated**, **privacy-invasive**, or **missing features**
- No single solution handles **all clipboard types** (text, rich text, images, files, code snippets)

---

## Target Users
| Segment | Use Case |
|---------|----------|
| Developers | Copy code snippets, terminal outputs between machines |
| Students | Copy notes, screenshots between phone and laptop |
| Professionals | Share text, documents across work/personal devices |
| Content Creators | Move images, text drafts between devices |
| General Users | Simple clipboard sync for daily use |

---

## Core Features

### MVP (v1.0) — 30-day target

#### 1. Cross-Device Clipboard Sync
- **Text sync** — Plain text, rich text, HTML, markdown
- **Image sync** — Screenshots, copied images (max 10MB per item)
- **Code sync** — Syntax-highlighted code blocks
- **Auto-sync** — Clipboard changes detected and synced within 2 seconds

#### 2. Device Management
- **Multi-device support** — Up to 10 devices per account
- **Device naming** — Custom names (e.g., "My iPhone", "Work Laptop")
- **Device status** — Online/offline indicators
- **Selective sync** — Choose which devices to sync with

#### 3. Clipboard History
- **Last 100 items** — Scrollable history with search
- **Pin favorites** — Keep important clips pinned
- **Categories** — Auto-categorize: Text, Images, Code, Links
- **Timestamps** — When each item was copied

#### 4. Security & Privacy
- **E2E encryption** — AES-256 for all synced content
- **Zero-knowledge** — Server never sees plaintext
- **Local-first** — Works on LAN without internet
- **Data retention** — Configurable auto-delete (1hr, 24hr, 7 days, 30 days, never)

#### 5. Quick Actions
- **Paste as plain text** — Strip formatting option
- **Share link** — Generate shareable link for any clip
- **QR code transfer** — Quick phone ↔ PC transfer via QR
- **Drag & drop** — Drag clips between devices

---

### v1.1 — Enhanced Features

#### 6. File Transfer
- **Any file type** — Documents, PDFs, ZIPs (max 100MB)
- **Progress tracking** — Upload/download progress bars
- **Resume support** — Interrupted transfers resume automatically

#### 7. Smart Paste
- **Context-aware** — Auto-detect content type and paste appropriately
- **URL detection** — Open links in browser when pasting
- **Email detection** — Open in mail client
- **Phone numbers** — Open in dialer
- **Addresses** — Open in maps

#### 8. Collections
- **Clipboards** — Multiple named clipboards (Work, Personal, Code)
- **Shared collections** — Share specific collections with other users
- **Export** — Export collection as JSON/CSV/text

---

### v2.0 — Advanced Features

#### 9. Team Features
- **Shared workspaces** — Teams share clipboards
- **Role management** — Admin, editor, viewer roles
- **Audit logs** — Track who copied what

#### 10. Developer Tools
- **API access** — REST API for automation
- **Webhooks** — Trigger on clipboard events
- **CLI tool** — Command-line interface for power users

#### 11. AI Integration (Optional)
- **Smart suggestions** — AI suggests relevant past clips
- **Auto-categorize** — ML-based content classification
- **Summarize** — AI summaries of long text clips

---

## Technical Architecture

### System Design
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Desktop   │◄──►│   Cloud     │◄──►│   Mobile    │
│   Client    │    │   Server    │    │   Client    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌─────────────┐
                    │   Database  │
                    │  (Encrypted)│
                    └─────────────┘
```

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Desktop Client | **Electron + React** | Cross-platform, small footprint (~50MB) |
| Mobile Client | **React Native** | Code sharing with desktop |
| Backend | **Node.js + Fastify** | Fast, lightweight, TypeScript |
| Database | **PostgreSQL + Redis** | Relational + caching |
| Real-time | **WebSocket (Socket.io)** | Bidirectional sync |
| Encryption | **libsodium** | Modern, audited crypto |
| Storage | **S3-compatible** | Encrypted blob storage |
| CI/CD | **GitHub Actions** | Automated builds |
| Deployment | **Docker + Fly.io** | Simple, scalable |

### Data Models

#### User
```typescript
interface User {
  id: string;
  email: string;
  password_hash: string;
  encryption_key: string; // Derived from password
  created_at: Date;
  plan: 'free' | 'pro';
}
```

#### Device
```typescript
interface Device {
  id: string;
  user_id: string;
  name: string;
  platform: 'windows' | 'macos' | 'linux' | 'ios' | 'android';
  last_seen: Date;
  is_online: boolean;
  push_token?: string;
}
```

#### ClipboardItem
```typescript
interface ClipboardItem {
  id: string;
  user_id: string;
  device_id: string;
  content_type: 'text' | 'image' | 'file' | 'rich_text';
  encrypted_content: string;
  metadata: {
    size: number;
    format?: string;
    filename?: string;
    pinned: boolean;
    category?: string;
  };
  created_at: Date;
  expires_at?: Date;
}
```

---

## UI/UX Specifications

### Desktop App
- **System tray icon** — Always running, minimal
- **Popup window** — Cmd/Ctrl+Shift+V to show history
- **Settings panel** — Configure devices, encryption, sync
- **Drag & drop zone** — Drop files to send to other devices

### Mobile App
- **Share sheet integration** — "Copy to CopyCloud" in share menu
- **Widget** — Quick paste from home screen
- **Push notifications** — Alert when new item synced
- **Biometric unlock** — Face ID / Fingerprint for security

---

## Performance Requirements
| Metric | Target |
|--------|--------|
| Sync latency | < 2 seconds (same network) |
| Sync latency | < 5 seconds (cross-network) |
| Memory usage | < 100MB (desktop) |
| Battery impact | < 2% (mobile, background) |
| Startup time | < 3 seconds |
| Uptime | 99.9% |

---

## Security Requirements
- [ ] E2E encryption for all content
- [ ] Zero-knowledge architecture
- [ ] No plaintext stored on server
- [ ] Secure key derivation (Argon2)
- [ ] Rate limiting on API
- [ ] Input validation and sanitization
- [ ] GDPR compliance
- [ ] Regular security audits

---

## Monetization (Future)
| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | 3 devices, 100 clips, 7-day retention |
| Pro | $4.99/mo | 10 devices, unlimited clips, 30-day retention, file transfer |
| Team | $9.99/mo/user | Shared workspaces, admin controls, audit logs |

---

## Success Metrics
| Metric | Target (6 months) |
|--------|-------------------|
| Active users | 10,000 |
| Daily active users | 2,000 |
| Avg. clips synced/day | 50,000 |
| User retention (30-day) | 40% |
| App store rating | 4.5+ |

---

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Platform clipboard APIs vary | High | Abstract clipboard layer, test each platform |
| Large file sync performance | Medium | Chunked uploads, compression, resumable transfers |
| Security breach | Critical | E2E encryption, regular audits, bug bounty |
| App store rejection | Medium | Follow guidelines, test thoroughly |
| Competition (Paste, Copied) | Medium | Open-source, privacy-first, cross-platform |

---

## Timeline
| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **MVP** | 4 weeks | Desktop + basic sync |
| **v1.0** | +2 weeks | Mobile + full features |
| **v1.1** | +4 weeks | File transfer + smart paste |
| **v2.0** | +8 weeks | Teams + API + AI |

---

## Appendix
- **Inspiration:** Paste (macOS), Copied (iOS), Clipt, KDE Connect
- **Competitors:** Paste, Copied, Clipy, Ditto, ClipboardFusion
- **Open Source:** Yes — MIT License