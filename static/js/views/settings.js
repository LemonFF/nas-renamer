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
        <div class="modal modal-open">
            <div class="modal-box max-w-2xl bg-base-100 border border-base-300 shadow-2xl">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-2xl flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        系统设置
                    </h3>
                    <button class="btn btn-ghost btn-circle btn-sm" id="close-settings">✕</button>
                </div>
                
                <div class="form-control w-full">
                    <label class="label">
                        <span class="label-text font-bold text-base">忽略的扩展名 (每行一个)</span>
                    </label>
                    <div class="alert alert-info py-2 mb-4 text-xs shadow-sm bg-base-200 border-base-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>这些文件在批量重命名时默认会被跳过。</span>
                    </div>
                    <textarea id="ignored-exts" class="textarea textarea-bordered h-64 font-mono focus:textarea-primary transition-all text-sm" placeholder="例如: .txt">${exts.join('\n')}</textarea>
                </div>

                <div class="modal-action mt-8">
                    <button class="btn btn-primary px-8 shadow-lg" id="save-settings">保存配置</button>
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
