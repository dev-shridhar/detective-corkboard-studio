/**
 * ui.js — Controls detail editing panels, search bar, and board list selector.
 */

class UIManager {
    constructor() {
        this.currentBoardId = null;
        this.activeNode = null;
        
        // Link arrays in edit mode
        this.editLinks = [];
    }

    async init() {
        console.log('[UIManager] Initializing UI dashboard...');
        try {
            const boards = await window.api.listBoards();
            const selector = document.getElementById('board-selector');
            selector.innerHTML = "";
            
            if (boards.length === 0) {
                // Seed a default case board if none exist
                console.log('[UIManager] No boards found. Creating default case...');
                const defaultBoard = await window.api.createBoard({
                    name: "CLASSIFIED CASE A",
                    description: "First master case file."
                });
                this.currentBoardId = defaultBoard.id;
                await this.init();
                return;
            }
            
            // Populate select dropdown
            boards.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name.toUpperCase();
                selector.appendChild(opt);
            });
            
            // Pick first board as active
            if (!this.currentBoardId) {
                this.currentBoardId = boards[0].id;
            }
            
            selector.value = this.currentBoardId;
            await this.loadBoard(this.currentBoardId);
            
        } catch (err) {
            console.error('[UIManager] Failed to load dashboard:', err);
        }
    }

    async switchBoard(boardId) {
        this.currentBoardId = boardId;
        this.closeDetailPanel();
        await this.loadBoard(boardId);
    }

    async createNewBoard() {
        const name = prompt("Enter New Case File Name:");
        if (!name || !name.trim()) return;
        
        try {
            const board = await window.api.createBoard({
                name: name.trim(),
                description: "New detective case corkboard."
            });
            this.currentBoardId = board.id;
            await this.init();
        } catch (err) {
            alert("Failed to create board: " + err.message);
        }
    }

    async loadBoard(boardId) {
        console.log('[UIManager] Loading board data for:', boardId);
        try {
            const nodes = await window.api.listNodes(boardId);
            const edges = await window.api.listEdges(boardId);
            
            if (window.nodeManager) {
                window.nodeManager.setNodes(nodes);
            }
            if (window.edgeManager) {
                window.edgeManager.loadEdges(edges, nodes);
            }
            if (window.history_manager) {
                window.history_manager.clear();
            }
            
            if (window.canvasEngine) {
                window.canvasEngine.requestDraw();
            }
            
        } catch (err) {
            console.error('[UIManager] Failed to load board elements:', err);
        }
    }

    /* ── Node actions ── */
    
    async addTile() {
        if (!this.currentBoardId) return;
        
        // Spawn tile at canvas viewport center
        let wx = 0, wy = 0;
        if (window.canvasEngine) {
            const center = window.canvasEngine.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
            wx = center.x;
            wy = center.y;
        }
        
        const nodePayload = {
            title: "New Clue",
            description: "Double click to write investigation notes...",
            shape: "note_card",
            color: "#f5e6c8",
            x: wx,
            y: wy,
            concepts: [],
            links: []
        };

        if (window.history_manager) {
            const cmd = new CreateNodeCommand(this.currentBoardId, nodePayload);
            await window.history_manager.execute(cmd);
        } else {
            const node = await window.api.createNode(this.currentBoardId, nodePayload);
            await this.loadBoard(this.currentBoardId);
            if (window.canvasEngine) {
                window.canvasEngine.selectedNode = node;
            }
        }
    }

    async deleteActiveNode() {
        if (!this.activeNode) return;
        const node = this.activeNode;
        
        if (window.history_manager) {
            // Find all connected edges that will be deleted along with this node
            const connectedEdges = (window.edgeManager && window.edgeManager._edges || [])
                .filter(e => e.source_node_id === node.id || e.target_node_id === node.id);
                
            const cmd = new DeleteNodeCommand(this.currentBoardId, node, connectedEdges);
            await window.history_manager.execute(cmd);
        } else {
            await window.api.deleteNode(this.currentBoardId, node.id);
            await this.loadBoard(this.currentBoardId);
        }
        this.closeDetailPanel();
    }

    async createEdge(sourceId, targetId) {
        const edgePayload = {
            source_node_id: sourceId,
            target_node_id: targetId,
            color: "#c0392b",
            label: ""
        };

        if (window.history_manager) {
            const cmd = new CreateEdgeCommand(this.currentBoardId, edgePayload);
            await window.history_manager.execute(cmd);
        } else {
            await window.api.createEdge(this.currentBoardId, edgePayload);
            await this.loadBoard(this.currentBoardId);
        }
    }

    handleSearch(query) {
        if (window.nodeManager) {
            window.nodeManager.filterBySearch(query);
        }
    }

    /* ── Details Panel ── */

    openDetailPanel(node) {
        this.activeNode = node;
        this.disableEditMode();
        
        // Setup View elements
        const badge = document.getElementById('detail-badge');
        badge.innerText = node.shape.replace('_', ' ').toUpperCase();
        
        document.getElementById('detail-title').innerText = node.title;
        document.getElementById('detail-description').innerText = node.description || '— no notes written —';
        
        // Render concepts tags
        const conceptsContainer = document.getElementById('detail-concepts');
        conceptsContainer.innerHTML = "";
        if (node.concepts && node.concepts.length > 0) {
            node.concepts.forEach(c => {
                const li = document.createElement('li');
                li.innerText = c;
                conceptsContainer.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.innerText = "No tags";
            li.style.fontStyle = "italic";
            conceptsContainer.appendChild(li);
        }
        
        // Render resource links
        const linksContainer = document.getElementById('detail-links');
        linksContainer.innerHTML = "";
        if (node.links && node.links.length > 0) {
            node.links.forEach(l => {
                const a = document.createElement('a');
                a.className = "paper-item";
                a.href = l.url.startsWith('http') ? l.url : `https://${l.url}`;
                a.target = "_blank";
                a.rel = "noopener noreferrer";
                
                const tDiv = document.createElement('div');
                tDiv.className = "paper-title";
                tDiv.innerText = l.title;
                
                const uDiv = document.createElement('div');
                uDiv.className = "paper-author";
                uDiv.innerText = l.url;
                
                a.appendChild(tDiv);
                a.appendChild(uDiv);
                linksContainer.appendChild(a);
            });
        } else {
            const p = document.createElement('p');
            p.className = "no-papers";
            p.innerText = "No resources linked to this dossier.";
            linksContainer.appendChild(p);
        }
        
        document.getElementById('detail-panel').classList.add('open');
        if (window.canvasEngine) {
            window.canvasEngine.centerOn(node.x, node.y);
        }
    }

    closeDetailPanel() {
        this.activeNode = null;
        document.getElementById('detail-panel').classList.remove('open');
        if (window.canvasEngine) {
            window.canvasEngine.selectedNode = null;
            window.canvasEngine.requestDraw();
        }
    }

    enableEditMode() {
        if (!this.activeNode) return;
        const node = this.activeNode;
        
        // Toggle view containers
        document.getElementById('detail-view-mode').style.display = 'none';
        document.getElementById('detail-edit-mode').style.display = 'block';
        
        // Populate edit inputs
        document.getElementById('edit-title').value = node.title;
        document.getElementById('edit-desc').value = node.description || '';
        document.getElementById('edit-shape').value = node.shape;
        document.getElementById('edit-color').value = node.color;
        document.getElementById('edit-concepts').value = (node.concepts || []).join(', ');
        
        // Render dynamic link fields
        this.editLinks = JSON.parse(JSON.stringify(node.links || []));
        this._renderEditLinkFields();
    }

    disableEditMode() {
        document.getElementById('detail-view-mode').style.display = 'block';
        document.getElementById('detail-edit-mode').style.display = 'none';
    }

    _renderEditLinkFields() {
        const container = document.getElementById('edit-links-container');
        container.innerHTML = "";
        
        this.editLinks.forEach((link, idx) => {
            const row = document.createElement('div');
            row.style.display = "flex";
            row.style.gap = "6px";
            
            const tInput = document.createElement('input');
            tInput.type = "text";
            tInput.placeholder = "Link Label";
            tInput.value = link.title;
            tInput.style.flex = "1";
            tInput.style.fontFamily = "'Courier Prime', monospace";
            tInput.style.fontSize = "11px";
            tInput.oninput = (e) => { this.editLinks[idx].title = e.target.value; };
            
            const uInput = document.createElement('input');
            uInput.type = "text";
            uInput.placeholder = "URL";
            uInput.value = link.url;
            uInput.style.flex = "2";
            uInput.style.fontFamily = "'Courier Prime', monospace";
            uInput.style.fontSize = "11px";
            uInput.oninput = (e) => { this.editLinks[idx].url = e.target.value; };
            
            const delBtn = document.createElement('button');
            delBtn.className = "retro-inline-btn";
            delBtn.style.background = "#c0392b";
            delBtn.innerText = "✕";
            delBtn.onclick = () => {
                this.editLinks.splice(idx, 1);
                this._renderEditLinkFields();
            };
            
            row.appendChild(tInput);
            row.appendChild(uInput);
            row.appendChild(delBtn);
            container.appendChild(row);
        });
    }

    addEditLinkField() {
        this.editLinks.push({ title: '', url: '' });
        this._renderEditLinkFields();
    }

    async saveEdits() {
        if (!this.activeNode) return;
        const node = this.activeNode;
        
        const title = document.getElementById('edit-title').value.trim();
        const desc = document.getElementById('edit-desc').value.trim();
        const shape = document.getElementById('edit-shape').value;
        const color = document.getElementById('edit-color').value;
        
        const concepts = document.getElementById('edit-concepts').value
            .split(',')
            .map(c => c.trim())
            .filter(c => c.length > 0);
            
        // Filter empty links
        const links = this.editLinks.filter(l => l.title.trim() && l.url.trim());
        
        const payload = {
            title: title || "Clue",
            description: desc,
            shape,
            color,
            concepts,
            links
        };

        try {
            const updated = await window.api.updateNode(this.currentBoardId, node.id, payload);
            
            // Update local object states directly
            Object.assign(node, updated);
            
            // Reload and refresh
            await this.loadBoard(this.currentBoardId);
            this.openDetailPanel(node);
        } catch (err) {
            alert("Failed to save changes: " + err.message);
        }
    }
}

window.ui = new UIManager();
