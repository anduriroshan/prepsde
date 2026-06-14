# PrepSDE — Design Language

> "The Grind" design system. Built for focus, not decoration.

---

## Core Principles

1. **Data first** — every screen answers one question immediately. Don't make the user hunt.
2. **Earn the accent** — Steel Teal appears only on elements that deserve attention. Not backgrounds, not decorations.
3. **Weight over color** — hierarchy is communicated through Roboto weight (300 → 900), not color variety.
4. **Flat when possible** — minimal border-radius, no unnecessary gradients. Sharp edges signal precision.
5. **Dark by default** — the primary experience is dark mode. Light mode is a first-class variant, not an afterthought.

---

## Color Tokens

### Accent (Steel Teal)
```
--accent:          #638688   ← primary actions, active states, progress fills
--accent-muted:    #638688 @ 12% opacity  ← card tints, chip backgrounds
--accent-glow:     #638688 @ 30% opacity  ← shadows, focus rings
--accent-light:    #7fa4a6   ← hover states, lighter variant
--accent-dark:     #4a6b6d   ← pressed states, deeper variant
```

### Dark Mode Surfaces
```
--bg-primary:      #0d0d0d   ← page background (near-black, not pure black)
--bg-surface:      #1a1a1a   ← cards, sheets, modals
--bg-elevated:     #242424   ← elevated cards, dropdowns, bottom sheets
--bg-input:        #141414   ← text inputs, search bars
--border:          rgba(255,255,255,0.06)  ← card borders
--divider:         rgba(255,255,255,0.04)  ← list dividers
```

### Light Mode Surfaces
```
--bg-primary:      #f5f2ee   ← warm cream page background
--bg-surface:      #ffffff   ← cards
--bg-elevated:     #fdfbf8   ← elevated elements
--bg-input:        #f0ede9   ← text inputs
--border:          rgba(0,0,0,0.08)
--divider:         rgba(0,0,0,0.05)
```

### Text
```
Dark mode:
  --text-primary:  #f0f0f0   ← body, headings
  --text-secondary:#9a9a9a   ← labels, metadata, placeholders
  --text-muted:    #555555   ← disabled, hints

Light mode:
  --text-primary:  #0d0d0d
  --text-secondary:#6b6560
  --text-muted:    #b0a9a3
```

### Semantic Colors
```
--success:         #22c55e   ← on-track, mastered, completed
--warning:         #f59e0b   ← surface-level, behind pace
--danger:          #ef4444   ← lazy, deadline extended, overdue
--info:            #638688   ← same as accent (informational states)
```

### Difficulty Colors (DSA)
```
--easy:            #22c55e
--medium:          #f59e0b
--hard:            #ef4444
```

### Reflection Verdict Colors
```
--verdict-deep:    #22c55e   ← Deep Work
--verdict-surface: #f59e0b   ← Surface
--verdict-lazy:    #ef4444   ← Lazy
```

---

## Typography

**System font**: Roboto (ships with Android — no bundle cost)  
**Mono font**: Roboto Mono (for numbers, counters, timestamps, code snippets)

### Scale
```
Display:   Roboto 900,  32px,  line-height 1.1   ← countdown number ("87")
H1:        Roboto 700,  24px,  line-height 1.2   ← page titles
H2:        Roboto 700,  20px,  line-height 1.3   ← section headers
H3:        Roboto 600,  17px,  line-height 1.4   ← card titles
Body:      Roboto 400,  15px,  line-height 1.5   ← default body copy
Body Sm:   Roboto 400,  13px,  line-height 1.5   ← secondary text, captions
Label:     Roboto 500,  12px,  line-height 1.3,  letter-spacing 0.04em  ← tags, chips, nav labels
Micro:     Roboto 400,  11px,  line-height 1.3   ← timestamps, fine print
Mono:      Roboto Mono 400/500, 13px             ← counters, dates, stats
```

### Rules
- Never use Roboto 300 for anything interactive — too light on dark backgrounds.
- The deadline countdown number (Display) is the only 32px+ element in the app.
- Section headers always use `letter-spacing: 0.06em` + uppercase to distinguish from body.

---

## Spacing

Base unit: **4px**

```
4px   — xs   ← icon-to-label gaps, internal chip padding
8px   — sm   ← between list items, tag rows
12px  — md   ← card internal padding (compact)
16px  — lg   ← card internal padding (standard), screen horizontal margins
24px  — xl   ← section gaps
32px  — 2xl  ← between major page sections
48px  — 3xl  ← top hero spacing
```

