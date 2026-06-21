/**
 * history.js — Command-pattern Undo/Redo stack manager.
 * Encapsulates moves, card creation/deletions, and yarn connections.
 */

class Command {
    async execute() { throw new Error('execute() not implemented'); }
    async undo() { throw new Error('undo() not implemented'); }
}

/**
 * Command to track card reposition displacements
 */
class MoveNodeCommand extends Command {
    constructor(boardId, nodeId, fromPos, toPos) {
        super();
        this.boardId = boardId;
        this.nodeId = nodeId;
        this.fromPos = fromPos;
        this.toPos = toPos;
    }

    async execute() {
        this._updateLocalPosition(this.toPos);
        window.api.updateNode(this.boardId, this.nodeId, { x: this.toPos.x, y: this.toPos.y })
            .catch(err => console.error('[MoveNodeCommand] Sync error:', err));
    }

    async undo() {
        this._updateLocalPosition(this.fromPos);
        window.api.updateNode(this.boardId, this.nodeId, { x: this.fromPos.x, y: this.fromPos.y })
            .catch(err => console.error('[MoveNodeCommand] Undo sync error:', err));
    }

    _updateLocalPosition(pos) {
        if (window.nodeManager) {
            const node = window.nodeManager.getNodes().find(n => n.id === this.nodeId);
            if (node) {
                node.x = pos.x;
                node.y = pos.y;
                if (window.canvasEngine) {
                    window.canvasEngine.requestDraw();
                }
            }
        }
    }
}

/**
 * Command to track card creations
 */
class CreateNodeCommand extends Command {
    constructor(boardId, payload) {
        super();
        this.boardId = boardId;
        this.payload = payload;
        this.nodeId = null;  // populated on first execute
    }

    async execute() {
        const tempId = this.nodeId || 'temp-' + Date.now();
        const nodePayload = { id: tempId, board_id: this.boardId, ...this.payload };
        
        // Optimistically add to UI
        if (window.nodeManager) {
            const nodes = window.nodeManager.getNodes();
            if (!nodes.some(n => n.id === tempId)) {
                nodes.push(nodePayload);
                window.nodeManager.setNodes(nodes);
            }
        }

        if (window.canvasEngine) {
            window.canvasEngine.selectedNode = nodePayload;
        }

        if (this.nodeId) {
            // Restore deleted node with exact properties and ID
            const payloadWithId = { ...this.payload, id: this.nodeId };
            window.api.createNode(this.boardId, payloadWithId)
                .catch(err => console.error('[CreateNodeCommand] Restore error:', err));
        } else {
            window.api.createNode(this.boardId, this.payload)
                .then(node => {
                    this.nodeId = node.id;
                    // Replace temp node in local state
                    if (window.nodeManager) {
                        const nodes = window.nodeManager.getNodes();
                        const idx = nodes.findIndex(n => n.id === tempId);
                        if (idx !== -1) {
                            nodes[idx] = node;
                            window.nodeManager.setNodes(nodes);
                            if (window.canvasEngine && window.canvasEngine.selectedNode && window.canvasEngine.selectedNode.id === tempId) {
                                window.canvasEngine.selectedNode = node;
                            }
                        }
                    }
                })
                .catch(err => {
                    console.error('[CreateNodeCommand] Create error:', err);
                    // Rollback
                    if (window.nodeManager) {
                        const nodes = window.nodeManager.getNodes().filter(n => n.id !== tempId);
                        window.nodeManager.setNodes(nodes);
                    }
                });
        }
    }

    async undo() {
        if (this.nodeId) {
            // Optimistically remove from UI
            if (window.nodeManager) {
                const nodes = window.nodeManager.getNodes().filter(n => n.id !== this.nodeId);
                window.nodeManager.setNodes(nodes);
            }
            window.api.deleteNode(this.boardId, this.nodeId)
                .catch(err => console.error('[CreateNodeCommand] Delete error:', err));
        }
    }
}

/**
 * Command to track card deletions (restores connections too)
 */
class DeleteNodeCommand extends Command {
    constructor(boardId, node, connectedEdges = []) {
        super();
        this.boardId = boardId;
        this.node = node;
        this.connectedEdges = connectedEdges; // saves edges linked to this node
    }

    async execute() {
        // Optimistically remove node and connected edges from UI
        if (window.nodeManager) {
            const nodes = window.nodeManager.getNodes().filter(n => n.id !== this.node.id);
            window.nodeManager.setNodes(nodes);
        }
        if (window.edgeManager) {
            window.edgeManager._edges = window.edgeManager._edges.filter(
                e => e.source_node_id !== this.node.id && e.target_node_id !== this.node.id
            );
            if (window.canvasEngine) window.canvasEngine.requestDraw();
        }

        window.api.deleteNode(this.boardId, this.node.id)
            .catch(err => console.error('[DeleteNodeCommand] Delete error:', err));
    }

