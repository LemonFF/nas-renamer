import { Store } from './state.js';
import { API } from './api.js';
import { renderFileExplorer } from './views/file-explorer.js';
import { renderHistory } from './views/history.js';
import { openSettings } from './views/settings.js';

// Setup Token Check
if (!localStorage.getItem('auth_token')) {
    window.location.href = '/login.html';
}

// References
const appView = document.getElementById('app-view');
const themeToggle = document.getElementById('theme-toggle');
const logoutBtn = document.getElementById('logout-btn');
const navFiles = document.getElementById('nav-files');
const navHistory = document.getElementById('nav-history');
const navSettings = document.getElementById('nav-settings');

// Navigation Logic
let currentView = 'files';

async function updateView() {
    appView.innerHTML = '<div class="text-center p-4">加载中...</div>';

    // Reset Active States
    navFiles.style.fontWeight = currentView === 'files' ? 'bold' : 'normal';
    navHistory.style.fontWeight = currentView === 'history' ? 'bold' : 'normal';

    try {
        if (currentView === 'files') {
            await renderFileExplorer(appView);
        } else if (currentView === 'history') {
            await renderHistory(appView);
        }
    } catch (err) {
        console.error(err);
        appView.innerHTML = `<div class="text-danger p-4">Error loading view: ${err.message}</div>`;
    }
}

// Event Listeners
navFiles.addEventListener('click', (e) => { e.preventDefault(); currentView = 'files'; updateView(); });
navHistory.addEventListener('click', (e) => { e.preventDefault(); currentView = 'history'; updateView(); });
navSettings.addEventListener('click', (e) => { e.preventDefault(); openSettings(); });

themeToggle.addEventListener('click', () => {
    const current = Store.get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    Store.setTheme(next);
    themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
});

// Init Theme Text
themeToggle.textContent = Store.get().theme === 'dark' ? '☀️' : '🌙';

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/login.html';
});

// Initial Load
updateView();
