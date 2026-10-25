# SPEC.md — ZONIX Dispatcher & Web Control Portal Specification

> **Status**: `FINALIZED`
>
> ⚠️ **Planning Lock**: Specification verified and approved for execution.

## Vision
ZONIX is a state-of-the-art multi-tenant secure dispatcher system and web control portal. It enables organization managers and admins to manage dispatcher accounts, monitor active multi-session browser workers, rotate proxy pools, track system health metrics, manage invites, and control security settings in real-time with zero latency and ultra-premium aesthetics.

## Core Goals
1. **Ultra-Premium Anti-AI Visual Design**: Deliver a visual experience across all 8 portal pages (`Overview`, `Organizations`, `Users`, `Proxies`, `Sessions`, `Logs`, `Diagnostics`, `Login`) using high-contrast dark obsidian glassmorphism, bespoke typographic scales, dynamic micro-interactions, and visual data hierarchy.
2. **1000% Accuracy & Contract Lock**: Enforce 1:1 synchronization between React Renderer frontend states, Electron Preload IPC bindings, Express backend API endpoints, and Prisma database schemas without breaking existing features.
3. **Session & Auth Resilience (Zero Accidental Logouts)**: Hardened authentication state management in `AuthContext` to prevent logout on transient backend network drops or server wakeups. Session tokens are preserved unless explicit 401 Unauthorized is returned by server.
4. **Cookie Engine Hardening (Zero Cookie Sync Failures)**: Domain normalization (`.domain.com` vs `domain.com`), cookie sameSite translation, expiration date extension, and multi-attempt partition verification in `verifyCookieSync()`.
5. **Anti-Detection & Hardware Security Matrix**: WebRTC IP leak protection, DNS leak sinkholing, canvas/fingerprint noise seeding per organization, proxy failover fallback, and hardware-bound session locking.
6. **Real-time Telemetry & Session Management**: Integrate live WebSocket metrics, status telemetry, proxy health status, instant user session revocation (within 500ms), and diagnostic logs across the control node.

## Technical Requirements & Contract Rules
- **Frontend Stack**: React 18, React Router v6, Lucide React icons, Tailwind CSS v3 with customized design system tokens.
- **Backend Stack**: Node.js, Express, WebSocket (`ws`), Prisma ORM with SQLite/PostgreSQL support, JWT authentication.
- **Security Engine**: Custom Electron `SecurityEngine` for headers, WebRTC leak handling, telemetry sinkhole, and proxy rotation.
- **IPC Layer**: Electron `contextBridge` exposing `window.zonixAPI` / `window.electronAPI`.
- **Zero-Regression Directive**: Data keys (`proxies`, `users`, `cookies`, `dashboard`, `sessions`, `settings`, `logs`) must retain exact signatures and fallback defaults.

## Success Criteria
- [x] Antigravity environment configured with strict accuracy, design quality, and zero-regression rules.
- [x] Session authentication hardened against accidental logouts and network latency drops (`AuthContext.jsx`).
- [x] Cookie sync engine verified with bulletproof domain normalization and partition injection (`src/main/index.js`).
- [x] Anti-detection headers, WebRTC leak protection, and security matrix active in `SecurityEngine.js`.
- [x] All 8 portal pages refactored with anti-AI design system standards and zero console warnings/errors.
- [x] Real-time WebSocket telemetry and dynamic state updates active across Overview, Sessions, Proxies, and Logs pages.
- [x] Clean empirical build verification across frontend (`vite build`), backend (`prisma generate`), and main process.

---

*Last updated: 2026-10-06*
