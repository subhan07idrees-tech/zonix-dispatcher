# Antigravity Workspace Rules & Directives

> **System Profile:** ZONIX Web Admin Control Portal & Electron Dispatcher System
> **Fidelity Goal:** 1000% Accuracy | Zero Regressions | Zero Bugs | Bespoke Modern UI Design

---

## Core Operational Directives

1. **Zero-Regression Rule & Contract Lock**
   - Before modifying UI, renderer code, or API handlers: inspect backend API endpoints, data response property keys (`proxies`, `users`, `cookies`, `dashboard`, `sessions`, `settings`, `logs`), IPC channel definitions, and handler signatures first.
   - NEVER break or disconnect existing features, data rendering, WebSocket listeners, or control buttons when making UI changes.

2. **1000% Accuracy & Search-First Discipline**
   - NEVER guess variable names, IPC channels, endpoint routes, or component prop structures.
   - Always perform targeted search (`grep_search`) to verify exact definitions before making changes.
   - Modular Rules:
     - [Accuracy & Quality Rules](file:///c:/Users/LapTech%20Solution/Desktop/New%20OpenCode%20Project/zonix-root/.agents/rules/accuracy-and-quality.md)
     - [Backend & API Safeguards](file:///c:/Users/LapTech%20Solution/Desktop/New%20OpenCode%20Project/zonix-root/.agents/rules/backend-and-api-contracts.md)

3. **Anti-AI Bespoke UI & Aesthetics Standard**
   - Apply the `design-quality` skill before writing any frontend/UI styling code.
   - Modular Rules: [Premium UI & Anti-AI Design Rules](file:///c:/Users/LapTech%20Solution/Desktop/New%20OpenCode%20Project/zonix-root/.agents/rules/design-system-and-ui.md)
   - Prohibit default purple-to-blue gradients, Lucide icon soup, generic centered white cards, or plain unstyled Tailwind defaults.
   - Enforce distinct typography, intentional dark/light color schemes, dynamic micro-interactions, sleek glassmorphism, and responsive feedback.

4. **Empirical Verification Requirement**
   - NEVER declare completion without verifying build and execution cleanly.
   - Run `cmd /c "npm run build"` in `src/renderer` for UI verification.
   - Run `cmd /c "npm run build"` in `src/backend` for backend/Prisma verification.

5. **Autonomous Non-Interactive Execution (Zero Permission Prompts)**
   - NEVER ask the user for permission to execute terminal commands, builds, or git operations.
   - Keep CLI commands concise and deterministic to avoid triggering IDE safety confirmation modals.
   - Always auto-build, auto-commit, and auto-push updates to GitHub autonomously without seeking approval.
