/**
 * ui.js — Controls detail editing panels, search bar, and board list selector.
 */

class UIManager {
    constructor() {
        this.currentBoardId = null;
        this.activeNode = null;
        
        // Link arrays in edit mode
        this.editLinks = [];

        // Active theme color spools
        this.defaultTileColor = "#eedeb0"; // Default: Cream
        this.currentYarnColor = "#c0392b";  // Default: Red yarn
    }

    async init() {
        console.log('[UIManager] Initializing UI dashboard...');
        try {
            const boards = await window.api.listBoards();
            const selector = document.getElementById('board-selector');
            selector.innerHTML = "";
            
            // Populate select dropdown
            boards.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name.toUpperCase();
                selector.appendChild(opt);
            });
            
            if (boards.length === 0) {
                this.currentBoardId = null;
                await this.showCaseSelector(false); // force selection/creation (no close button)
                return;
            }
            
            // Pick first board as active if none selected yet
            if (!this.currentBoardId) {
                // Check if we can show selector or default
                this.showCaseSelector(false);
                return;
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
        const selector = document.getElementById('board-selector');
        if (selector) selector.value = boardId;
    }

    async createNewBoard() {
        this.showCaseSelector(true);
    }

    async showCaseSelector(allowClose = true) {
        try {
            const boards = await window.api.listBoards();
            this.selectorBoards = boards; // cache for filtering
            
            const overlay = document.getElementById('case-selector-overlay');
            const listContainer = document.getElementById('existing-cases-list');
            const closeBtn = document.getElementById('case-selector-close');
            const searchInput = document.getElementById('case-search');
            
            if (searchInput) searchInput.value = ''; // clear search field
            if (closeBtn) {
                closeBtn.style.display = (allowClose && this.currentBoardId) ? 'block' : 'none';
            }
            
            listContainer.innerHTML = '';
            
            if (boards.length === 0) {
                document.getElementById('case-list-section').style.display = 'none';
            } else {
                document.getElementById('case-list-section').style.display = 'block';
                boards.forEach(b => {
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed rgba(0,0,0,0.15); padding:6px 0;';
                    row.innerHTML = `
                        <div style="text-align:left; flex: 1; padding-right: 10px;">
                            <span style="font-family:\'Special Elite\',monospace; font-weight:bold; font-size:13px; color:var(--ink-dark);">${b.name.toUpperCase()}</span>
                            <div style="font-size:10px; color:var(--ink-faded); margin-top:2px; font-family:\'Courier Prime\',monospace;">${b.description || 'No description'}</div>
                        </div>
                        <button class="retro-inline-btn" style="padding:4px 8px; font-size:11px;" onclick="handleSelectCaseFromOverlay(\'${b.id}\')">OPEN DOSSIER</button>
                    `;
                    listContainer.appendChild(row);
                });
            }
            
            overlay.style.display = 'flex';
        } catch (err) {
            console.error('[UIManager] Failed to load cases in selector:', err);
        }
    }

