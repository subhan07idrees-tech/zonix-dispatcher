# Premium UI & Anti-AI Design Rules

> **Goal:** Create state-of-the-art, bespoke visual designs that wow users and look like a multi-million dollar SaaS product — NOT generic AI placeholders.

---

## 1. Typography & Hierarchy
- Avoid default sans-serif font fallbacks where possible. Use distinctive Google Fonts (e.g., Inter, Outfit, Plus Jakarta Sans, Syne, JetBrains Mono).
- Enforce clear typographic scale with explicit font weights and line heights.
- Use sentence case for section headers (calm and premium) instead of ugly ALL CAPS everywhere.

## 2. Color System & Aesthetics
- **STRICT PROHIBITION:** No default purple-to-blue generic AI gradients.
- **STRICT PROHIBITION:** No neon icon soup on dark mode cards.
- Curate cohesive color palettes:
  - Rich dark mode: Deep obsidian `#0b0f17`, slate `#111827`, glass overlays (`rgba(255,255,255,0.03)` with `backdrop-filter: blur(12px)`), subtle 1px border highlights (`rgba(255,255,255,0.08)`).
  - Accent colors used with intent — single dominant accent (e.g., Electric Emerald `#10b981`, Cyber Cyan `#06b6d4`, or Amber Gold `#f59e0b`).
  - Muted borders, refined shadows, and depth layering.

## 3. Dynamic Micro-Interactions & Motion
- Add subtle hover states (`hover:-translate-y-0.5`, smooth color transitions `transition-all duration-200`).
- Interactive elements must provide immediate visual feedback (active pressed states, glowing focal borders, responsive hover effects).
- Custom subtle scrollbars and status indicators.

## 4. No Placeholders or Generic Layouts
- Never use generic placeholder text ("Lorem ipsum", "Feature 1", "Card 1").
- Fill components with real domain data context (proxies, dispatches, live websocket logs, node health, latency metrics).
- Use varied card sizes, asymmetric grids, and contextual sidebars to create visual interest.
