# Board Screen — Mobile Design Changes

**Category:** Design Change  
**Priority:** High  
**Files:** `frontend/index.html` (inline `<style>`), `frontend/css/style.css`

---

## Current State

Board screen is entirely desktop-focused:
- Retro header positioned top-left (absolute, 24px offset)
- Top-right controls clustered in top-right corner
- Tool tray at bottom with many small buttons
- Inspector already has bottom-sheet behavior at <900px

## Changes Needed

### Breakpoint: `max-width: 650px` — Large Phone

#### Slim Top Bar (replaces retro-header)

Create new HTML element:

```html
<div class="mobile-top-bar" id="mobile-top-bar" style="display:none;">
    <button class="mobile-hamburger" onclick="toggleMobileDrawer()">≡</button>
    <span class="mobile-case-name" id="mobile-case-name">CASE BOARD</span>
    <div class="mobile-top-actions">
        <button onclick="handleSearchToggle()">🔍</button>
        <button onclick="saveBoardViewport()">💾</button>
        <button onclick="toggleSettings()">⚙️</button>
    </div>
</div>
```

CSS:

```css
.mobile-top-bar {
    display: none; /* hidden by default */
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 48px;
    background: var(--paper-light);
    border-bottom: 3px double #8a7a5f;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    z-index: 20;
    display: flex;
    align-items: center;
    padding: 0 12px;
    gap: 8px;
}
.mobile-hamburger {
    background: none;
    border: none;
    font-size: 22px;
    cursor: pointer;
    padding: 8px;
    color: var(--ink-dark);
    min-width: 44px; min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.mobile-case-name {
    flex: 1;
    font-family: 'Playfair Display', serif;
    font-weight: 800;
    font-size: 14px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--ink-dark);
}
.mobile-top-actions {
    display: flex;
    gap: 4px;
}
.mobile-top-actions button {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 8px;
    min-width: 44px; min-height: 44px;
}
```

Show at `max-width: 650px`, hide retro-header at same width:

```css
@media (max-width: 650px) {
    .retro-header { display: none; }
    .mobile-top-bar { display: flex; }
}
```

#### Top-Right Controls — Icon Only

```css
@media (max-width: 650px) {
    .top-right-controls {
        top: 54px; /* below mobile-top-bar */
        right: 8px;
        gap: 4px;
    }
    #agent-username { display: none; }
    .agent-badge { padding: 4px 8px; }
    .logout-top-btn { font-size: 0; padding: 8px; }
    .logout-top-btn::after { content: '✕'; font-size: 16px; }
    .save-top-btn { font-size: 16px; padding: 8px; }
    .settings-top-btn { font-size: 16px; padding: 8px; }
}
```

#### Tool Tray — Bigger Touch Targets

```css
@media (max-width: 650px) {
    .retro-tool-tray {
        padding: 10px 12px;
        gap: 8px;
        bottom: 12px;
        left: 12px;
        right: 12px;
        width: auto;
        border-radius: 6px;
    }
    .tray-btn {
        min-width: 44px;
        min-height: 44px;
        font-size: 12px;
        padding: 8px;
    }
    .tray-label {
        font-size: 9px;
    }
    .swatch-btn {
        width: 32px;
        height: 32px;
    }
    .tray-divider {
        margin: 4px 0;
    }
}
```

#### Hamburger Drawer

```html
<div class="mobile-drawer" id="mobile-drawer">
    <div class="drawer-header">
        <span>📁 CASES</span>
        <button onclick="createNewBoard()" class="drawer-new-case">+ NEW</button>
    </div>
    <select id="board-selector-mobile" onchange="switchBoard(this.value); closeMobileDrawer();" class="retro-select"></select>
    <div class="drawer-divider"></div>
    <div class="drawer-section">
        <button onclick="toggleSearch(); closeMobileDrawer();">🔍 Search Tiles</button>
    </div>
    <div class="drawer-divider"></div>
    <div class="drawer-section">
        <div class="drawer-agent">🕵️ <span id="drawer-username">AGENT</span></div>
    </div>
    <div class="drawer-section">
        <button onclick="toggleSettings()">⚙️ Settings</button>
        <button onclick="window.auth.logout()" class="drawer-logout">✕ Close Case</button>
    </div>
</div>
```

