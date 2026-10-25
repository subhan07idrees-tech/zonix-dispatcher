# Backend & API Contract Safeguards

> **Goal:** Ensure zero data disconnects between Electron Main process, Preload IPC bridge, Express Backend, Prisma DB, and React Renderer.

---

## 1. IPC Bridge Integrity (`src/main` & `src/preload`)
- Preload contextBridge (`window.electronAPI` or `window.zonixAPI`) is the single source of truth for IPC communication.
- When modifying renderer API calls, inspect `src/preload/index.js` and `src/main/index.js` to ensure the channel name and parameters match 1:1.

## 2. Express Backend API Integrity (`src/backend`)
- Inspect route definitions in `src/backend/src/routes/` and controller handlers before making UI requests.
- Retain exact property key names in JSON responses (`proxies`, `users`, `cookies`, `dashboard`, `sessions`, `settings`, `logs`).
- Do not remove or alter existing backend middleware (JWT auth, role checks, rate limiters) unless explicitly instructed.

## 3. Database Schema Integrity (`src/backend/prisma/schema.prisma`)
- Run `cmd /c "npm run build"` in `src/backend` after any database schema changes to keep Prisma Client generated and synchronized.