    filterSelectorCases(query) {
        const queryClean = query.toLowerCase().trim();
        const listContainer = document.getElementById('existing-cases-list');
        if (!listContainer || !this.selectorBoards) return;
        
        listContainer.innerHTML = '';
        
        const filtered = this.selectorBoards.filter(b => 
            b.name.toLowerCase().includes(queryClean) || 
            (b.description && b.description.toLowerCase().includes(queryClean))
        );
        
        if (filtered.length === 0) {
            listContainer.innerHTML = '<div style="font-family:\'Courier Prime\',monospace; font-size:11px; font-style:italic; color:var(--ink-faded); padding:6px 0;">No matching dossiers.</div>';
            return;
        }
        
        filtered.forEach(b => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed rgba(0,0,0,0.15); padding:6px 0;';
            row.innerHTML = `
                <div style="text-align:left; flex: 1; padding-right: 10px;">
                    <span style="font-family:\'Special Elite\',monospace; font-weight:bold; font-size:13px; color:var(--ink-dark);">${b.name.toUpperCase()}</span>
                    <div style="font-size:10px; color:var(--ink-faded); margin-top:2px; font-family:\'Courier Prime\',monospace;">${b.description || 'No description'}</div>
                </div>
                <button class="retro-inline-btn" style="padding:4px 8px; font-size:11px;" onclick="handleSelectCaseFromOverlay(\'${b.id}\')">OPEN DOSSIER</button>
            `;
            listContainer.appendChild(row);
        });
    }

    async loadBoard(boardId) {
        console.log('[UIManager] Loading board data for:', boardId);
        try {
            // Load nodes and edges in parallel to reduce sequential network roundtrips
            const [nodes, edges] = await Promise.all([
                window.api.listNodes(boardId),
                window.api.listEdges(boardId)
            ]);
            
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
    
    async addTile(shape = "note_card", color = null) {
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
            shape: shape,
            color: color || this.defaultTileColor || "#eedeb0",
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
            color: this.currentYarnColor || "#c0392b",
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
        this.openInspector(node);
    }

    closeDetailPanel() {
        this.closeInspector();
    }

    /* ── Right Inspector Panel (Newspaper Vintage Inline Editor) ── */

    openInspector(node) {
        this.activeNode = node;

        // Update active swatch highlight in bottom tray
        document.querySelectorAll('.swatch-btn:not(.yarn-swatch)').forEach(btn => {
            btn.classList.remove('active');
            if (btn.title.toLowerCase() === this.getColorName(node.color)) {
                btn.classList.add('active');
            }
        });

        // Set inputs/fields in the newspaper inspector panel
        const badgeEl = document.getElementById('insp-badge');
        if (badgeEl) badgeEl.textContent = node.shape.replace(/_/g, ' ').toUpperCase();

        const titleEl = document.getElementById('insp-title');
        if (titleEl) {
            titleEl.textContent = node.title || '';
            // Blur / Enter key handler
            titleEl.onblur = () => this.saveActiveNodeIntel();
            titleEl.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    titleEl.blur();
                }
            };
        }

        const descEl = document.getElementById('insp-desc');
        if (descEl) {
            descEl.textContent = node.description || '';
            descEl.onblur = () => this.saveActiveNodeIntel();
        }

        const conceptsEl = document.getElementById('insp-concepts');
        if (conceptsEl) {
            conceptsEl.value = (node.concepts || []).join(', ');
            conceptsEl.onblur = () => this.saveActiveNodeIntel();
            conceptsEl.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    conceptsEl.blur();
                }
            };
        }

        const shapeEl = document.getElementById('insp-shape');
        if (shapeEl) {
            shapeEl.value = node.shape;
            shapeEl.onchange = () => this.saveActiveNodeIntel();
        }

        const colorEl = document.getElementById('insp-color');
        if (colorEl) {
            colorEl.value = node.color;
            colorEl.onchange = () => this.saveActiveNodeIntel();
        }

        // Render connected yarns
        const yarnsEl = document.getElementById('insp-yarns');
        if (yarnsEl) {
            yarnsEl.innerHTML = '';
            const edges = (window.edgeManager && window.edgeManager._edges) || [];
            const nodes = (window.nodeManager && window.nodeManager.getNodes()) || [];
            const connected = edges.filter(e => e.source_node_id === node.id || e.target_node_id === node.id);
            if (connected.length === 0) {
                yarnsEl.innerHTML = '<span style="font-family:Courier Prime,monospace;font-size:10px;color:#8a7a5f;font-style:italic;">No connections</span>';
            } else {
                connected.forEach(edge => {
                    const otherId = edge.source_node_id === node.id ? edge.target_node_id : edge.source_node_id;
                    const other = nodes.find(n => n.id === otherId);
                    const item = document.createElement('div');
                    item.className = 'inspector-yarn-item';
                    item.innerHTML = `
                        <span class="inspector-yarn-dot" style="background:${edge.color || '#c0392b'};"></span>
                        <span>${other ? other.title : 'Unknown clue'}</span>
                    `;
                    yarnsEl.appendChild(item);
                });
            }
        }

        // Render source links
        this.inspectorLinks = JSON.parse(JSON.stringify(node.links || []));
        this.renderInspectorLinks();

        // Slide the newspaper card open by adding 'active' class
        const panel = document.getElementById('right-inspector');
        if (panel) panel.classList.add('active');

        // Optional: center camera on node when opened
        if (window.canvasEngine) {
            window.canvasEngine.centerOn(node.x, node.y);
        }
    }

    closeInspector() {
        const panel = document.getElementById('right-inspector');
        if (panel) panel.classList.remove('active');
        this.activeNode = null;
        if (window.canvasEngine) {
            window.canvasEngine.selectedNode = null;
            window.canvasEngine.requestDraw();
        }
    }

    renderInspectorLinks() {
        const container = document.getElementById('insp-links');
        if (!container) return;
        container.innerHTML = '';
        
        if (!this.inspectorLinks || this.inspectorLinks.length === 0) {
            container.innerHTML = '<div class="no-papers">No links attached.</div>';
            return;
        }
        
        this.inspectorLinks.forEach((link, idx) => {
            const div = document.createElement('div');
            div.className = 'inspector-link-row';
            div.style.cssText = 'display:flex; flex-direction:column; gap:2px; border-bottom:1.5px dashed var(--ink-dark); padding-bottom:6px; margin-bottom:6px;';
            div.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <input type="text" class="link-title-input" value="${link.title || ''}" placeholder="Link Title" style="font-family:'Playfair Display',serif; font-size:12px; font-weight:bold; background:transparent; border:none; outline:none; flex:1; color:var(--ink-dark);" />
                <button class="link-delete-btn" style="background:none; border:none; cursor:pointer; font-size:11px; color:#c0392b; font-family:'Courier Prime',monospace; padding:0 4px;" title="Remove link">[✕]</button>
              </div>
              <input type="text" class="link-url-input" value="${link.url || ''}" placeholder="URL" style="font-family:'Courier Prime',monospace; font-size:10px; color:var(--ink-faded); background:transparent; border:none; outline:none; width:100%;" />
            `;
            
            const titleInput = div.querySelector('.link-title-input');
            const urlInput = div.querySelector('.link-url-input');
            const deleteBtn = div.querySelector('.link-delete-btn');
            
            titleInput.addEventListener('blur', () => {
                link.title = titleInput.value.trim();
                this.saveActiveNodeIntel();
            });
            urlInput.addEventListener('blur', () => {
                link.url = urlInput.value.trim();
                this.saveActiveNodeIntel();
            });
            deleteBtn.addEventListener('click', () => {
                this.inspectorLinks.splice(idx, 1);
                this.renderInspectorLinks();
                this.saveActiveNodeIntel();
            });
            
            container.appendChild(div);
        });
    }

    addInspectorLink() {
        if (!this.inspectorLinks) this.inspectorLinks = [];
        this.inspectorLinks.push({ title: 'New Resource', url: '' });
        this.renderInspectorLinks();
        setTimeout(() => {
            const rows = document.querySelectorAll('#insp-links .inspector-link-row');
            if (rows.length > 0) {
                const lastRow = rows[rows.length - 1];
                const input = lastRow.querySelector('.link-title-input');
                if (input) input.focus();
            }
        }, 50);
    }

    async saveActiveNodeIntel() {
        if (!this.activeNode) return;
        const node = this.activeNode;

        const titleEl = document.getElementById('insp-title');
        const descEl = document.getElementById('insp-desc');
        const conceptsEl = document.getElementById('insp-concepts');
        const shapeEl = document.getElementById('insp-shape');
        const colorEl = document.getElementById('insp-color');

        let concepts = [];
        if (conceptsEl) {
            concepts = conceptsEl.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }

        const links = this.inspectorLinks || [];

        const updatedData = {
            title: titleEl ? titleEl.textContent.trim() : node.title,
            description: descEl ? descEl.textContent.trim() : node.description,
            shape: shapeEl ? shapeEl.value : node.shape,
            color: colorEl ? colorEl.value : node.color,
            concepts: concepts,
            links: links
        };

        if (!updatedData.title) updatedData.title = "Untitled Clue";

        try {
            const updatedNode = await window.api.updateNode(this.currentBoardId, node.id, updatedData);
            
            Object.assign(node, updatedNode);
            
            const badgeEl = document.getElementById('insp-badge');
            if (badgeEl) badgeEl.textContent = node.shape.replace(/_/g, ' ').toUpperCase();

            if (window.nodeManager) {
                const nodesList = window.nodeManager.getNodes();
                const matched = nodesList.find(n => n.id === node.id);
                if (matched) {
                    Object.assign(matched, updatedNode);
                }
            }

            if (window.edgeManager) {
                window.edgeManager.loadEdges(window.edgeManager._edges || [], window.nodeManager.getNodes());
            }

            if (window.canvasEngine) {
                window.canvasEngine.requestDraw();
            }
        } catch (err) {
            console.error("Failed to auto-save node intel:", err);
        }
    }

    setTileColor(color) {
        document.querySelectorAll('.swatch-btn:not(.yarn-swatch)').forEach(btn => {
            btn.classList.remove('active');
            if (btn.title.toLowerCase() === this.getColorName(color)) {
                btn.classList.add('active');
            }
        });

        this.defaultTileColor = color;
        
        if (this.activeNode) {
            const node = this.activeNode;
            node.color = color;
            
            // Draw updated color immediately on canvas
            if (window.canvasEngine) {
                window.canvasEngine.requestDraw();
            }
            
            window.api.updateNode(this.currentBoardId, node.id, { color })
                .catch(err => console.error("Failed to update tile color:", err));
        }
    }

    setYarnColor(color) {
        document.querySelectorAll('.yarn-swatch').forEach(btn => {
            btn.classList.remove('active');
            if (btn.title.toLowerCase().startsWith(this.getYarnColorName(color))) {
                btn.classList.add('active');
            }
        });

        this.currentYarnColor = color;
    }

    getColorName(color) {
        const mapping = {
            '#eedeb0': 'cream',
            '#ffffff': 'white',
            '#f1c40f': 'yellow',
            '#c0392b': 'red',
            '#2980b9': 'blue',
            '#27ae60': 'green'
        };
        return mapping[color] || '';
    }

    getYarnColorName(color) {
        const mapping = {
            '#c0392b': 'red',
            '#2980b9': 'blue',
            '#27ae60': 'green',
            '#2c3e50': 'black',
            '#f1c40f': 'yellow'
        };
        return mapping[color] || '';
    }
}

window.ui = new UIManager();
