import { API } from '../api.js';

export async function renderHistory(container) {
    container.innerHTML = `
        <h2 class="m-4">操作历史</h2>
        <div id="history-list" class="m-4">
            <div class="p-4 text-center">加载中...</div>
        </div>
    `;

    const listContainer = container.querySelector('#history-list');

    try {
        const history = await API.getHistory(); // Returns array
        renderList(history);
    } catch (err) {
        listContainer.innerHTML = `<div class="text-danger">Failed to load history: ${err.message}</div>`;
    }

    function renderList(items) {
        if (!items || items.length === 0) {
            listContainer.innerHTML = '<div class="p-4 text-center text-muted">暂无历史记录</div>';
            return;
        }

        // Sort by timestamp desc
        items.sort((a, b) => b.timestamp - a.timestamp);

        listContainer.innerHTML = items.map(item => {
            const date = new Date(item.timestamp * 1000).toLocaleString();
            return `
                <div class="p-4 mb-4 bg-white dark:bg-gray-800 rounded shadow border border-gray-200 dark:border-gray-700">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-bold text-lg mb-1">批次 ID: ${item.id.slice(0, 8)}...</div>
                            <div class="text-sm text-muted">时间: ${date}</div>
                            <div class="text-sm text-muted">路径: ${item.base_path}</div>
                            <div class="text-sm text-muted">模式: ${item.mode}</div>
                        </div>
                        <button class="btn btn-secondary btn-sm btn-undo" data-id="${item.id}">撤销 / 还原</button>
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
