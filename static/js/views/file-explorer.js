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
        <div class="glass-card overflow-hidden animate-fade-in" style="animation-delay: 0.1s" id="file-list-container">
            <div class="overflow-x-auto p-2 sm:p-4">
                <table class="table table-modern w-full border-separate">
                    <thead>
                        <tr class="text-base-content/60 border-none">
                            <th class="w-12 bg-transparent"></th>
                            <th class="font-bold bg-transparent">文件名</th>
                            <th class="text-right font-bold w-32 bg-transparent">大小</th>
                        </tr>
                    </thead>
                    <tbody id="file-list">
                        <tr><td colspan="3"><div class="flex justify-center py-20"><span class="loading loading-spinner loading-lg text-primary/40"></span></div></td></tr>
                    </tbody>
                </table>
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
        let html = `<li><a href="#" data-path=""><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>根目录</a></li>`;
        let acc = '';

        parts.forEach((p, i) => {
            acc += '/' + p;
            if (i === parts.length - 1) {
                html += `<li class="font-bold text-primary max-w-[200px] truncate">${p}</li>`;
            } else {
                html += `<li><a href="#" data-path="${acc}">${p}</a></li>`;
            }
        });

        breadcrumbContainer.innerHTML = `<ul class="flex items-center">${html}</ul>`;

        breadcrumbContainer.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                loadDir(a.dataset.path);
            });
        });
    }

    function renderList(items) {
        if (!items || items.length === 0) {
            fileListContainer.innerHTML = '<tr><td colspan="3" class="text-center py-10 text-base-content/50">空目录</td></tr>';
            btnRename.classList.add('hidden');
            return;
        }

        btnRename.classList.remove('hidden');

        fileListContainer.innerHTML = items.map(item => {
            const icon = item.is_dir ?
                '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>' :
                '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>';
            const size = item.is_dir ? '-' : formatSize(item.size);

            return `
                <tr class="hover cursor-pointer file-item active:bg-base-300 transition-colors" data-path="${item.path}" data-isdir="${item.is_dir}">
                    <td>${icon}</td>
                    <td class="font-medium">${item.name}</td>
                    <td class="text-right text-sm opacity-70 font-mono">${size}</td>
                </tr>
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
