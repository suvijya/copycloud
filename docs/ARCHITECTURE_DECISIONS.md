# Architecture Decision Records

## ADR-001: Use Fastify over Express

**Status:** Accepted

**Context:**
Need a web framework for the server.

**Decision:**
Use Fastify for better performance and TypeScript support.

**Consequences:**
- Faster request handling
- Better type inference
- Smaller ecosystem than Express

## ADR-002: Monorepo with npm Workspaces

**Status:** Accepted

**Context:**
Multiple packages need to share code.

**Decision:**
Use npm workspaces for monorepo management.

**Consequences:**
- Shared dependencies
- Atomic commits
- Complex CI setup

## ADR-003: WebSocket for Real-time

**Status:** Accepted

**Context:**
Need real-time clipboard sync.

**Decision:**
Use WebSocket (ws library) for bidirectional communication.

**Consequences:**
- Low latency updates
- Connection management complexity
- Scale considerations

## ADR-004: JWT for Authentication

**Status:** Accepted

**Context:**
Need stateless authentication.

**Decision:**
Use JWT tokens with refresh mechanism.

**Consequences:**
- Stateless server
- Token management complexity
- Revocation challenges