    async undo() {
        // Optimistically restore node and edges to UI
        if (window.nodeManager) {
            const nodes = window.nodeManager.getNodes();
            if (!nodes.some(n => n.id === this.node.id)) {
                nodes.push(this.node);
                window.nodeManager.setNodes(nodes);
            }
        }
        if (window.edgeManager) {
            for (const edge of this.connectedEdges) {
                if (!window.edgeManager._edges.some(e => e.id === edge.id)) {
                    window.edgeManager._edges.push(edge);
                }
            }
            if (window.canvasEngine) window.canvasEngine.requestDraw();
        }

        // Re-create in background
        const payload = {
            id: this.node.id,
            title: this.node.title,
            description: this.node.description,
            shape: this.node.shape,
            color: this.node.color,
            x: this.node.x,
            y: this.node.y,
            concepts: this.node.concepts,
            links: this.node.links
        };
        window.api.createNode(this.boardId, payload)
            .then(() => {
                for (const edge of this.connectedEdges) {
                    const edgePayload = {
                        id: edge.id,
                        source_node_id: edge.source_node_id,
                        target_node_id: edge.target_node_id,
                        color: edge.color,
                        label: edge.label
                    };
                    window.api.createEdge(this.boardId, edgePayload)
                        .catch(err => console.error('[DeleteNodeCommand] Edge restore error:', err));
                }
            })
            .catch(err => console.error('[DeleteNodeCommand] Node restore error:', err));
    }
}

/**
 * Command to track string connections
 */
class CreateEdgeCommand extends Command {
    constructor(boardId, payload) {
        super();
        this.boardId = boardId;
        this.payload = payload;
        this.edgeId = null;
    }

    async execute() {
        const tempId = this.edgeId || 'temp-' + Date.now();
        const edgePayload = { id: tempId, ...this.payload };

        // Optimistically add edge to UI
        if (window.edgeManager) {
            if (!window.edgeManager._edges.some(e => e.id === tempId)) {
                window.edgeManager._edges.push(edgePayload);
                if (window.canvasEngine) window.canvasEngine.requestDraw();
            }
        }

        if (this.edgeId) {
            const payloadWithId = { ...this.payload, id: this.edgeId };
            window.api.createEdge(this.boardId, payloadWithId)
                .catch(err => console.error('[CreateEdgeCommand] Restore error:', err));
        } else {
            window.api.createEdge(this.boardId, this.payload)
                .then(edge => {
                    this.edgeId = edge.id;
                    // Replace temp edge
                    if (window.edgeManager) {
                        const idx = window.edgeManager._edges.findIndex(e => e.id === tempId);
                        if (idx !== -1) {
                            window.edgeManager._edges[idx] = edge;
                            if (window.canvasEngine) window.canvasEngine.requestDraw();
                        }
                    }
                })
                .catch(err => {
                    console.error('[CreateEdgeCommand] Create error:', err);
                    // Rollback
                    if (window.edgeManager) {
                        window.edgeManager._edges = window.edgeManager._edges.filter(e => e.id !== tempId);
                        if (window.canvasEngine) window.canvasEngine.requestDraw();
                    }
                });
        }
    }

    async undo() {
        if (this.edgeId) {
            // Optimistically remove from UI
            if (window.edgeManager) {
                window.edgeManager._edges = window.edgeManager._edges.filter(e => e.id !== this.edgeId);
                if (window.canvasEngine) window.canvasEngine.requestDraw();
            }
            window.api.deleteEdge(this.boardId, this.edgeId)
                .catch(err => console.error('[CreateEdgeCommand] Delete error:', err));
        }
    }
}

/**
 * History Manager stack
 */
class HistoryManager {
    constructor(maxSize = 100) {
        this._undoStack = [];
        this._redoStack = [];
        this._maxSize = maxSize;
        this._bindKeyboard();
    }

    async execute(command) {
        console.log('[HistoryManager] Executing command:', command.constructor.name);
        try {
            await command.execute();
            this._undoStack.push(command);
            if (this._undoStack.length > this._maxSize) {
                this._undoStack.shift();
            }
            this._redoStack = []; // Clear redo stack on new action
        } catch (err) {
            console.error('[HistoryManager] Failed to execute command:', err);
        }
    }

    async undo() {
        const command = this._undoStack.pop();
        if (!command) {
            console.log('[HistoryManager] Nothing to undo.');
            return;
        }
        console.log('[HistoryManager] Undoing command:', command.constructor.name);
        try {
            await command.undo();
            this._redoStack.push(command);
        } catch (err) {
            console.error('[HistoryManager] Failed to undo command:', err);
        }
    }

    async redo() {
        const command = this._redoStack.pop();
        if (!command) {
            console.log('[HistoryManager] Nothing to redo.');
            return;
        }
        console.log('[HistoryManager] Redoing command:', command.constructor.name);
        try {
            await command.execute();
            this._undoStack.push(command);
        } catch (err) {
            console.error('[HistoryManager] Failed to redo command:', err);
        }
    }

    clear() {
        this._undoStack = [];
        this._redoStack = [];
    }

    _bindKeyboard() {
        document.addEventListener('keydown', async (e) => {
            const ctrl = e.ctrlKey || e.metaKey;
            
            // Do not capture keyboard shortcuts if user is typing inside text input fields
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
                return;
            }
            
            if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                await this.undo();
            }
            if (ctrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
                e.preventDefault();
                await this.redo();
            }
        });
    }
}

window.history_manager = new HistoryManager();
window.MoveNodeCommand = MoveNodeCommand;
window.CreateNodeCommand = CreateNodeCommand;
window.DeleteNodeCommand = DeleteNodeCommand;
window.CreateEdgeCommand = CreateEdgeCommand;
