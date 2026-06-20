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
        await window.api.updateNode(this.boardId, this.nodeId, { x: this.toPos.x, y: this.toPos.y });
        this._updateLocalPosition(this.toPos);
    }

    async undo() {
        await window.api.updateNode(this.boardId, this.nodeId, { x: this.fromPos.x, y: this.fromPos.y });
        this._updateLocalPosition(this.fromPos);
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
        if (this.nodeId) {
            // Restore deleted node with exact properties and ID
            const payloadWithId = { ...this.payload, id: this.nodeId };
            await window.api.createNode(this.boardId, payloadWithId);
        } else {
            const node = await window.api.createNode(this.boardId, this.payload);
            this.nodeId = node.id;
        }
        await window.ui.loadBoard(this.boardId);
        
        // Select restored node
        if (window.canvasEngine && window.nodeManager) {
            const node = window.nodeManager.getNodes().find(n => n.id === this.nodeId);
            if (node) window.canvasEngine.selectedNode = node;
        }
    }

    async undo() {
        if (this.nodeId) {
            await window.api.deleteNode(this.boardId, this.nodeId);
            await window.ui.loadBoard(this.boardId);
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
        await window.api.deleteNode(this.boardId, this.node.id);
        await window.ui.loadBoard(this.boardId);
    }

    async undo() {
        // Restore the node payload
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
        await window.api.createNode(this.boardId, payload);
        
        // Restore connected edges
        for (const edge of this.connectedEdges) {
            const edgePayload = {
                id: edge.id,
                source_node_id: edge.source_node_id,
                target_node_id: edge.target_node_id,
                color: edge.color,
                label: edge.label
            };
            await window.api.createEdge(this.boardId, edgePayload);
        }
        
        await window.ui.loadBoard(this.boardId);
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
        if (this.edgeId) {
            const payloadWithId = { ...this.payload, id: this.edgeId };
            await window.api.createEdge(this.boardId, payloadWithId);
        } else {
            const edge = await window.api.createEdge(this.boardId, this.payload);
            this.edgeId = edge.id;
        }
        await window.ui.loadBoard(this.boardId);
    }

    async undo() {
        if (this.edgeId) {
            await window.api.deleteEdge(this.boardId, this.edgeId);
            await window.ui.loadBoard(this.boardId);
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
