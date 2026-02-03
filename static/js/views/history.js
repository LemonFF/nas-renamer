import { API } from '../api.js';

export async function renderHistory(container) {
    container.innerHTML = `
        <div class="flex items-center gap-3 mb-8 sm:mt-2 animate-fade-in">
            <div class="p-3 bg-primary/10 rounded-2xl text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 class="text-2xl font-black tracking-tight">操作历史</h2>
        </div>
        <div id="history-list" class="space-y-4 animate-fade-in" style="animation-delay: 0.1s">
            <div class="flex justify-center py-20"><span class="loading loading-spinner loading-lg text-primary/40"></span></div>
        </div>
    `;

    const listContainer = container.querySelector('#history-list');

    try {
        const history = await API.getHistory(); // Returns array
        renderList(history);
    } catch (err) {
        listContainer.innerHTML = `
            <div class="alert alert-error shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>加载历史失败: ${err.message}</span>
            </div>
        `;
    }

    function renderList(items) {
        if (!items || items.length === 0) {
            listContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 bg-base-100 rounded-xl border border-dashed border-base-300 opacity-60">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    <p class="font-medium text-lg">暂无历史记录</p>
                </div>
            `;
            return;
        }

        // Sort by timestamp desc
        items.sort((a, b) => b.timestamp - a.timestamp);

        listContainer.innerHTML = items.map(item => {
            const date = new Date(item.timestamp * 1000).toLocaleString();
            return `
                <div class="glass-card hover:border-primary/50 transition-all duration-300">
                    <div class="card-body p-5 sm:p-6">
                        <div class="flex flex-col sm:flex-row justify-between items-start gap-6">
                            <div class="space-y-3 flex-1 min-w-0">
                                <div class="flex items-center flex-wrap gap-2">
                                    <span class="badge badge-primary bg-primary/10 border-none text-primary font-mono text-xs px-3">ID: ${item.id.slice(0, 8)}</span>
                                    <span class="badge badge-ghost bg-base-300/50 border-none text-[10px] uppercase font-bold tracking-wider">${item.mode}模式</span>
                                </div>
                                <div class="space-y-1.5">
                                    <div class="text-sm font-medium flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 opacity-40 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span class="opacity-80">${date}</span>
                                    </div>
                                    <div class="text-sm font-medium flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 opacity-40 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span class="opacity-60 truncate block">${item.base_path}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="w-full sm:w-auto self-end sm:self-center">
                                <button class="btn btn-outline btn-warning border-warning/30 hover:bg-warning/10 hover:border-warning btn-sm px-6 rounded-xl btn-undo group" data-id="${item.id}">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 transition-transform group-hover:-rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                    撤销还原
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Bind Undo
        listContainer.querySelectorAll('.btn-undo').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('确定要撤销此操作吗？这将把文件重命名回原来的名称。')) return;

                const id = btn.dataset.id;
                btn.disabled = true;
                btn.textContent = '还原中...';

                try {
                    const res = await API.undoHistory(id);
                    // Use restored_count if available, fallback to success logic or just 'ok'
                    const count = res.restored_count !== undefined ? res.restored_count : 'all';
                    alert(`成功还原 ${count} 个文件！`);
                    // Reload
                    const h = await API.getHistory();
                    renderList(h);
                } catch (err) {
                    alert('还原失败: ' + err.message);
                    btn.disabled = false;
                    btn.textContent = '撤销 / 还原';
                }
            });
        });
    }
}
