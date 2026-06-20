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

    async login(username, password) {
        const result = await window.api.login(username, password);
        this._accessToken = result.access_token;
        this._username = username;
        window.api.setToken(this._accessToken);
        this._scheduleRefresh();
        this._setAgentBadge(username);
        this._showBoardScreen();
        return result;
    }

    async logout() {
        try {
            await window.api.logout();
        } catch (err) {
            console.error('[AuthManager] Logout request failed:', err);
        } finally {
            this._accessToken = null;
            this._username = null;
            window.api.clearToken();
            if (this._refreshTimer) clearTimeout(this._refreshTimer);
            this._setAgentBadge(null);
            this._showAuthScreen();
        }
    }

    _scheduleRefresh() {
        if (this._refreshTimer) clearTimeout(this._refreshTimer);
        // Refresh the access token 60s before it expires (30 min - 60s = 29 min)
        const msUntilRefresh = (30 * 60 - 60) * 1000;
        this._refreshTimer = setTimeout(() => this._refreshToken(), msUntilRefresh);
    }

    async _refreshToken() {
        try {
            const result = await window.api.refresh();
            this._accessToken = result.access_token;
            window.api.setToken(this._accessToken);
            this._scheduleRefresh();
            return true;
        } catch (err) {
            console.warn('[AuthManager] Token refresh failed, user session expired:', err);
            this.logout();
            return false;
        }
    }

    async checkSession() {
        console.log('[AuthManager] Checking for active session...');
        const success = await this._refreshToken();
        if (success) {
            console.log('[AuthManager] Active session restored.');
            this._showBoardScreen();
            // Trigger board listing / loading once UI is fully ready
            if (window.ui && typeof window.ui.init === 'function') {
                window.ui.init();
            }
        } else {
            this._showAuthScreen();
        }
    }

    _showAuthScreen() {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('board-screen').style.display = 'none';
    }

    _showBoardScreen() {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('board-screen').style.display = 'block';
    }

    _setAgentBadge(username) {
        const el = document.getElementById('agent-username');
        if (el) el.textContent = username ? username.toUpperCase() : 'AGENT';
    }
}

window.auth = new AuthManager();

// Automatically check session on page load
window.addEventListener('DOMContentLoaded', () => {
    window.auth.checkSession();
});

