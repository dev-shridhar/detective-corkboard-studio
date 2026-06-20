/**
 * edges.js — Yarn string rendering using Bézier catenary curves.
 * Strings hang between two tile pushpin points with a natural gravity droop.
 * Uses the --string-color design token from the existing CSS system.
 *
 * Phase 5 will implement the full interactive attach flow and color picker.
 */

class EdgeManager {
    constructor(canvasEngine) {
        this._engine = canvasEngine;
        this._edges = [];           // Edge data objects from the API
        this._nodes = [];           // Reference to node positions
        this._preview = null;       // Live string preview while dragging
    }

    loadEdges(edges, nodes) {
        this._edges = edges;
        this._nodes = nodes;
        this._engine.requestDraw();
    }

    /**
     * Draw all yarn strings on the canvas.
     * Called by the canvas engine each frame alongside NodeManager.draw().
     */
    draw(ctx, transform) {
        for (const edge of this._edges) {
            this._drawEdge(ctx, edge, transform);
        }
        if (this._preview) {
            this._drawPreviewString(ctx, this._preview, transform);
        }
    }

    _drawEdge(ctx, edge, transform) {
        const src = this._nodes.find(n => n.id === edge.source_node_id);
        const tgt = this._nodes.find(n => n.id === edge.target_node_id);
        if (!src || !tgt) return;

        // Calculate search matching opacity for strings
        const query = (window.nodeManager && window.nodeManager._searchQuery) || "";
        let opacity = 1.0;
        if (query) {
            const matchesSrc = src.title.toLowerCase().includes(query) || 
                               (src.description && src.description.toLowerCase().includes(query));
            const matchesTgt = tgt.title.toLowerCase().includes(query) || 
                               (tgt.description && tgt.description.toLowerCase().includes(query));
            if (!matchesSrc && !matchesTgt) {
                opacity = 0.15;
            }
        }

        const p1 = transform.worldToScreen(src.x, src.y);
        const p2 = transform.worldToScreen(tgt.x, tgt.y);
        this._drawCatenaryString(ctx, p1, p2, edge.color || '#c0392b', edge.label, opacity);
    }

    /**
     * Bézier catenary curve: control point pulled down to simulate gravity.
     * The sag amount scales with horizontal distance for a realistic hang.
     */
    _drawCatenaryString(ctx, p1, p2, color, label = null, opacity = 1.0) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const sag = Math.min(dist * 0.22, 60); // Natural gravity sag

        const cpX = midX;
        const cpY = midY + sag;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(cpX, cpY, p2.x, p2.y);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1.5;
        ctx.shadowOffsetY = 3.5;
        ctx.stroke();

        if (label) {
            ctx.shadowColor = 'transparent';
            ctx.font = '10px "Courier Prime", monospace';
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.fillText(label, cpX, cpY + 14);
        }
        ctx.restore();
    }

    _drawPreviewString(ctx, preview, transform) {
        const { x1, y1, x2, y2, color } = preview;
        this._drawCatenaryString(ctx, { x: x1, y: y1 }, { x: x2, y: y2 }, color);
    }

    startPreview(x1, y1, color) {
        this._preview = { x1, y1, x2: x1, y2: y1, color };
    }

    updatePreview(x2, y2) {
        if (this._preview) { this._preview.x2 = x2; this._preview.y2 = y2; }
        this._engine.requestDraw();
    }

    cancelPreview() { this._preview = null; }
}

window.EdgeManager = EdgeManager;
