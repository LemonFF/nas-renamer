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
const themeIcon = document.getElementById('theme-icon');
const logoutBtn = document.getElementById('logout-btn');

// Desktop Nav
const navFiles = document.getElementById('nav-files');
const navHistory = document.getElementById('nav-history');
const navSettings = document.getElementById('nav-settings');

// Mobile Nav
const navFilesMobile = document.getElementById('nav-files-mobile');
const navHistoryMobile = document.getElementById('nav-history-mobile');
const navSettingsMobile = document.getElementById('nav-settings-mobile');

// Navigation Logic
let currentView = 'files';

async function updateView() {
    appView.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 opacity-50">
            <span class="loading loading-spinner loading-lg text-primary mb-4"></span>
            <p class="text-sm font-medium">正在加载...</p>
        </div>
    `;

    // Update Desktop Active States
    const activeClasses = ['btn-active', 'btn-primary', 'text-white'];
    [navFiles, navHistory].forEach(el => {
        el.classList.remove(...activeClasses);
        el.classList.add('btn-ghost');
    });

    if (currentView === 'files') {
        navFiles.classList.add(...activeClasses);
        navFiles.classList.remove('btn-ghost');
    } else if (currentView === 'history') {
        navHistory.classList.add(...activeClasses);
        navHistory.classList.remove('btn-ghost');
    }

    try {
        if (currentView === 'files') {
            await renderFileExplorer(appView);
        } else if (currentView === 'history') {
            await renderHistory(appView);
        }
    } catch (err) {
        console.error(err);
        appView.innerHTML = `
            <div class="alert alert-error shadow-lg max-w-2xl mx-auto my-8">
                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>加载失败: ${err.message}</span>
            </div>
        `;
    }
}

// Event Listeners Utility
const setupNav = (el, view) => {
    if (!el) return;
    el.addEventListener('click', (e) => {
        e.preventDefault();
        currentView = view;
        updateView();
        // Close dropdown on mobile if exists
        const dropdown = el.closest('.dropdown-content');
        if (dropdown) {
            dropdown.parentElement.blur();
        }
    });
};

setupNav(navFiles, 'files');
setupNav(navHistory, 'history');
setupNav(navFilesMobile, 'files');
setupNav(navHistoryMobile, 'history');

if (navSettings) navSettings.addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
if (navSettingsMobile) navSettingsMobile.addEventListener('click', (e) => { 
    e.preventDefault(); 
    openSettings(); 
    navSettingsMobile.closest('.dropdown-content').parentElement.blur();
});

themeToggle.addEventListener('click', () => {
    const current = Store.get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    Store.setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
});

// Init Theme UI
const currentTheme = Store.get().theme;
document.documentElement.setAttribute('data-theme', currentTheme);
themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/login.html';
});

// Initial Load
updateView();
