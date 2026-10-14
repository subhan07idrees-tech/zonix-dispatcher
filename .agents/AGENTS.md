# Antigravity Workspace Rules & Directives

> **System Profile:** ZONIX Web Admin Control Portal & Electron Dispatcher System
> **Fidelity Goal:** 1000% Accuracy | Zero Regressions | Zero Bugs | Bespoke Modern UI Design

---

## Core Operational Directives

1. **Mandatory Plan Alignment & Proposal (Discuss Before Doing)**
   - Before writing code, editing files, applying architecture changes, or making state modifications:
   - You MUST explicitly discuss and outline your plan to the user FIRST.
   - Detail the root cause, proposed changes, specific files to be touched, and anticipated outcomes.
   - Give suggestions and await user alignment before executing modifications.

2. **Zero-Regression Rule & Contract Lock**
   - Before modifying UI, renderer code, or API handlers: inspect backend API endpoints, data response property keys (`proxies`, `users`, `cookies`, `dashboard`, `sessions`, `settings`, `logs`), IPC channel definitions, and handler signatures first.
   - NEVER break or disconnect existing features, data rendering, WebSocket listeners, or control buttons when making UI changes.

3. **1000% Accuracy & Search-First Discipline**
   - NEVER guess variable names, IPC channels, endpoint routes, or component prop structures.
   - Always perform targeted search (`grep_search`) to verify exact definitions before making changes.
   - Modular Rules:
     - [Accuracy & Quality Rules](file:///c:/Users/LapTech%20Solution/Desktop/New%20OpenCode%20Project/zonix-root/.agents/rules/accuracy-and-quality.md)
     - [Backend & API Safeguards](file:///c:/Users/LapTech%20Solution/Desktop/New%20OpenCode%20Project/zonix-root/.agents/rules/backend-and-api-contracts.md)

4. **Anti-AI Bespoke UI & Aesthetics Standard**
   - Apply the `design-quality` skill before writing any frontend/UI styling code.
   - Modular Rules: [Premium UI & Anti-AI Design Rules](file:///c:/Users/LapTech%20Solution/Desktop/New%20OpenCode%20Project/zonix-root/.agents/rules/design-system-and-ui.md)
   - Prohibit default purple-to-blue gradients, Lucide icon soup, generic centered white cards, or plain unstyled Tailwind defaults.
   - Enforce distinct typography, intentional dark/light color schemes, dynamic micro-interactions, sleek glassmorphism, and responsive feedback.

5. **Empirical Verification Requirement**
   - NEVER declare completion without verifying build and execution cleanly.
   - Run `cmd /c "npm run build"` in `src/renderer` for UI verification.
   - Run `cmd /c "npm run build"` in `src/backend` for backend/Prisma verification.

6. **Execution Discipline Within Approved Plans**
   - Once a plan is aligned and approved by the user, keep execution deterministic, verify builds cleanly, and commit and push updates with proper semantic tagging.
