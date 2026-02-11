import { API } from '../api.js';
import { Store } from '../state.js';
import { openRenamer } from './renamer.js';

export async function renderFileExplorer(container) {
    container.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 animate-fade-in">
            <div id="breadcrumbs" class="breadcrumbs-pill text-sm overflow-x-auto w-full sm:w-auto"></div>
            <button id="btn-batch-rename" class="btn btn-primary btn-md rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hidden w-full sm:w-auto">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                <span class="font-bold">智能批量重命名</span>
            </button>
        </div>
        <div class="glass-card overflow-hidden animate-fade-in" style="animation-delay: 0.1s">
            <div class="p-2 sm:p-4">
                <div id="file-list" class="flex flex-col gap-2 md:grid md:grid-cols-2 lg:grid-cols-3">
                    <div class="flex justify-center py-20 col-span-full"><span class="loading loading-spinner loading-lg text-primary/40"></span></div>
                </div>
            </div>
        </div>
    `;

    const breadcrumbContainer = container.querySelector('#breadcrumbs');
    const fileListContainer = container.querySelector('#file-list');
    const btnRename = container.querySelector('#btn-batch-rename');

    const state = Store.get();
    let currentPath = state.currentPath || '';

    async function loadDir(path) {
        try {
            fileListContainer.innerHTML = '<tr><td colspan="3"><div class="flex justify-center py-10"><span class="loading loading-spinner loading-md text-primary"></span></div></td></tr>';
            const data = await API.fetchFiles(path);

            Store.setState({
                currentPath: data.current_path,
                parentPath: data.parent_path,
                files: data.items
            });
            currentPath = data.current_path;

            renderBreadcrumbs(data.current_path);
            renderList(data.items);
        } catch (err) {
            fileListContainer.innerHTML = `<tr><td colspan="3"><div class="alert alert-error m-4"><span>${err.message}</span></div></td></tr>`;
        }
    }

    function renderBreadcrumbs(path) {
        const parts = path.split('/').filter(p => p);
        const isMobile = window.innerWidth < 768;
        let html = `<li><a href="#" data-path=""><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>根目录</a></li>`;
        let acc = '';

        // Mobile: collapse middle paths if depth > 2
        if (isMobile && parts.length > 2) {
            // Show only root, ..., and current
            html += `<li class="opacity-50">...</li>`;
            const currentFolder = parts[parts.length - 1];
            html += `<li class="font-bold text-primary break-words max-w-[150px]">${currentFolder}</li>`;
        } else {
            // Desktop or short path: show all
            parts.forEach((p, i) => {
                acc += '/' + p;
                if (i === parts.length - 1) {
                    html += `<li class="font-bold text-primary break-words max-w-[200px]">${p}</li>`;
                } else {
                    html += `<li><a href="#" data-path="${acc}">${p}</a></li>`;
                }
            });
        }

        breadcrumbContainer.innerHTML = `<ul class="flex items-center flex-wrap gap-1">${html}</ul>`;

        breadcrumbContainer.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                loadDir(a.dataset.path);
            });
        });
    }

    function renderList(items) {
        if (!items || items.length === 0) {
            fileListContainer.innerHTML = '<div class="text-center py-10 text-base-content/50 col-span-full">空目录</div>';
            btnRename.classList.add('hidden');
            return;
        }

        btnRename.classList.remove('hidden');

        fileListContainer.innerHTML = items.map(item => {
            const icon = item.is_dir ?
                '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>' :
                '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>';
            const size = item.is_dir ? '-' : formatSize(item.size);

            return `
                <div class="card card-compact bg-base-100 shadow-sm hover:shadow-md hover:bg-base-200/50 cursor-pointer file-item active:scale-[0.98] transition-all min-h-[56px]" data-path="${item.path}" data-isdir="${item.is_dir}">
                    <div class="card-body p-3">
                        <div class="flex items-center gap-3">
                            <div class="flex-shrink-0">${icon}</div>
                            <div class="flex-1 min-w-0">
                                <p class="font-medium text-sm break-words overflow-wrap-anywhere">${item.name}</p>
                            </div>
                            <span class="text-xs opacity-60 flex-shrink-0">${size}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        fileListContainer.querySelectorAll('.file-item').forEach(el => {
            el.addEventListener('click', (e) => {
                const isDir = el.dataset.isdir === 'true';
                const path = el.dataset.path;
                if (isDir) {
                    loadDir(path);
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

    btnRename.addEventListener('click', () => {
        openRenamer(currentPath, () => {
            loadDir(currentPath);
        });
    });

    await loadDir(currentPath);
}
