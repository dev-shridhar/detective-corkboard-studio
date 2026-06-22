# Canvas Touch / Pointer Events

**Category:** Bug Fix  
**Severity:** High — canvas is non-functional on mobile without this  
**Files:** `frontend/js/graph.js` (or wherever canvas pan/zoom is wired)

---

## Problem

The canvas (`#graphCanvas`) currently only listens to mouse events (`mousedown`, `mousemove`, `mouseup`). On touch devices these events are not fired reliably (or at all), making the board unusable on phones/tablets — users cannot pan, zoom, or interact with tiles.

## Solution

Replace or supplement mouse events with **Pointer Events API**, which unifies mouse, touch, and pen input into a single set of handlers.

### Implementation Plan

1. **Replace** `mousedown` / `mousemove` / `mouseup` with `pointerdown` / `pointermove` / `pointerup` on `#graphCanvas`
2. **One-finger pan**: on `pointerdown` → start drag, on `pointermove` → pan canvas, on `pointerup` → end drag
3. **Pinch zoom**: track two concurrent pointers (`pointerdown` with `e.isPrimary === false` or track multiple `pointerId`s). Calculate distance change between two pointers and translate to zoom delta. Use `e.preventDefault()` to prevent page zoom.
4. **Tile tap**: on `pointerup` with minimal movement distance (< 5px), treat as tap — select or open tile inspector
5. **Prevent default**: call `e.preventDefault()` on `pointermove` to stop page scrolling while panning the canvas
6. **`touch-action: none`**: set CSS property on `#graphCanvas` to `touch-action: none` to prevent browser from intercepting gestures

### Touch-Action CSS

```css
#graphCanvas {
    touch-action: none;
}
```

### Pseudocode

```js
let pointers = new Map();
let lastDist = 0;
let isPanning = false;

canvas.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
        isPanning = true;
        // record start position for pan
    } else if (pointers.size === 2) {
        isPanning = false;
        lastDist = distanceBetween(pointers);
    }
    canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.preventDefault();
    if (pointers.size === 1 && isPanning) {
        // pan canvas by delta
    } else if (pointers.size === 2) {
        let dist = distanceBetween(pointers);
        let zoomDelta = (dist - lastDist) * 0.01;
        // apply zoom
        lastDist = dist;
    }
});

canvas.addEventListener('pointerup', (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastDist = 0;
    if (pointers.size === 0) isPanning = false;
});
```

### Test On

- iOS Safari (physical device or simulator)
- Android Chrome
- iPad / tablet
- Desktop mouse (must continue working normally)

### Acceptance Criteria

- [ ] One finger drag pans the canvas on touch devices
- [ ] Two finger pinch zooms in/out on touch devices
- [ ] Mouse drag still works on desktop
- [ ] Mouse wheel zoom still works on desktop
- [ ] Tap on a tile selects it / opens inspector
- [ ] Page does not scroll/zoom when interacting with canvas
