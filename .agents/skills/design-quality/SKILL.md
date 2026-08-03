---
name: design-quality
description: Use whenever building or styling UI, components, pages, or apps. Ensures distinctive, non-generic visual design instead of default AI-generated look.
---

# Design Quality Standards

Avoid default "AI app" look: generic Inter/system font, purple-to-blue gradients, 
centered white cards with rounded-2xl + shadow-lg, emoji icons, evenly-spaced 
generic grid of feature cards.

## Before writing any UI code, pick:
1. A specific typographic identity — not just default sans. Consider pairing a 
   distinctive display/serif font for headings with a clean body font.
2. A real color direction — not a random gradient. Pick 1 primary + 1 accent + 
   neutrals, and use them with intent (not everything gradient-filled).
3. A layout rhythm — asymmetry, varied spacing scale, intentional whitespace — 
   not everything centered in equal-width cards.

## Concrete rules
- No purple/blue gradient backgrounds by default.
- No lucide/emoji icon soup for every section.
- Use real spacing scale (4/8/12/16/24/32/48/64), not arbitrary px.
- Buttons/inputs should have a distinct visual identity (border, shadow, or 
  color treatment), not bare Tailwind defaults.
- Prefer fewer, bolder type-size jumps over many similar sizes.
- Add at least one unexpected detail: subtle texture, custom cursor, hover 
  micro-interaction, unconventional grid, or asymmetric layout.
- No dark-mode-with-neon-accents-per-category default (purple/green/orange/cyan 
  all glowing on one screen). Dark mode should use one restrained accent max, 
  muted borders, and normal sans-serif for body text — monospace only for actual 
  codes/IDs, not for every label.
- Avoid ALL CAPS section headers as a default — sentence case reads calmer and 
  more like a real product.

## Process
1. State the design direction in 1-2 sentences before coding (fonts, colors, 
   layout philosophy).
2. Build with that direction consistently applied.
3. Review: does this look like a template, or does it look designed?
