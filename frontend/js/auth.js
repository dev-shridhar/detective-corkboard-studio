/**
 * auth.js — Client-side authentication lifecycle manager.
 * Handles login/register form submission, token storage,
 * and auto-refresh scheduling.
 *
 * Phase 2 will implement full auth flow.
 * This file provides the module skeleton and token management primitives.
 */

class AuthManager {
    constructor() {
        // Access token stored in memory only (never localStorage — XSS safe)
        this._accessToken = null;
        this._refreshTimer = null;
    }

    isAuthenticated() {
        return !!this._accessToken;
    }

    async login(username, password) {
        const result = await window.api.login(username, password);
        this._accessToken = result.access_token;
        window.api.setToken(this._accessToken);
        this._scheduleRefresh();
        return result;
    }

    logout() {
        this._accessToken = null;
        window.api.clearToken();
        if (this._refreshTimer) clearTimeout(this._refreshTimer);
        this._showAuthScreen();
    }

    _scheduleRefresh() {
        // Refresh the access token 60s before it expires (30 min - 60s = 29 min)
        const msUntilRefresh = (30 * 60 - 60) * 1000;
        this._refreshTimer = setTimeout(() => this._refreshToken(), msUntilRefresh);
    }

    async _refreshToken() {
        // Phase 2: call POST /auth/refresh with the HttpOnly cookie
        console.log('[AuthManager] Token refresh — to be implemented in Phase 2');
    }

    _showAuthScreen() {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('board-screen').style.display = 'none';
    }

    _showBoardScreen() {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('board-screen').style.display = 'block';
    }
}

window.auth = new AuthManager();
