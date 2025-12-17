const API_BASE = '/api';

function getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function handleResponse(response) {
    if (response.status === 401) {
        window.location.href = '/login.html';
        throw new Error('Unauthorized');
    }
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

export const API = {
    async login(password) {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Login failed');
        }
        return res.json();
    },

    async fetchFiles(dirPath = '') {
        const params = new URLSearchParams(dirPath ? { dir: dirPath } : {});
        const res = await fetch(`${API_BASE}/files?${params}`, { headers: getAuthHeaders() });
        return handleResponse(res);
    },

    async previewRename(data) {
        const res = await fetch(`${API_BASE}/rename/preview`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    async executeRename(data) {
        const res = await fetch(`${API_BASE}/rename/execute`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    async getHistory() {
        const res = await fetch(`${API_BASE}/history`, { headers: getAuthHeaders() });
        return handleResponse(res);
    },

    async undoHistory(batchId) {
        const res = await fetch(`${API_BASE}/history/undo`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ batch_id: batchId })
        });
        return handleResponse(res);
    },

    // v1.1 Settings
    async getIgnoredExtensions() {
        const res = await fetch(`${API_BASE}/config/ignored-extensions`, { headers: getAuthHeaders() });
        return handleResponse(res);
    },

    async setIgnoredExtensions(exts) {
        const res = await fetch(`${API_BASE}/config/ignored-extensions`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(exts)
        });
        return handleResponse(res);
    },

    // v1.1 Smart Scan
    async scanFrequentStrings(path) {
        const params = new URLSearchParams({ dir: path });
        const res = await fetch(`${API_BASE}/scan/frequent-strings?${params}`, { headers: getAuthHeaders() });
        return handleResponse(res);
    }
};
