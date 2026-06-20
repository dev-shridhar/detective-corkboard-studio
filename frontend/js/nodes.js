/**
 * nodes.js — Tile rendering and drag-and-drop management.
 * Renders note_card / tape_label / polaroid / newspaper_clipping shapes
 * on the HTML5 canvas using the existing architect-of-intelligence design tokens.
 *
 * Phase 4 will implement full tile rendering and drag logic.
 */

class NodeManager {
    constructor(canvasEngine) {
        this._engine = canvasEngine;
        this._nodes = [];        // Array of node data objects from the API
        this._dragging = null;   // Currently dragged node
        this._dragOffset = { x: 0, y: 0 };
    }

    /**
     * Load nodes from the API into local state and trigger a redraw.
     */
    async loadBoard(boardId) {
        this._nodes = await window.api.listNodes(boardId);
        this._engine.requestDraw();
    }

    /**
     * Draw all tiles onto the canvas context.
     * Called by the canvas engine each frame.
     */
    draw(ctx, transform) {
        for (const node of this._nodes) {
            this._drawNode(ctx, node, transform);
        }
    }

    _drawNode(ctx, node, transform) {
        // Phase 4: implement per-shape drawing using design tokens from style.css
        // Shapes: note_card, tape_label, polaroid, newspaper_clipping
        const { x, y } = transform.worldToScreen(node.x, node.y);
        const scale = transform.scale;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Placeholder rectangle — will be replaced with styled tile shapes in Phase 4
        ctx.fillStyle = node.color || '#f5e6c8';
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-80, -50, 160, 100, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1c1c1e';
        ctx.font = '700 13px "Courier Prime", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(node.title, 0, 4);

        ctx.restore();
    }

    startDrag(node, screenX, screenY, transform) {
        this._dragging = node;
        const worldPos = transform.screenToWorld(screenX, screenY);
        this._dragOffset = { x: worldPos.x - node.x, y: worldPos.y - node.y };
    }

    moveDrag(screenX, screenY, transform) {
        if (!this._dragging) return;
        const worldPos = transform.screenToWorld(screenX, screenY);
        this._dragging.x = worldPos.x - this._dragOffset.x;
        this._dragging.y = worldPos.y - this._dragOffset.y;
        this._engine.requestDraw();
    }

    async endDrag() {
        if (!this._dragging) return;
        const node = this._dragging;
        this._dragging = null;
        // Persist the new position to the API
        await window.api.updateNode(node.board_id, node.id, { x: node.x, y: node.y });
    }
}

window.NodeManager = NodeManager;
