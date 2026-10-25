# Accuracy & Quality Rules (1000% Accuracy Protocol)

> **Goal:** Zero bugs, zero regressions, 100% contract fidelity.

---

## 1. Plan-First & Discuss Proposal Before Doing
- **MANDATORY**: Before writing code, editing files, or executing system modifications, discuss your plan with the user FIRST.
- Present the root cause, proposed changes, specific files to be edited, and wait for confirmation/alignment.
- **NEVER** edit code based on assumptions or unverified guesses.
- Use `grep_search` to trace function definitions, parameters, and callers.
- Always check the full method signature, parameter types, and return values before calling or modifying it.

## 2. Zero Regression Rule
- Before editing frontend or backend code:
  - Identify all data response keys (`proxies`, `users`, `cookies`, `dashboard`, `sessions`, `settings`, `logs`).
  - Verify IPC handlers in `src/main` and `src/preload`.
  - Ensure zero breaking changes to existing REST endpoints or WebSocket message types.

## 3. Empirical Verification
- **NEVER** declare a task complete without running build/test verification commands.
- For renderer changes: verify Vite build completes without errors (`cmd /c "npm run build"` in `src/renderer`).
- For backend changes: verify Prisma & Node build completes without errors (`cmd /c "npm run build"` in `src/backend`).
- Always check output logs explicitly.

## 4. Shell Discipline (Windows Environment)
- Always run single shell commands. Do NOT chain commands with `&&` or `||`.
- Wrap npm commands with `cmd /c "npm run ..."` on Windows PowerShell to bypass execution policy blocks.
