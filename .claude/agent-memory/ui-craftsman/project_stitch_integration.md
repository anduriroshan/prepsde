---
name: project-stitch-integration
description: Integration mockup of Stitch design elements into PrepSDE — bento cards, burn-down chart, pace pill — across dark and light modes
metadata:
  type: project
---

Integration concepts HTML (`knowledge/integration_concepts.html`) shows three phone mockups:

1. **Before** — current PrepSDE Home (flat pace bars, task list, due reviews)
2. **After Dark** — The Grind palette + Stitch elements: pace pill, 2×2 bento cards, burn-down SVG chart
3. **After Light** — Stitch's warm cream/forest-green palette applied to the same integrated layout

**Why:** User wants to evaluate which Stitch patterns are worth adopting in the PrepSDE Flutter app before committing to implementation.

**Stitch design tokens extracted:**
- Background: `#fcf9f3` / Surface: `#ffffff` / Primary: `#4a6747` (forest green) / Text: `#1a1c18`
- Stitch reference file lives at `stitch_adaptive_essentialist_tracker_prd/code.html`

**Patterns adopted:**
- Bento 2×2 metric cards (fixed 130px height, label + icon top row, big number + micro bar bottom)
- Burn-down SVG chart (viewBox 0 0 292 110, dashed ideal line, gradient fill under actual line, circle marker at "Today")
- Pace indicator pill (pulsing dot + uppercase verdict, green/amber/red)

**How to apply:** When user asks to implement any of these in Flutter, the exact proportions and data values are established here — refer to this file's bento card heights, SVG control points, and the accent color swap (#638688 dark / #4a6747 light).

[[project-prepsde-design]]
