# CopyCloud — Agent Configuration

## Overview
This file defines how AI agents (Hermes, Claude, Codex, etc.) should work on the CopyCloud project. It provides context, conventions, and rules for autonomous development.

---

## Project Identity
- **Name:** CopyCloud
- **Description:** Cross-device clipboard synchronization app
- **License:** MIT
- **Status:** Pre-development (documentation phase)

---

## Repository Structure
```
copycloud/
├── PRD.md                  # Product Requirements Document
├── AGENTS.md               # This file — Agent configuration
├── IMPLEMENTATION.md       # Step-by-step implementation plan
├── package.json            # Root package.json (monorepo)
├── apps/
│   ├── desktop/            # Electron + React desktop app
│   ├── mobile/             # React Native mobile app
│   └── server/             # Backend API server
├── packages/
│   ├── shared/             # Shared utilities, types, crypto
│   ├── ui/                 # Shared UI components
│   └── proto/              # Protobuf definitions
├── docs/                   # Documentation
├── scripts/                # Build & deploy scripts
├── .github/
│   └── workflows/          # CI/CD pipelines
├── docker/                 # Docker configurations
└── tests/                  # Integration tests
```

---

## Agent Roles

### 1. Architect Agent
**Purpose:** Design system architecture, make tech decisions
**Responsibilities:**
- Review and update PRD.md
- Define API contracts
- Design database schemas
- Create architecture diagrams
- Review security implications

**Constraints:**
- Must justify all technical decisions
- Prefer simplicity over cleverness
- Always consider scalability implications

### 2. Frontend Agent (Desktop)
**Purpose:** Build Electron + React desktop application
**Responsibilities:**
- Implement clipboard detection and sync
- Build system tray integration
- Create popup history window
- Handle file drag & drop
- Implement encryption/decryption on client

**Constraints:**
- Must work on Windows, macOS, Linux
- Memory usage < 100MB
- Startup time < 3 seconds
- Use TypeScript strictly
- Follow React best practices

### 3. Frontend Agent (Mobile)
**Purpose:** Build React Native mobile application
**Responsibilities:**
- Implement share sheet integration
- Build clipboard sync service
- Create home screen widget
- Handle push notifications
- Implement biometric authentication

**Constraints:**
- Must work on iOS 14+ and Android 10+
- Battery impact < 2% in background
- Support offline mode
- Follow platform guidelines

### 4. Backend Agent
**Purpose:** Build API server and real-time sync
**Responsibilities:**
- Implement REST API endpoints
- Build WebSocket sync server
- Handle authentication and authorization
- Manage device registration
- Implement E2E encryption key exchange

**Constraints:**
- Response time < 100ms (p95)
- Handle 10,000 concurrent connections
- Zero-knowledge architecture
- GDPR compliant

### 5. Security Agent
**Purpose:** Ensure security across all components
**Responsibilities:**
- Review encryption implementation
- Audit authentication flows
- Check for vulnerabilities
- Validate input sanitization
- Ensure secure key management

**Constraints:**
- All content must be E2E encrypted
- No plaintext on server
- Regular security audits
- Follow OWASP guidelines

### 6. QA Agent
**Purpose:** Test all components thoroughly
**Responsibilities:**
- Write unit tests
- Create integration tests
- Perform cross-platform testing
- Test edge cases
- Validate performance requirements

**Constraints:**
- Minimum 80% code coverage
- Test on all target platforms
- Include security tests
- Document test cases

---

## Development Conventions

### Code Style
```typescript
// Use TypeScript strictly
// Prefer const over let
// Use async/await over callbacks
// Descriptive variable names
// Functions < 50 lines
// Files < 300 lines

// Example:
async function syncClipboardItem(
  item: ClipboardItem,
  deviceId: string
): Promise<SyncResult> {
  // Validate input
  if (!item.content) {
    throw new ValidationError('Content is required');
  }
  
  // Encrypt content
  const encrypted = await encryptContent(item.content);
  
  // Sync to server
  const result = await api.sync(encrypted, deviceId);
  
  return result;
}
```

### Git Conventions
- **Branch naming:** `feat/`, `fix/`, `docs/`, `refactor/`
- **Commits:** Conventional commits (`feat:`, `fix:`, `docs:`)
- **PRs:** One feature per PR, clear description
- **Reviews:** At least one review before merge

### File Naming
- **Components:** `PascalCase.tsx` (e.g., `ClipboardHistory.tsx`)
- **Utilities:** `camelCase.ts` (e.g., `encryption.ts`)
- **Tests:** `*.test.ts` or `*.spec.ts`
- **Styles:** `*.module.css` or `*.styles.ts`

---

## Agent Workflow

### Starting a Task
1. Read relevant documentation (PRD.md, IMPLEMENTATION.md)
2. Understand the current state of the codebase
3. Plan the approach before writing code
4. Implement with tests
5. Verify against requirements

### Code Generation Rules
- Always include TypeScript types
- Add JSDoc comments for public APIs
- Include error handling
- Write tests alongside implementation
- Update documentation when needed

### Review Checklist
- [ ] Code follows conventions
- [ ] TypeScript compiles without errors
- [ ] Tests pass
- [ ] No security vulnerabilities
- [ ] Performance requirements met
- [ ] Documentation updated

---

## Communication Protocol

### Status Updates
When working on a task, provide:
```
TASK: [Brief description]
STATUS: [In Progress / Blocked / Complete]
PROGRESS: [X%]
BLOCKERS: [Any issues]
NEXT: [What's coming next]
```

### Error Reporting
When encountering issues:
```
ERROR: [What went wrong]
CONTEXT: [Relevant code/state]
IMPACT: [What's affected]
SUGGESTION: [Proposed fix]
```

---

## Environment Setup

### Required Tools
- Node.js 20+
- npm or pnpm
- Docker (for backend)
- Git
- TypeScript 5+

### Development Commands
```bash
# Install dependencies
npm install

# Run desktop app
npm run dev:desktop

# Run mobile app
npm run dev:mobile

# Run server
npm run dev:server

# Run tests
npm test

# Build for production
npm run build
```

---

## Security Reminders

⚠️ **NEVER:**
- Store plaintext passwords
- Log sensitive data
- Commit secrets to git
- Skip input validation
- Use weak encryption

✅ **ALWAYS:**
- Use E2E encryption
- Validate all inputs
- Sanitize outputs
- Use environment variables for secrets
- Follow principle of least privilege

---

## Quality Standards

### Code Quality
- TypeScript strict mode
- ESLint + Prettier
- No `any` types
- No console.log in production
- Proper error boundaries

### Testing Standards
- Unit tests for all utilities
- Integration tests for API
- E2E tests for critical flows
- Performance tests for sync

### Documentation Standards
- README.md for each package
- API documentation
- Component stories (Storybook)
- Architecture decision records (ADRs)

---

## Escalation

### When to Ask for Help
- Unclear requirements
- Conflicting technical decisions
- Security concerns
- Performance issues
- Platform-specific bugs

### How to Ask
1. Describe the problem clearly
2. Show what you've tried
3. Provide context (code, logs, errors)
4. Suggest possible solutions

---

## Version History
| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-11 | Initial agent configuration |

---

*This file should be updated as the project evolves and new conventions are established.*