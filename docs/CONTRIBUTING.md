# Development Guide

## Prerequisites

- Node.js 20+
- npm 9+
- Git

## Setup

```bash
git clone https://github.com/suvijya/copycloud.git
cd copycloud
npm install
```

## Project Structure

```
copycloud/
├── packages/
│   ├── shared/      # TypeScript types and utils
│   └── server/      # Fastify backend
├── apps/
│   ├── desktop/     # Electron app
│   └── mobile/      # React Native app
└── docs/            # Documentation
```

## Development Workflow

1. Create a branch: `git checkout -b feature/my-feature`
2. Make changes
3. Run tests: `npm test`
4. Commit: `git commit -m "feat: add my feature"`
5. Push: `git push origin feature/my-feature`
6. Open a PR

## Code Standards

- TypeScript strict mode
- ESLint for linting
- Prettier for formatting
- Conventional commits

## Testing

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
npm run test:coverage # Coverage report
```
