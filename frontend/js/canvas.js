/**
 * canvas.js — Infinite HTML5 Canvas Viewport Engine.
 * Manages pan, zoom, scale-preserving translation, and event routing
 * to NodeManager and EdgeManager.
 */

class CanvasEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Camera Viewport State
        this.scale = 0.85;
        this.offsetX = 0;
        this.offsetY = 20;
        
        // Mouse State
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;
        this.hoveredNode = null;
        this.selectedNode = null;
        
        // Interactive connect thread state
        this.connectingSource = null;
        
        // Drawing flags
        this.renderRequested = false;
        this.corkPattern = null;
        
        // Camera Lerp target for transitions
        this.targetX = null;
        this.targetY = null;
        this.isAnimating = false;
        
        this._initEvents();
        this._createCorkTexture();
        this.resize();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.requestDraw();
    }

    worldToScreen(wx, wy) {
        const sx = this.canvas.width / 2 + this.offsetX + wx * this.scale;
        const sy = this.canvas.height / 2 + this.offsetY + wy * this.scale;
        return { x: sx, y: sy };
    }

    screenToWorld(sx, sy) {
        const wx = (sx - this.canvas.width / 2 - this.offsetX) / this.scale;
        const wy = (sy - this.canvas.height / 2 - this.offsetY) / this.scale;
        return { x: wx, y: wy };
    }

    pan(dx, dy) {
        this.isAnimating = false;
        this.offsetX += dx;
        this.offsetY += dy;
        this.requestDraw();
    }

    zoom(factor, clientX = this.canvas.width / 2, clientY = this.canvas.height / 2) {
        this.isAnimating = false;
        const prevScale = this.scale;
        this.scale = Math.max(0.3, Math.min(this.scale * factor, 2.5));
        
        // Zoom centered on the cursor position
        const worldPos = this.screenToWorld(clientX, clientY);
        this.offsetX = clientX - this.canvas.width / 2 - worldPos.x * this.scale;
        this.offsetY = clientY - this.canvas.height / 2 - worldPos.y * this.scale;
        
        this.requestDraw();
    }

    resetView() {
        this.scale = 0.85;
        this.offsetX = 0;
        this.offsetY = 20;
        this.selectedNode = null;
        this.isAnimating = false;
        if (window.ui) {
            window.ui.closeDetailPanel();
        }
        this.requestDraw();
    }

    centerOn(wx, wy) {
        this.targetX = -(wx * this.scale);
        this.targetY = -(wy * this.scale) + 50; // offset slightly for editor panel space
        this.isAnimating = true;
        requestAnimationFrame(() => this._animateCamera());
    }

    _animateCamera() {
        if (!this.isAnimating || this.targetX === null || this.targetY === null) return;
        const dx = this.targetX - this.offsetX;
        const dy = this.targetY - this.offsetY;
        
        if (Math.hypot(dx, dy) < 0.5) {
            this.offsetX = this.targetX;
            this.offsetY = this.targetY;
            this.isAnimating = false;
            this.targetX = null;
            this.targetY = null;
        } else {
            this.offsetX += dx * 0.12; // Easing speed
            this.offsetY += dy * 0.12;
            requestAnimationFrame(() => this._animateCamera());
        }
        this.requestDraw();
    }

    requestDraw() {
        if (!this.renderRequested) {
            this.renderRequested = true;
            requestAnimationFrame(() => this.draw());
        }
    }

    draw() {
        this.renderRequested = false;
        
        // Clear canvas and draw cork board texture
        this.ctx.fillStyle = this.corkPattern || '#bc9673';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw wood shadow frame borders
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0,0,0,0.85)';
        this.ctx.shadowBlur = 30;
        this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        this.ctx.lineWidth = 12;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        
        // Set camera matrices
        this.ctx.save();
        
        // Draw cards (nodes) first
        if (window.nodeManager) {
            window.nodeManager.draw(this.ctx, this);
        }
        
        // Draw links (edges) next (on top of tiles)
        if (window.edgeManager) {
            window.edgeManager.draw(this.ctx, this);
        }
        
        this.ctx.restore();
    }

    _createCorkTexture() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 256;
        tempCanvas.height = 256;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Base warm cork fill
        tempCtx.fillStyle = '#bc9673';
        tempCtx.fillRect(0, 0, 256, 256);
        
        // Procedural noise specks
        for (let i = 0; i < 15000; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const size = Math.random() * 1.5;
            const rand = Math.random();
            if (rand < 0.5) {
                tempCtx.fillStyle = 'rgba(109, 78, 51, ' + (Math.random() * 0.16 + 0.04) + ')';
            } else {
                tempCtx.fillStyle = 'rgba(235, 210, 180, ' + (Math.random() * 0.22 + 0.03) + ')';
            }
            tempCtx.beginPath();
            tempCtx.arc(x, y, size, 0, Math.PI * 2);
            tempCtx.fill();
        }
        
        // Soft pulp patches
        for (let i = 0; i < 35; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const w = Math.random() * 14 + 6;
            const h = Math.random() * 7 + 3;
            tempCtx.fillStyle = 'rgba(120, 85, 55, 0.09)';
            tempCtx.beginPath();
            tempCtx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
            tempCtx.fill();
        }
        
        this.corkPattern = this.ctx.createPattern(tempCanvas, 'repeat');
    }

    _initEvents() {
        window.addEventListener('resize', () => this.resize());
        
        this.canvas.addEventListener('mousedown', (e) => {
            // Prevent browser text selection or drag-and-drop actions from hijacking the pan/drag logic
            e.preventDefault();
            
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const worldPos = this.screenToWorld(mouseX, mouseY);
            
            // Check if user clicked on any pushpin, tile, or delete button
            let node = null;
            let isPin = false;
            let isDelete = false;
            
            if (window.nodeManager) {
                const hit = window.nodeManager.hitTest(mouseX, mouseY, this);
                if (hit) {
                    node = hit.node;
                    isPin = hit.isPin;
                    isDelete = hit.isDelete;
                }
            }
            
            if (node) {
                if (isDelete) {
                    // Trigger immediate direct tile deletion
                    if (window.ui) {
                        window.ui.activeNode = node;
                        window.ui.deleteActiveNode();
                    }
                } else if (isPin) {
                    // Start string connection flow
                    this.connectingSource = node;
                    if (window.edgeManager) {
                        const pinScreen = this.worldToScreen(node.x, node.y);
                        const activeYarnColor = window.ui && window.ui.currentYarnColor || '#c0392b';
                        window.edgeManager.startPreview(pinScreen.x, pinScreen.y, activeYarnColor);
                    }
                } else {
                    // Single click: just select + start drag (inspector opens on dblclick)
                    if (window.nodeManager) {
                        window.nodeManager.startDrag(node, mouseX, mouseY, this);
                    }
                    this.selectedNode = node;
                    if (window.ui) window.ui.activeNode = node;
                }
            } else {
                // Empty space clicked → Pan camera + close inspector
                this.isPanning = true;
                this.startX = mouseX - this.offsetX;
                this.startY = mouseY - this.offsetY;
                if (window.ui) {
                    window.ui.closeInspector();
                }
            }
            this.requestDraw();
        });

        window.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            if (this.connectingSource) {
                // Update connect yarn preview line
                if (window.edgeManager) {
                    window.edgeManager.updatePreview(mouseX, mouseY);
                }
            } else if (window.nodeManager && window.nodeManager.isDragging()) {
                // Drag node
                window.nodeManager.moveDrag(mouseX, mouseY, this);
            } else if (this.isPanning) {
                // Pan viewport
                this.offsetX = mouseX - this.startX;
                this.offsetY = mouseY - this.startY;
                this.requestDraw();
            } else {
                // Normal hovering cursor change check
                let hover = null;
                if (window.nodeManager) {
                    const hit = window.nodeManager.hitTest(mouseX, mouseY, this);
                    if (hit) hover = hit;
                }
                
                let newHoveredNode = hover ? hover.node : null;
                if (hover && hover.isDelete) {
                    this.canvas.style.cursor = 'pointer';
                } else if (hover) {
                    this.canvas.style.cursor = hover.isPin ? 'crosshair' : 'grab';
                } else {
                    this.canvas.style.cursor = 'default';
                }

                if (this.hoveredNode !== newHoveredNode) {
                    this.hoveredNode = newHoveredNode;
                    this.requestDraw(); // Redraw immediately to render/hide the delete button
                }
            }
        });

        window.addEventListener('mouseup', async (e) => {
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            if (this.connectingSource) {
                // Check if snap released over another node
                let targetNode = null;
                if (window.nodeManager) {
                    const hit = window.nodeManager.hitTest(mouseX, mouseY, this);
                    if (hit) targetNode = hit.node;
                }
                
                if (window.edgeManager) {
                    window.edgeManager.cancelPreview();
                }
                
                if (targetNode && targetNode.id !== this.connectingSource.id) {
                    // Create new connection yarn string!
                    if (window.ui) {
                        await window.ui.createEdge(this.connectingSource.id, targetNode.id);
                    }
                }
                this.connectingSource = null;
            } else if (window.nodeManager && window.nodeManager.isDragging()) {
                // Stop dragging node
                await window.nodeManager.endDrag();
            }
            
            this.isPanning = false;
            this.requestDraw();
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.08 : 0.92;
            this.zoom(factor, e.clientX, e.clientY);
        });

        // Double-click on tile → open right inspector panel with editable fields
        this.canvas.addEventListener('dblclick', (e) => {
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            if (window.nodeManager) {
                const hit = window.nodeManager.hitTest(mouseX, mouseY, this);
                if (hit && !hit.isPin && !hit.isDelete && window.ui) {
                    this.selectedNode = hit.node;
                    window.ui.openInspector(hit.node);
                }
            }
        });
    }
}

// Instantiate canvas viewport engine on load
window.addEventListener('DOMContentLoaded', () => {
    window.canvasEngine = new CanvasEngine('graphCanvas');
    window.nodeManager = new window.NodeManager(window.canvasEngine);
    window.edgeManager = new window.EdgeManager(window.canvasEngine);
});