Screen horizontal margin: **16px** on both sides (standard Material 3 rail).

---

## Border Radius

```
0px   — flat      ← progress bars, dividers, input borders
4px   — tight     ← difficulty badges, status tags, FAB
8px   — card      ← standard cards, bottom sheets, modals
12px  — large     ← hero cards, snackbars
9999px — pill     ← chips, filter tags, streak badge
```

Rule: **cards are 8px**. Pills are full-radius. Everything else is 4px or flat. No mixing within a component.

---

## Elevation & Shadow

Dark mode shadows use opacity, not blur spread:
```
Level 0 — no shadow              ← flat list items
Level 1 — 0 1px 3px rgba(0,0,0,0.4)   ← standard cards
Level 2 — 0 4px 12px rgba(0,0,0,0.5)  ← modals, bottom sheets
Level 3 — 0 8px 24px rgba(0,0,0,0.6)  ← FAB, tooltips
Accent glow — 0 0 12px rgba(99,134,136,0.3)  ← active progress rings, FAB accent
```

Light mode uses subtle warm shadows:
```
Level 1 — 0 1px 4px rgba(0,0,0,0.08)
Level 2 — 0 4px 16px rgba(0,0,0,0.10)
```

---

## Components

### Bottom Navigation Bar
- 5 tabs: Home, DSA, Reflect, Progress, Profile
- Height: 64px + system navigation bar inset
- Active tab: icon in `--accent`, label in `--accent`, 2px underline dot
- Inactive: icon + label in `--text-muted`
- Background: `--bg-surface` with a `1px` top border at `--border`
- No labels hidden on inactive — always show all 5 labels (readability over minimalism)

### App Bar
- Height: 56px
- Title: H2, left-aligned
- Trailing icons: max 2, 24px, `--text-secondary`
- Transparent background on scroll-to-top; `--bg-surface` when scrolled

### Cards
```
Background:    --bg-surface
Border:        1px solid --border
Border-radius: 8px
Padding:       16px
Shadow:        Level 1
```
Interactive cards get a `--accent-muted` background tint on press.

### Hero Deadline Card (Home)
```
Background:    --bg-elevated
Border:        1px solid rgba(99,134,136,0.2)  ← faint accent border
Border-radius: 12px
Padding:       24px
Countdown:     Display scale, --text-primary
Arc ring:      SVG, stroke --accent, track rgba(255,255,255,0.06)
```

### Progress Bar
```
Track:         --bg-elevated (dark) / rgba(0,0,0,0.08) (light)
Fill:          --accent
Height:        4px (compact), 6px (standard)
Border-radius: 0px (flat — intentional design choice)
```

### Chips / Filter Tags
```
Default:       border 1px solid --border, bg transparent, text --text-secondary
Active:        bg --accent-muted, border --accent, text --accent
Border-radius: 9999px
Padding:       6px 12px
Font:          Label scale
```

### Difficulty Badge
```
Easy:   bg rgba(34,197,94,0.12),   text #22c55e
Medium: bg rgba(245,158,11,0.12),  text #f59e0b
Hard:   bg rgba(239,68,68,0.12),   text #ef4444
Border-radius: 4px
Padding: 2px 8px
Font: Label scale
```

### Verdict Badge (AI reflection score)
```
Deep Work:  bg rgba(34,197,94,0.12),   text #22c55e,  dot ●
Surface:    bg rgba(245,158,11,0.12),  text #f59e0b,  dot ●
Lazy:       bg rgba(239,68,68,0.12),   text #ef4444,  dot ●
```

### FAB (Floating Action Button)
```
Size:          56px circle
Background:    --accent
Icon:          white, 24px
Shadow:        Level 3 + accent glow
Position:      bottom-right, 16px margin, above bottom nav
```

### Text Input
```
Background:    --bg-input
Border:        1px solid --border
Border-radius: 8px
Padding:       12px 16px
Focus border:  1px solid --accent
Font:          Body scale
Placeholder:   --text-muted
```

### Snackbar / Toast
```
Background:    --bg-elevated
Text:          --text-primary, Body scale
Border-radius: 12px
Padding:       12px 16px
Duration:      2500ms
Position:      bottom, above FAB / bottom nav
Max-width:     fill with 16px margins
```

### Empty State
```
Icon:    48px, --text-muted
Heading: H3, --text-secondary
Body:    Body Sm, --text-muted
CTA:     accent-colored text button
Layout:  vertically centered in available space
```

### Loading Skeleton
```
Base color:    --bg-elevated
Shimmer:       animated gradient sweep, rgba(255,255,255,0.04)
Border-radius: matches the component it replaces
```

