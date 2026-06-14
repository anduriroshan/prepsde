---
name: project-prepsde-design
description: PrepSDE app design work — "The Grind" design system chosen, full HTML mockup built at knowledge/design_concepts.html
metadata:
  type: project
---

## Design history

Three concepts were built in v3 (Jun 2026) after v2 rejection ("looks AI-generated"): The Grind, Focus OS, Forge. User selected **The Grind** for the full design system build-out.

## "The Grind" — chosen design system

Active mockup file: `knowledge/design_concepts.html`

**Palette:**
- Page bg: #0a0908
- Dark screen bg: #0d0d0d (dot-grid radial texture, 18px repeat)
- Dark surface: #1a1a1a / elevated: #222222
- Accent: #ff6b35 (ember orange)
- Dark text: #f0ede8 / muted: #8a8278
- Light screen bg: #f5f2ee (dot-grid, dark dots)
- Light surface: #ffffff
- Light text: #0d0d0d / muted: #6b6560
- Light border: rgba(0,0,0,0.08)

**Typography:** Space Grotesk (headings, 300–800) + JetBrains Mono (labels, metadata, data)

**Phone frame spec:**
- Outer: 320×640px, border-radius 36px, padding 20px 13px
- Dark bezel: linear-gradient(145deg, #2a2a2a, #1a1a1a), border #333
- Light bezel: linear-gradient(145deg, #e8e8e8, #d0d0d0), border #c0c0c0
- Inner screen: 294×600px, border-radius 28px, overflow hidden
- Side buttons via ::before / ::after pseudo-elements

**File structure — 3×2 grid, 12 phones total:**

Dark mode (bg #0a0908) — ALL COMPLETE:
- Screen 1: Home / Dashboard — 87-day countdown, arc ring (72%), topic chips, task cards, bottom nav
- Screen 2: Topics List — 6 topic cards with progress bars + status badges
- Screen 3: Topic Detail (Trees & Graphs) — progress card, subtopic list (done/active/locked states), FAB
- Screen 4: Practice / Flashcard — progress bar, question card with ember top glow, Again/Good/Easy buttons
- Screen 5: Schedule — week strip with today dot, 4 color-coded time blocks, FAB
- Screen 6: Profile — user card (AR), 3 stat tiles, 13-col heatmap, bar chart

Light mode (bg #ede9e4) — ALL COMPLETE:
- Screens 1–6: same 6 screens, recolored to cream/white surfaces, ember accent unchanged

**Arc ring math:**
- Large ring (screen 1): r=22, circumference=138.2, 72% fill → dashoffset=38.7
- Small ring (screen 3): r=18, circumference=113.1, 70% fill → dashoffset=33.9
- Both use transform:rotate(-90deg) on SVG, counter-rotate on text label

**Component CSS classes established:**
`.dot-grid-dark` / `.dot-grid-light` — backgrounds
`.badge--complete/inprogress/notstarted/ontrack/easy/medium/hard` — status pills
`.progress-track` + `.progress-fill` — 3px bar system
`.bottom-nav` / `.nav-tab--active` / `.nav-tab--inactive`
`.fab` — position:absolute, bottom 68px (clears nav)
`.subtopic-item--done/active/locked` — state styling

**Why:** PrepSDE is a Flutter SDE interview prep app. HTML file is the living design reference for Flutter implementation. User's initials: AR.

**How to apply:** In Part 2, maintain all CSS class names and token values already in the file. Light screens use #0d0d0d text on #f5f2ee bg, #ffffff surfaces, rgba(0,0,0,0.08) borders. Topic cards in light mode use `background:#ffffff` instead of `#1a1a1a`. Progress track uses `#e8e4df` as track color.

---

## Interactive palette switcher — added Jun 2026

The file now has a sticky palette switcher bar with 20 preset accent swatches + custom color picker, and a Dark/Light mode toggle.

**Technical approach:**
- `--accent` and `--accent-rgb` CSS vars drive all CSS-class-based accent colors automatically
- Inline-styled elements in screens 4–6 (dark) and all light screens use `data-accent-*` HTML attributes:
  - `data-accent-bg="1"` → sets `el.style.background = hex`
  - `data-accent-color="1"` → sets `el.style.color = hex`
  - `data-accent-border-alpha="0.X"` → sets `el.style.borderColor = rgba(rgb,0.X)`
  - `data-accent-border-left-alpha="1"` → sets `el.style.borderLeftColor = hex`
  - `data-accent-bg-alpha="0.X"` → sets `el.style.background = rgba(rgb,0.X)`
  - `data-accent-box-shadow="...ACCENT_RGB..."` → substitutes rgb into shadow template
- SVG arc rings use `class="arc-ring-stroke"` (stroke attr) and `class="arc-ring-text"` (fill attr)
- Dark/Light mode: `body.dark` / `body.light` classes with scoped CSS overrides
- Default state: `body.dark`, Electric Indigo `#6366f1` active

**Note:** The static design token swatches in section headers still show #6366f1 as documentation; they do not repaint (intentional).
