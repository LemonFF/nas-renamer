import { API } from '../api.js';
import { Store } from '../state.js';
import { openRenamer } from './renamer.js';

export async function renderFileExplorer(container) {
    container.innerHTML = `
        <div class="flex justify-between items-center m-4">
            <div id="breadcrumbs" class="breadcrumb flex-1"></div>
            <button id="btn-batch-rename" class="btn btn-primary hidden">批量重命名</button>
        </div>
        <div class="file-list" id="file-list">
            <div class="p-4 text-center">加载中...</div>
        </div>
    `;

    const breadcrumbContainer = container.querySelector('#breadcrumbs');
    const fileListContainer = container.querySelector('#file-list');
    const btnRename = container.querySelector('#btn-batch-rename');

    const state = Store.get();
    let currentPath = state.currentPath || '';

    async function loadDir(path) {
        try {
            fileListContainer.innerHTML = '<div class="p-4 text-center">加载中...</div>';
            const data = await API.fetchFiles(path);

            // Update State
            Store.setState({
                currentPath: data.current_path,
                parentPath: data.parent_path,
                files: data.items
            });
            currentPath = data.current_path;

            renderBreadcrumbs(data.current_path);
            renderList(data.items);
        } catch (err) {
            fileListContainer.innerHTML = `<div class="p-4 text-danger">${err.message}</div>`;
        }
    }

    function renderBreadcrumbs(path) {
        // Simple splitter (careful with different OS separators, assuming API returns standard slashes for web)
        const parts = path.split('/').filter(p => p);
        let html = `<li class="breadcrumb-item"><a href="#" data-path="">根目录</a></li>`;
        let acc = '';

        parts.forEach((p, i) => {
            acc += '/' + p;
            if (i === parts.length - 1) {
                html += `<li class="breadcrumb-item active">${p}</li>`;
            } else {
                html += `<li class="breadcrumb-item"><a href="#" data-path="${acc}">${p}</a></li>`;
            }
        });

        breadcrumbContainer.innerHTML = `<ul class="breadcrumb" style="margin:0; padding:0; background:none;">${html}</ul>`;

        // Bind Clicks
        breadcrumbContainer.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                loadDir(a.dataset.path);
            });
        });
    }

    function renderList(items) {
        if (!items || items.length === 0) {
            fileListContainer.innerHTML = '<div class="p-4 text-center text-muted">空目录</div>';
            btnRename.classList.add('hidden');
            return;
        }

        // Show rename button if we have items
        btnRename.classList.remove('hidden');

        fileListContainer.innerHTML = items.map(item => {
            const icon = item.is_dir ? '📁' : '📄';
            const size = item.is_dir ? '-' : formatSize(item.size);
            // We can add checkboxes in future, for now "Batch Rename" operates on whole folder or ignored subfolders
            return `
                <div class="file-item" data-path="${item.path}" data-isdir="${item.is_dir}">
                    <div class="file-icon">${icon}</div>
                    <div class="file-info">
                        <div style="font-weight: 500;">${item.name}</div>
                    </div>
                    <div class="file-meta">${size}</div>
                </div>
            `;
        }).join('');

        // Bind Clicks
        fileListContainer.querySelectorAll('.file-item').forEach(el => {
            el.addEventListener('click', (e) => {
                const isDir = el.dataset.isdir === 'true';
                const path = el.dataset.path;
                if (isDir) {
                    loadDir(path);
                } else {
                    // Start selection logic or preview? For now regular click does nothing or maybe selects.
                }
            });
        });
    }

    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Rename Handler
    btnRename.addEventListener('click', () => {
        // Open Modal
        openRenamer(currentPath, () => {
            // Refresh after rename
            loadDir(currentPath);
        });
    });

    // Initial Load
    await loadDir(currentPath);
}
