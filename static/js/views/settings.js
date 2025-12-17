import { API } from '../api.js';

export async function openSettings() {
    const modalContainer = document.getElementById('modal-container');

    // Fetch current Data
    let exts = [];
    try {
        exts = await API.getIgnoredExtensions();
    } catch (err) {
        alert('加载配置失败: ' + err.message);
        return;
    }

    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <span>系统设置</span>
                    <button class="btn btn-secondary btn-sm" id="close-settings">X</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 1rem;">
                        <label class="font-bold">忽略的扩展名 (每行一个)</label>
                        <div class="text-sm text-muted mb-2">这些文件在批量重命名时默认会被跳过。</div>
                        <textarea id="ignored-exts" class="form-control" rows="10" style="font-family: monospace;">${exts.join('\n')}</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                   <button class="btn btn-primary" id="save-settings">保存</button>
                </div>
            </div>
        </div>
    `;

    // Bindings
    document.getElementById('close-settings').addEventListener('click', () => modalContainer.innerHTML = '');

    document.getElementById('save-settings').addEventListener('click', async () => {
        const val = document.getElementById('ignored-exts').value;
        const list = val.split('\n').map(s => s.trim()).filter(s => s);

        try {
            await API.setIgnoredExtensions(list);
            alert('设置已保存');
            modalContainer.innerHTML = '';
        } catch (err) {
            alert('保存失败: ' + err.message);
        }
    });
}
