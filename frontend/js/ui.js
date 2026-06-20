/**
 * ui.js — Detail panel, search bar, and board dashboard UI logic.
 * Uses the architect-of-intelligence vintage paper aesthetic throughout.
 *
 * Phase 6 will implement full detail panel editing and search filtering.
 */

class UIManager {
    constructor() {
        this._activeNode = null;
        this._editMode = false;
    }

    openDetailPanel(node) {
        this._activeNode = node;
        this._editMode = false;
        const panel = document.getElementById('detail-panel');
        panel.classList.add('open');
        this._renderDetailPanel(node);
    }

    closeDetailPanel() {
        this._activeNode = null;
        document.getElementById('detail-panel').classList.remove('open');
    }

    _renderDetailPanel(node) {
        document.getElementById('detail-title').textContent = node.title;
        document.getElementById('detail-description').textContent = node.description || '— no notes —';
        // Phase 6: render concepts list and resource links
    }

    enableEditMode() {
        this._editMode = true;
        // Phase 6: swap display elements for input fields
    }

    async saveEdits() {
        if (!this._activeNode || !this._editMode) return;
        const updatedTitle = document.getElementById('detail-title-input').value;
        const updatedDesc = document.getElementById('detail-desc-input').value;
        await window.api.updateNode(this._activeNode.board_id, this._activeNode.id, {
            title: updatedTitle,
            description: updatedDesc,
        });
        this.closeDetailPanel();
    }

    /**
     * Filter visible tiles on the canvas by search query.
     * Matching nodes are highlighted; non-matching nodes fade.
     */
    filterBySearch(query, nodes) {
        const q = query.toLowerCase().trim();
        return nodes.map(node => ({
            ...node,
            _matched: !q || node.title.toLowerCase().includes(q),
        }));
    }
}

window.ui = new UIManager();
