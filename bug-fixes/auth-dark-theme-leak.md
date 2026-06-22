# Auth Screen Inherits Dark Theme

**Category:** Bug Fix  
**Severity:** Medium  
**Files:** `frontend/js/auth.js`, `frontend/index.html`

---

## Problem

When the user toggles dark mode on the board screen, the preference is saved to
`localStorage.setItem('setting_theme', 'dark')`. On next page load:

1. `DOMContentLoaded` fires
2. It reads the saved theme from localStorage and applies `data-theme="dark"` to
   `<html>`
3. The auth screen inherits dark theme colors, breaking the vintage cream aesthetic

## Root Cause

`DOMContentLoaded` handler at `index.html:1989` applied all saved settings
unconditionally, including theme — but the auth screen should always render in
light theme.

## Fix

Three changes:

### 1. `index.html:1991` — skip theme on page load

```js
if (cat !== 'theme') applySetting(cat, val);
```

The auth screen now always starts in light theme.

### 2. `auth.js:37-38` — apply saved theme when entering board

```js
const savedTheme = localStorage.getItem('setting_theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
```

Added to `_showBoardScreen()` so the dark theme kicks in only after login.

### 3. `auth.js:29` — reset to light on logout

```js
document.documentElement.setAttribute('data-theme', 'light');
```

Added to `_showAuthScreen()` so logging out returns to light auth screen.

## Acceptance Criteria

- [ ] Auth screen is always light theme regardless of saved preference
- [ ] Board screen respects the saved dark/light theme
- [ ] Logging out returns to light auth screen
- [ ] Toggling theme on board still persists correctly
