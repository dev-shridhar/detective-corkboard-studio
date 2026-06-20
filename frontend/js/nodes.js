/**
 * nodes.js — Custom styled board tile shapes, rendering engine,
 * and mouse hit-testing.
 */

class NodeManager {
    constructor(canvasEngine) {
        this._engine = canvasEngine;
        this._nodes = [];        // Nodes loaded from backend API
        this._dragNode = null;   // Active dragging reference
        this._dragOffset = { x: 0, y: 0 };
        this._searchQuery = "";
        
        // Tilt angles cached by node ID to keep tilts consistent across redraws
        this._tilts = {};
    }

    setNodes(nodes) {
        this._nodes = nodes;
        this._engine.requestDraw();
    }

    getNodes() {
        return this._nodes;
    }

    isDragging() {
        return !!this._dragNode;
    }

    filterBySearch(query) {
        this._searchQuery = query.toLowerCase().trim();
        this._engine.requestDraw();
    }

    /**
     * Hit testing: detects if screen coordinate collides with a tile
     * or its center pushpin.
     */
    hitTest(screenX, screenY, transform) {
        const worldPos = transform.screenToWorld(screenX, screenY);
        
        // Loop backward to hit top-most elements first
        for (let i = this._nodes.length - 1; i >= 0; i--) {
            const node = this._nodes[i];
            const dims = this.getNodeDimensions(node);
            
            // Map coordinates relative to the rotated card
            const tilt = this._tilts[node.id] || 0;
            const cos = Math.cos(-tilt);
            const sin = Math.sin(-tilt);
            
            const dx = worldPos.x - node.x;
            const dy = worldPos.y - node.y;
            
            const lx = dx * cos - dy * sin;
            const ly = dx * sin + dy * cos;
            
            // Check distance to delete button (drawn at top-right corner if hovered/selected)
            const isHoveredOrSelected = (this._engine.selectedNode === node || this._engine.hoveredNode === node);
            if (isHoveredOrSelected) {
                const btnX = dims.w / 2 - 8;
                const btnY = -dims.h / 2 + 8;
                const distToDelete = Math.hypot(lx - btnX, ly - btnY);
                if (distToDelete < 10) {
                    return { node, isPin: false, isDelete: true };
                }
            }
            
            if (lx >= -dims.w / 2 && lx <= dims.w / 2 &&
                ly >= -dims.h / 2 && ly <= dims.h / 2) {
                // If clicked within 12px of center, they clicked the pushpin!
                const isPin = Math.hypot(lx, ly) < 12;
                return { node, isPin, isDelete: false };
            }
        }
        return null;
    }

    getNodeDimensions(node) {
        switch (node.shape) {
            case 'polaroid':
                return { w: 110, h: 135 };
            case 'newspaper_clipping':
                return { w: 165, h: 55 };
            case 'tape_label':
                return { w: 115, h: 28 };
            case 'note_card':
            default:
                return { w: 130, h: 70 };
        }
    }

    startDrag(node, screenX, screenY, transform) {
        this._dragNode = node;
        const worldPos = transform.screenToWorld(screenX, screenY);
        this._dragOffset = { x: worldPos.x - node.x, y: worldPos.y - node.y };
        
        // Store dragging initial coordinate state for undo history
        this._dragStartPos = { x: node.x, y: node.y };
    }

    moveDrag(screenX, screenY, transform) {
        if (!this._dragNode) return;
        const worldPos = transform.screenToWorld(screenX, screenY);
        this._dragNode.x = worldPos.x - this._dragOffset.x;
        this._dragNode.y = worldPos.y - this._dragOffset.y;
        this._engine.requestDraw();
    }

