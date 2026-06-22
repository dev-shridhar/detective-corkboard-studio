# Mobile Responsive Layout — Progressive Breakpoints

**Category:** Feature Request  
**Priority:** High  
**Files:** `frontend/index.html` (inline `<style>`), `frontend/css/style.css`

---

## Strategy

Three-tier breakpoints building on the existing `900px` rule (which turns the inspector into a bottom sheet). Each tier progressively collapses the UI to fit smaller screens while preserving the detective/vintage aesthetic.

## Breakpoint: `max-width: 900px` (already done)

| Element | Rule |
|---------|------|
| Inspector | Bottom sheet: 100% width, slides up from bottom, 60vh height |
| retro-header | max-width: calc(100% - 48px) |

No changes needed.

---

## Breakpoint: `max-width: 650px` — Large Phone / Small Tablet

### Retro Header (top-left) → Slim Top Bar

- Hide `.retro-header` (`display: none`)
- Show a new `.mobile-top-bar` element (`display: flex`)
- `.mobile-top-bar` is a pinned-note style strip at the top:
  - `position: fixed; top: 0; left: 0; right: 0; height: 48px; z-index: 20`
  - Background: `var(--paper-light)`, border-bottom, small shadow
  - Flex layout: `≡` hamburger | CASE NAME (centered) | 🔍 💾 (right)
  - Hamburger toggles a `.mobile-drawer` panel

### Top-Right Controls → Collapsed Icons

- Hide text labels in buttons:
  - `.agent-badge`: show icon only (`span.agent-icon` kept, `#agent-username` hidden)
  - `CLOSE CASE` button text → just `✕` icon, no text
  - Keep `save-top-btn` (💾) and `settings-top-btn` (⚙️) as is (they're icons already)
- Reduce gap between items: `gap: 6px` instead of `10px`

### Tool Tray

- Bump all `.tray-btn` to `min-height: 44px; min-width: 44px` for touch targets
- Keep text labels — still readable at this width
- Reduce padding inside tray

### Auth Screen

- Hide `.auth-side-tile` (already done at 900px)
- No other changes needed here

---

## Breakpoint: `max-width: 480px` — Small Phone

### Top Bar → Minimum

- `.mobile-top-bar`: hide search button 🔍 too, just hamburger + case name + 💾 save
- Case name font: smaller, maybe truncate with ellipsis if long

### Tool Tray → Icons Only

- Hide `.tray-label` text
- Hide text inside `.tray-btn` (show only the emoji icon)
- Sections become narrower — just a row of icons
- `.retro-tool-tray` padding reduced further
- `swatch-btn` stays same size (already small circles)

### Inspector Bottom Sheet

- Height increases to 75vh (more room for content on small screen)
- `.newspaper-card.active`: `transform: translateY(0)`
- Reduce padding inside to 12px

### Auth Screen

- `.auth-brand`: shrink logo to 32px, heading font-size to 18px, padding to 12px
- `.auth-card`: `width: 95vw; padding: 16px;` (remove rotation, remove box-shadow complexity)
- Form buttons: full width, min-height 44px
- Auth tabs: slightly smaller font

---

## Hamburger Drawer (`<650px`)

A slide-out panel from the left, triggered by tapping `≡` in the top bar.

### Contents

- Case selector dropdown (`.retro-select`)
- "New Case" button
- Agent badge (🕵️ AGENT NAME)
- Logout button
- Settings button
- Search input

### Styling

- Pinned-note paper look matching the retro theme
- `position: fixed; top: 48px; left: 0; bottom: 0; width: 280px;`
- Covers canvas with slight overlay behind it
- `transform: translateX(-100%)` → `translateX(0)` when open
- Transition: 0.2s ease

### JS

- Toggle class `open` on drawer element
- Close on backdrop click or when tapping a menu item
- Handle in a small inline script or in `ui.js`

---

## Summary: What Mobile Gets at Each Width

| Feature | `>900px` | `650-900px` | `480-650px` | `<480px` |
|---------|:--------:|:-----------:|:-----------:|:--------:|
| Inspector | side panel | bottom sheet | bottom sheet | bottom sheet (taller) |
| Header | retro-header | retro-header (smaller) | slim top bar | slim top bar (minimal) |
| Top-right | full controls | full controls | icon-only | icon-only |
| Tool tray | full | full (bigger buttons) | full (bigger buttons) | icons only |
| Hamburger | hidden | hidden | shown | shown |
| Canvas pointers | mouse | mouse+pointer | pointer | pointer |
| Auth brand | large | large | medium | small |
| Auth card | 380px | 90vw/340px | 90vw/340px | 95vw / 16px pad |