CSS:

```css
.mobile-drawer {
    position: fixed;
    top: 48px; left: 0; bottom: 0;
    width: 280px;
    background: var(--paper-light);
    border-right: 3px double #8a7a5f;
    box-shadow: 8px 0 24px rgba(0,0,0,0.5);
    z-index: 19;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
}
.mobile-drawer.open {
    transform: translateX(0);
}
.drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'Special Elite', monospace;
    font-size: 13px;
    color: var(--ink-dark);
}
.drawer-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.drawer-section button {
    background: none;
    border: 1px solid rgba(0,0,0,0.15);
    padding: 10px;
    font-family: 'Courier Prime', monospace;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    border-radius: 3px;
    min-height: 44px;
}
.drawer-agent {
    font-family: 'Special Elite', monospace;
    font-size: 12px;
    padding: 8px 0;
    color: var(--ink-dark);
}
.drawer-logout {
    border-color: #c0392b !important;
    color: #c0392b;
}
```

#### Drawer JS (add to `frontend/js/ui.js`)

```js
function toggleMobileDrawer() {
    document.getElementById('mobile-drawer').classList.toggle('open');
}
function closeMobileDrawer() {
    document.getElementById('mobile-drawer').classList.remove('open');
}
// Close drawer when tapping canvas
document.addEventListener('click', (e) => {
    const drawer = document.getElementById('mobile-drawer');
    const hamburger = document.querySelector('.mobile-hamburger');
    if (drawer && drawer.classList.contains('open') && 
        !drawer.contains(e.target) && 
        !hamburger.contains(e.target)) {
        closeMobileDrawer();
    }
});
```

### Breakpoint: `max-width: 480px` — Small Phone

#### Tool Tray — Icons Only

```css
@media (max-width: 480px) {
    .tray-label { display: none; }
    .tray-btn {
        font-size: 0;
        min-width: 44px;
        min-height: 44px;
        padding: 8px;
    }
    .tray-btn::before {
        font-size: 18px; /* emoji already in button */
    }
    .retro-tool-tray {
        padding: 8px;
        gap: 4px;
        justify-content: center;
    }
    .tray-section {
        gap: 4px;
    }
    .tray-group {
        gap: 4px;
    }
}
```

Note: `.tray-btn` already contains emoji (📋, 🏷️, 📷, 📰). By setting `font-size: 0`, the text disappears but the emoji remains visible. If this doesn't work reliably, add a `data-icon` attribute approach instead.

Alternative: use `.tray-btn span.label-text` to selectively hide.

#### Inspector — Taller Bottom Sheet

```css
@media (max-width: 480px) {
    .newspaper-card {
        height: 75vh;
        transform: translateY(85vh);
    }
    .newspaper-card.active {
        transform: translateY(0);
    }
    .newspaper-inner {
        padding: 12px;
    }
}
```

#### Top Bar — Minimal

```css
@media (max-width: 480px) {
    .mobile-top-actions button:not(:last-child) {
        display: none; /* hide search and settings, keep save */
    }
    /* Or more selectively: hide search only */
    .mobile-top-actions button:nth-child(1) { display: none; } /* hide search */
}
```

### Dark Theme

All new elements need dark theme variants:

```css
[data-theme="dark"] .mobile-top-bar {
    background: var(--paper-light);
    border-bottom-color: #5a4a3a;
}
[data-theme="dark"] .mobile-drawer {
    background: var(--paper-light);
    border-right-color: #5a4a3a;
}
```

---

## Acceptance Criteria

- [ ] Board canvas is fully interactive on touch devices (pan, zoom, tap)
- [ ] Header collapses to slim bar at 650px, no overlapping elements
- [ ] All buttons have 44px minimum touch target
- [ ] Hamburger drawer slides in/out smoothly
- [ ] Tool tray is usable on small screens (icons only at 480px)
- [ ] Inspector bottom sheet works well (tall enough at 480px)
- [ ] Dark theme has matching styles for all new elements
- [ ] Case name updates in mobile top bar when switching cases
- [ ] No layout breakage or horizontal scroll at any width down to 320px
