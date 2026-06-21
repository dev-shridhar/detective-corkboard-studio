class AuthManager {
    constructor() {
        this._accessToken = null;
        this._username = null;
    }

    async login(username, password) {
        const result = await window.api.login(username, password);
        this._accessToken = result.access_token;
        this._username = username;
        window.api.setToken(this._accessToken);
        this._showBoardScreen();
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
        if (window.ui && typeof window.ui.init === 'function') {
            window.ui.init().catch(err => {
                console.error('[AuthManager] ui.init() failed:', err);
            });
        }
    }
}

window.auth = new AuthManager();
document.getElementById('auth-screen').style.display = 'flex';
document.getElementById('board-screen').style.display = 'none';