    async endDrag() {
        if (!this._dragNode) return;
        const node = this._dragNode;
        const startPos = this._dragStartPos;
        const endPos = { x: node.x, y: node.y };
        
        this._dragNode = null;
        
        // Verify displacement threshold before executing history transaction
        if (Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y) > 2) {
            if (window.history_manager) {
                const cmd = new MoveNodeCommand(node.board_id, node.id, startPos, endPos);
                await window.history_manager.execute(cmd);
            } else {
                await window.api.updateNode(node.board_id, node.id, { x: node.x, y: node.y });
            }
        }
    }

    draw(ctx, transform) {
        for (const node of this._nodes) {
            this._drawNode(ctx, node, transform);
        }
    }

    _drawNode(ctx, node, transform) {
        const dims = this.getNodeDimensions(node);
        const screenPos = transform.worldToScreen(node.x, node.y);
        const scale = transform.scale;
        
        // Determine search match opacity
        const matchesQuery = !this._searchQuery || 
                             node.title.toLowerCase().includes(this._searchQuery) ||
                             (node.description && node.description.toLowerCase().includes(this._searchQuery));
        const opacity = matchesQuery ? 1.0 : 0.15;
        
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.scale(scale, scale);
        
        // Apply consistent tilt angle based on UUID
        if (!this._tilts[node.id]) {
            const seed = node.id.charCodeAt(0) + node.id.charCodeAt(node.id.length - 1);
            this._tilts[node.id] = (seed % 6 - 3) * (Math.PI / 180); // tilt range: [-3, 3] degrees
        }
        ctx.rotate(this._tilts[node.id]);
        
        // Add drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = (this._engine.selectedNode === node) ? 14 : 6;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = (this._engine.selectedNode === node) ? 10 : 5;
        ctx.globalAlpha = opacity;
        
        // ── Drawing Visual Styles per Shape ──
        
        if (node.shape === 'polaroid') {
            // Off-white Photo card backing
            ctx.fillStyle = '#f5ede0';
            ctx.fillRect(-dims.w / 2, -dims.h / 2, dims.w, dims.h);
            ctx.strokeStyle = (this._engine.selectedNode === node) ? '#1c1c1e' : 'rgba(0,0,0,0.15)';
            ctx.lineWidth = (this._engine.selectedNode === node) ? 2.5 : 1;
            ctx.strokeRect(-dims.w / 2, -dims.h / 2, dims.w, dims.h);
            
            // Photo Area
            ctx.fillStyle = '#3a312a';
            ctx.fillRect(-dims.w / 2 + 8, -dims.h / 2 + 8, dims.w - 16, dims.h - 38);
            
            // Photo Silhouette Avatar Sketch
            ctx.fillStyle = '#7a6a5e';
            ctx.beginPath();
            ctx.arc(0, -10, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(0, 15, 26, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Polaroid bottom tag text
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#1c1c1e';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 11px "Courier Prime", monospace';
            
            this._drawFittedText(ctx, node.title, dims.w - 12, dims.h / 2 - 16);
            
        } else if (node.shape === 'newspaper_clipping') {
            // Yellowed newspaper scrap
            ctx.fillStyle = '#eadebe';
            ctx.strokeStyle = (this._engine.selectedNode === node) ? '#000000' : 'rgba(0,0,0,0.2)';
            ctx.lineWidth = (this._engine.selectedNode === node) ? 2.5 : 1;
            
            // Draw procedurally ripped edges
            this._drawJaggedRect(ctx, -dims.w / 2, -dims.h / 2, dims.w, dims.h, 1.8, 5);
            ctx.fill();
            ctx.stroke();
            
            // Clipping print margin lines
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-dims.w / 2 + 6, -dims.h / 2 + 4);
            ctx.lineTo(dims.w / 2 - 6, -dims.h / 2 + 4);
            ctx.moveTo(-dims.w / 2 + 6, dims.h / 2 - 4);
            ctx.lineTo(dims.w / 2 - 6, dims.h / 2 - 4);
            ctx.stroke();
            
            // Newspaper title font
            ctx.fillStyle = '#111111';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 13px "Playfair Display", serif';
            this._drawFittedText(ctx, node.title, dims.w - 14, 0);
            
        } else if (node.shape === 'tape_label') {
            // Creme masking tape scrap
            ctx.fillStyle = '#ede5ce';
            ctx.strokeStyle = (this._engine.selectedNode === node) ? '#111' : 'rgba(0,0,0,0.1)';
            ctx.lineWidth = (this._engine.selectedNode === node) ? 2 : 0.5;
            
            // Draw ragged ripped ends on masking tape
            this._drawJaggedRect(ctx, -dims.w / 2, -dims.h / 2, dims.w, dims.h, 1.2, 4);
            ctx.fill();
            ctx.stroke();
            
            // Masking tape details
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#1c1c1e';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 10px "Special Elite", monospace';
            this._drawFittedText(ctx, node.title, dims.w - 12, 0);
            
        } else {
            // Note Card (Default note_card shape)
            ctx.fillStyle = node.color || '#f5e6c8';
            ctx.fillRect(-dims.w / 2, -dims.h / 2, dims.w, dims.h);
            ctx.strokeStyle = (this._engine.selectedNode === node) ? '#1c1c1e' : 'rgba(0,0,0,0.12)';
            ctx.lineWidth = (this._engine.selectedNode === node) ? 2.5 : 1;
            ctx.strokeRect(-dims.w / 2, -dims.h / 2, dims.w, dims.h);
            
            // Ruled lined cards (horizontal blue ink lines)
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = 'rgba(41, 128, 185, 0.22)';
            ctx.lineWidth = 1;
            const lineGap = 12;
            for (let ly = -dims.h / 2 + 16; ly < dims.h / 2 - 5; ly += lineGap) {
                ctx.beginPath();
                ctx.moveTo(-dims.w / 2 + 3, ly);
                ctx.lineTo(dims.w / 2 - 3, ly);
                ctx.stroke();
            }
            
            // Red vertical margin line
            ctx.strokeStyle = 'rgba(192, 57, 43, 0.35)';
            ctx.beginPath();
            ctx.moveTo(-dims.w / 2 + 16, -dims.h / 2);
            ctx.lineTo(-dims.w / 2 + 16, dims.h / 2);
            ctx.stroke();
            
            // Note card text
            ctx.fillStyle = '#1c1c1e';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 11px "Courier Prime", monospace';
            
            const words = node.title.split(' ');
            if (words.length > 2) {
                const mid = Math.ceil(words.length / 2);
                const line1 = words.slice(0, mid).join(' ');
                const line2 = words.slice(mid).join(' ');
                
                ctx.save();
                ctx.translate(0, -6);
                this._drawFittedText(ctx, line1, dims.w - 22, 0);
                ctx.restore();
                ctx.save();
                ctx.translate(0, 6);
                this._drawFittedText(ctx, line2, dims.w - 22, 0);
                ctx.restore();
            } else {
                this._drawFittedText(ctx, node.title, dims.w - 22, 0);
            }
        }
        
        // Draw delete button on hovered or selected tiles (invisible action)
        const isHovered = (this._engine.hoveredNode === node);
        const isSelected = (this._engine.selectedNode === node);
        if (isHovered || isSelected) {
            const btnX = dims.w / 2 - 8;
            const btnY = -dims.h / 2 + 8;
            const btnRadius = 6;
            
            ctx.save();
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#c0392b';
            ctx.beginPath();
            ctx.arc(btnX, btnY, btnRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✕', btnX, btnY);
            ctx.restore();
        }
        
        ctx.restore();
        
        // Draw Pushpin center point (always at center of node, opaque matching search queries)
        ctx.save();
        ctx.globalAlpha = opacity;
        this._drawPushpin(ctx, screenPos.x, screenPos.y, scale, '#c0392b');
        ctx.restore();
    }

    _drawFittedText(ctx, text, maxWidth, yOffset) {
        let size = 11;
        ctx.font = `bold ${size}px "Courier Prime", monospace`;
        while (ctx.measureText(text).width > maxWidth && size > 6) {
            size -= 0.5;
            ctx.font = `bold ${size}px "Courier Prime", monospace`;
        }
        ctx.fillText(text, 0, yOffset);
    }

    _drawJaggedRect(ctx, x, y, w, h, roughness = 1.5, segmentLength = 5) {
        ctx.beginPath();
        
        // Top edge
        ctx.moveTo(x, y);
        for (let curX = x + segmentLength; curX < x + w; curX += segmentLength) {
            ctx.lineTo(curX, y + (Math.random() * roughness - roughness / 2));
        }
        ctx.lineTo(x + w, y);
        
        // Right edge
        for (let curY = y + segmentLength; curY < y + h; curY += segmentLength) {
            ctx.lineTo(x + w + (Math.random() * roughness - roughness / 2), curY);
        }
        ctx.lineTo(x + w, y + h);
        
        // Bottom edge
        for (let curX = x + w - segmentLength; curX > x; curX -= segmentLength) {
            ctx.lineTo(curX, y + h + (Math.random() * roughness - roughness / 2));
        }
        ctx.lineTo(x, y + h);
        
        // Left edge
        for (let curY = y + h - segmentLength; curY > y; curY -= segmentLength) {
            ctx.lineTo(x + (Math.random() * roughness - roughness / 2), curY);
        }
        ctx.closePath();
    }

    _drawPushpin(ctx, x, y, scale, color) {
        ctx.save();
        
        // Pin Drop Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 4 * scale;
        ctx.shadowOffsetX = 2 * scale;
        ctx.shadowOffsetY = 3.5 * scale;
        
        // Pin shank metal entry point
        ctx.fillStyle = '#1c1c1e';
        ctx.beginPath();
        ctx.arc(x, y, 1.2 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Metallic shine string pin shank
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 1.8 * scale;
        ctx.beginPath();
        ctx.moveTo(x + 1.5 * scale, y + 1.5 * scale);
        ctx.lineTo(x + 3.5 * scale, y + 3.5 * scale);
        ctx.stroke();
        
        // Tack head
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + 3.5 * scale, y + 3.5 * scale, 4.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight shine speck
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(x + 2.8 * scale, y + 2.8 * scale, 1.4 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

window.NodeManager = NodeManager;
