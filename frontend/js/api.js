/**
 * api.js — HTTP client for communicating with the FastAPI backend.
 * All fetch calls go through this module. Handles Authorization headers,
 * JSON serialization, and error normalization.
 *
 * Phase 2+ will implement full request logic.
 */

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000/api/v1'
    : 'https://api.detectivecorkboard.com/api/v1';

class ApiClient {
    constructor() {
        this._accessToken = null;
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
            throw new Error(err.detail || 'Request failed');
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
            throw new Error(err.detail || 'Login failed');
        }
        return res.json();
    }
    refresh() { return this._request('POST', '/auth/refresh'); }
    logout() { return this._request('POST', '/auth/logout'); }
    getMe() { return this._request('GET', '/auth/me'); }


    // --- Boards ---
    listBoards() { return this._request('GET', '/boards'); }
    createBoard(data) { return this._request('POST', '/boards', data); }
    getBoard(id) { return this._request('GET', `/boards/${id}`); }
    updateBoard(id, data) { return this._request('PATCH', `/boards/${id}`, data); }
    deleteBoard(id) { return this._request('DELETE', `/boards/${id}`); }

    // --- Nodes ---
    listNodes(boardId) { return this._request('GET', `/boards/${boardId}/nodes`); }
    createNode(boardId, data) { return this._request('POST', `/boards/${boardId}/nodes`, data); }
    updateNode(boardId, nodeId, data) { return this._request('PATCH', `/boards/${boardId}/nodes/${nodeId}`, data); }
    deleteNode(boardId, nodeId) { return this._request('DELETE', `/boards/${boardId}/nodes/${nodeId}`); }

    // --- Edges ---
    listEdges(boardId) { return this._request('GET', `/boards/${boardId}/edges`); }
    createEdge(boardId, data) { return this._request('POST', `/boards/${boardId}/edges`, data); }
    updateEdge(boardId, edgeId, data) { return this._request('PATCH', `/boards/${boardId}/edges/${edgeId}`, data); }
    deleteEdge(boardId, edgeId) { return this._request('DELETE', `/boards/${boardId}/edges/${edgeId}`); }
}

// Singleton — import via window.api
window.api = new ApiClient();
