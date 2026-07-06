# Configuration Guide

## Environment Variables

### Server (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| NODE_ENV | development | Environment |
| JWT_SECRET | - | Secret for tokens |
| DATABASE_URL | - | Database connection |
| CORS_ORIGIN | * | Allowed origins |

### Desktop App

| Setting | Default | Description |
|---------|---------|-------------|
| autoStart | false | Launch on startup |
| minimizeToTray | true | Minimize to system tray |
| clipboardInterval | 1000 | Polling interval (ms) |
| maxHistory | 100 | Max clipboard entries |

## Config Files

### tsconfig.json
TypeScript configuration for strict mode.

### .eslintrc.js
ESLint rules for code quality.

### .prettierrc
Prettier formatting rules.

## Feature Flags

```typescript
const features = {
  enableFileSync: false,
  enableImageSync: true,
  enableEncryption: false,
  enableTeams: false,
};
```