---

## Motion & Animation

**Guiding rule**: transitions signal state change, not decoration. Keep them fast.

```
Micro (tap feedback):    100ms  ease-out  ← button press, checkbox
Standard (page):         250ms  ease-in-out  ← screen transitions
Slide-in (bottom sheet): 300ms  cubic-bezier(0.4, 0, 0.2, 1)
Fade (snackbar):         200ms  ease
Color swap (palette):    200ms  ease  ← all CSS var-driven transitions
AI feedback reveal:      400ms  ease-in  ← slide up from bottom after submit
```

Page transitions: standard Android shared-element / slide-right for back navigation.  
No bounce animations. No spring physics on lists. Precision, not playfulness.

---

## Icons

Use **Material Symbols** (outlined weight, grade 0, optical size 24).  
Do not mix filled and outlined styles within the same screen.

```
Nav — Home:     home
Nav — DSA:      code
Nav — Reflect:  edit_note
Nav — Progress: bar_chart
Nav — Profile:  person

Common:
  Add:         add
  Back:        arrow_back
  Search:      search
  Filter:      tune
  Bookmark:    bookmark
  Share:       share
  Settings:    settings
  Streak:      local_fire_department
  Check:       check_circle (filled, --success)
  Close:       close
  External:    open_in_new
  Deadline:    event
  Review:      repeat
```

Icon size: 24px standard, 20px in dense lists, 18px in chips/badges.

---

## Screen-Specific Notes

### Home
- Deadline countdown is the visual anchor — largest element, top of scroll
- "Today's Tasks" checklist: left border `--accent` on active items, `--border` on unchecked
- Weekly pace bars: flat (0px radius), 4px height, `--accent` fill
- Spaced repetition section: always below the fold — users should complete today's tasks first

### DSA Tracker
- Problem cards: left side shows difficulty color strip (4px wide, full card height)
- Filter chips scroll horizontally, do not wrap
- Stats bar at bottom is sticky — always shows total count even while scrolling
- "Due Today" tab gets a `--danger` dot badge on the tab icon when items exist

### Reflect
- Day rating: large emoji selector, 48px hit target, selected emoji scales to 1.2x
- Text inputs: generous height (min 80px), no character limit shown unless >500 chars
- AI feedback section: separated by a `--divider` line, verdict badge prominent, message in Body scale
- Past reflections: compact cards, date left + verdict badge right

### Progress
- Heatmap: 7 cols × 12 rows (12 weeks), each cell 12px × 12px with 2px gap
  - Empty: `--bg-elevated`
  - Light: `rgba(99,134,136,0.3)`
  - Medium: `rgba(99,134,136,0.6)`
  - Full: `#638688`
- Topic mastery bars: label left, percentage right in Roboto Mono, bar between

### Profile
- Stat tiles: 3-up row, equal width, number in Roboto Mono Display scale
- No decorative illustrations — data only

---

## Do Not

- Do not use `--accent` as a background for large areas (cards, screens, sections)
- Do not add drop shadows to text
- Do not use more than 2 font sizes on a single card
- Do not put icons without labels in the bottom nav
- Do not use pure `#000000` or `#ffffff` — use `#0d0d0d` and `#f0f0f0` respectively
- Do not animate list scrolling or add parallax effects
- Do not use glassmorphism (`backdrop-filter: blur`) on mobile — performance cost on mid-range Android

---

## Flutter Implementation Notes

```dart
// Accent color
const accentColor = Color(0xFF638688);

// Dark theme
ThemeData darkTheme = ThemeData(
  brightness: Brightness.dark,
  scaffoldBackgroundColor: Color(0xFF0D0D0D),
  colorScheme: ColorScheme.dark(
    primary: Color(0xFF638688),
    surface: Color(0xFF1A1A1A),
    onSurface: Color(0xFFF0F0F0),
  ),
  cardTheme: CardTheme(
    color: Color(0xFF1A1A1A),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(8),
      side: BorderSide(color: Colors.white.withOpacity(0.06)),
    ),
    elevation: 0,
  ),
  fontFamily: 'Roboto',
);
```

Font setup: Roboto is pre-loaded on Android — no `pubspec.yaml` font declaration needed.  
For Roboto Mono: add to `pubspec.yaml` as a Google Font asset or use `google_fonts` package.

---

## File References

- Mockups (interactive): `knowledge/design_concepts.html`
- Feature backlog: `knowledge/features.md`
- UI screen plan: `knowledge/ui_plan.md`
