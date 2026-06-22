# Auth Screen — Mobile Design Changes

**Category:** Design Change  
**Priority:** Medium  
**Files:** `frontend/index.html` (inline `<style>`)

---

## Current State

Auth screen works but is desktop-optimized:
- `.auth-brand`: 44px logo, 24px font, 20px padding, rotated -0.5deg
- `.auth-card`: 380px max-width, 24px padding, rotated -0.5deg, 4 side tiles hidden <900px
- Existing `<600px` rule: card goes to `90vw / 340px`

## Changes Needed

### Breakpoint: `max-width: 480px` — Small Phone

#### `.auth-brand`

| Property | Current | Mobile |
|----------|---------|--------|
| `padding` | 20px 28px | 10px 16px |
| Logo `width/height` | 44px | 32px |
| Heading `font-size` | 24px | 18px |
| `transform` | rotate(-0.5deg) | none (straight) |
| `top` | 60px | 40px |

#### `.auth-card`

| Property | Current | Mobile |
|----------|---------|--------|
| `width` | 90vw / max 380px | 95vw |
| `max-width` | 380px (340px <680px) | none (full width) |
| `padding` | 24px | 16px |
| `transform` | rotate(-0.5deg) | none |
| `margin-top` | 30px | 16px |

#### Form elements

- `.auth-field input`: `min-height: 44px` for comfortable touch target
- `.auth-submit`: `min-height: 44px`, full width
- All font sizes stay at 12-13px (already readable)

#### Auth Tabs

- Slightly smaller font (13px → 12px if needed)
- Tab padding reduced to fit

#### Layout

- Auth screen flex alignment stays `center` — card and brand remain vertically centered
- Remove `overflow: hidden` concern — everything should fit within viewport
- Test with keyboard open (auth forms + keyboard on mobile = tricky)

### Breakpoint: `max-width: 350px` — Very Small Phone (iPhone SE)

- `.auth-brand`: logo 28px, font 16px, padding 8px 12px
- `.auth-card`: padding 12px
- Tab font: 11px
- Reduce vertical gaps between form fields

### Dark Theme

- No special changes needed — dark theme already applies via CSS variables
- Verify contrast on mobile screens

---

## Visual Reference

```
┌──────────────────────┐
│  🕵️ Detective        │ ← brand tile (smaller)
│     Corkboard        │
├──────────────────────┤
│ [LOGIN] [REGISTER]   │ ← tabs
│──────────────────────│
│ Email                │ ← 44px touch target
│ ┌──────────────────┐ │
│ │                  │ │
│ └──────────────────┘ │
│ Password             │
│ ┌──────────────────┐ │
│ │                  │ │
│ └──────────────────┘ │
│                      │
│ [LOGIN →]            │ ← full-width, 44px
│                      │
│ forgot password?     │
└──────────────────────┘
```

## Acceptance Criteria

- [ ] Auth screen fits without scrolling on iPhone SE (375x667) with keyboard visible
- [ ] All form fields are tappable (44px min height)
- [ ] Brand is readable but not oversized
- [ ] Dark theme looks correct
- [ ] No horizontal scroll
