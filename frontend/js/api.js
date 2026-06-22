/**
 * api.js — HTTP client for communicating with the FastAPI backend.
 * All fetch calls go through this module. Handles Authorization headers,
 * JSON serialization, and error normalization.
 *
 * Phase 2+ will implement full request logic.
 */

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000/api/v1'
    : 'https://detective-corkboard-studio.onrender.com/api/v1';

class ApiClient {
    constructor() {
        this._accessToken = null;
        this._pendingCreations = new Map();
    }

    setToken(token) {
        this._accessToken = token;
    }

    clearToken() {
        this._accessToken = null;
    }

    _headers(extra = {}) {
        const headers = { 'Content-Type': 'application/json', ...extra };
        if (this._accessToken) {
            headers['Authorization'] = `Bearer ${this._accessToken}`;
        }
        return headers;
    }

    async _request(method, path, body = null) {
        const options = { method, headers: this._headers(), credentials: 'include' };
        if (body) options.body = JSON.stringify(body);
        const res = await fetch(`${API_BASE}${path}`, options);
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            let message = 'Request failed';
            if (typeof err.detail === 'string') {
                message = err.detail;
            } else if (Array.isArray(err.detail)) {
                message = err.detail.map(d => {
                    const field = d.loc ? d.loc[d.loc.length - 1] : '';
                    return field ? `${field}: ${d.msg}` : d.msg;
                }).join(', ');
            } else if (err.message) {
                message = err.message;
            }
            throw new Error(message);
        }
        return res.status === 204 ? null : res.json();
    }

    // --- Auth ---
    register(payload) { return this._request('POST', '/auth/register', payload); }
    async login(username, password) {
        const form = new URLSearchParams({ username, password });
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            body: form,
            credentials: 'include'
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            let message = 'Login failed';
            if (typeof err.detail === 'string') {
                message = err.detail;
            } else if (Array.isArray(err.detail)) {
                message = err.detail.map(d => {
                    const field = d.loc ? d.loc[d.loc.length - 1] : '';
                    return field ? `${field}: ${d.msg}` : d.msg;
                }).join(', ');
            } else if (err.message) {
                message = err.message;
            }
            throw new Error(message);
        }
        return res.json();
    }
    refresh() { return this._request('POST', '/auth/refresh'); }
    logout() { return this._request('POST', '/auth/logout'); }
    getMe() { return this._request('GET', '/auth/me'); }
    verifyEmail(payload) { return this._request('POST', '/auth/verify-email', payload); }
    resendVerification(payload) { return this._request('POST', '/auth/resend-verification', payload); }
    getSettings() { return this._request('GET', '/auth/settings'); }
    updateSettings(data) { return this._request('PUT', '/auth/settings', data); }


    // --- Boards ---
    listBoards() { return this._request('GET', '/boards'); }
    createBoard(data) { return this._request('POST', '/boards', data); }
    getBoard(id) { return this._request('GET', `/boards/${id}`); }
    updateBoard(id, data) { return this._request('PATCH', `/boards/${id}`, data); }
    deleteBoard(id) { return this._request('DELETE', `/boards/${id}`); }

    // --- Nodes ---
    listNodes(boardId) { return this._request('GET', `/boards/${boardId}/nodes`); }
    createNode(boardId, data) { return this._request('POST', `/boards/${boardId}/nodes`, data); }
    async updateNode(boardId, nodeId, data) {
        if (typeof nodeId === 'string' && nodeId.startsWith('temp-')) {
            const pending = this._pendingCreations.get(nodeId);
            if (pending) {
                console.log(`[ApiClient] Queueing updateNode for temp ID ${nodeId}...`);
                const realNode = await pending;
                return this.updateNode(boardId, realNode.id, data);
            }
        }
        return this._request('PATCH', `/boards/${boardId}/nodes/${nodeId}`, data);
    }
    async deleteNode(boardId, nodeId) {
        if (typeof nodeId === 'string' && nodeId.startsWith('temp-')) {
            const pending = this._pendingCreations.get(nodeId);
            if (pending) {
                console.log(`[ApiClient] Queueing deleteNode for temp ID ${nodeId}...`);
                const realNode = await pending;
                return this.deleteNode(boardId, realNode.id);
            }
        }
        return this._request('DELETE', `/boards/${boardId}/nodes/${nodeId}`);
    }

    // --- Edges ---
    listEdges(boardId) { return this._request('GET', `/boards/${boardId}/edges`); }
    async createEdge(boardId, data) {
        let sourceId = data.source_node_id;
        let targetId = data.target_node_id;
        if (typeof sourceId === 'string' && sourceId.startsWith('temp-')) {
            const pending = this._pendingCreations.get(sourceId);
            if (pending) {
                console.log(`[ApiClient] Queueing createEdge (resolving source temp ID ${sourceId})...`);
                const realNode = await pending;
                data.source_node_id = realNode.id;
            }
        }
        if (typeof targetId === 'string' && targetId.startsWith('temp-')) {
            const pending = this._pendingCreations.get(targetId);
            if (pending) {
                console.log(`[ApiClient] Queueing createEdge (resolving target temp ID ${targetId})...`);
                const realNode = await pending;
                data.target_node_id = realNode.id;
            }
        }
        return this._request('POST', `/boards/${boardId}/edges`, data);
    }
    updateEdge(boardId, edgeId, data) { return this._request('PATCH', `/boards/${boardId}/edges/${edgeId}`, data); }
    deleteEdge(boardId, edgeId) { return this._request('DELETE', `/boards/${boardId}/edges/${edgeId}`); }
}

// Singleton — import via window.api
window.api = new ApiClient();
