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
        <div class="modal modal-open backdrop-blur-sm transition-all duration-500">
            <div class="modal-box max-w-2xl bg-base-100/90 backdrop-blur-xl border border-white/20 shadow-2xl p-0 overflow-hidden flex flex-col rounded-[2rem] animate-fade-in">
                <div class="navbar bg-transparent px-8 py-6 border-b border-base-content/5">
                    <div class="flex-1">
                        <div class="flex items-center gap-4">
                            <div class="p-3 bg-primary/10 rounded-2xl text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <h3 class="font-black text-2xl tracking-tight">系统核心设置</h3>
                        </div>
                    </div>
                    <div class="flex-none">
                        <button class="btn btn-ghost btn-circle hover:bg-base-300/50" id="close-settings">✕</button>
                    </div>
                </div>
                
                <div class="p-8 space-y-8">
                    <div class="form-control w-full">
                        <label class="label mb-2">
                            <span class="label-text font-black text-base-content/60 uppercase tracking-widest text-xs">忽略的扩展名策略</span>
                        </label>
                        <div class="alert alert-info bg-primary/5 border-primary/10 text-primary py-3 mb-6 flex items-start gap-4 rounded-2xl shadow-none">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-5 h-5 mt-0.5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span class="text-xs font-medium leading-relaxed">以下扩展名的文件在批量扫描和智能重命名过程中将被完全忽略。请每行输入一个（例如 .txt）。</span>
                        </div>
                        <textarea id="ignored-exts" class="textarea textarea-bordered h-48 font-mono bg-base-200/50 border-base-content/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-sm rounded-2xl p-4" placeholder="例如: .txt">${exts.join('\n')}</textarea>
                    </div>

                    <div class="flex justify-end pt-4">
                        <button class="btn btn-primary rounded-xl px-12 shadow-lg shadow-primary/20 hover:scale-105 transition-all text-base font-bold" id="save-settings">保存系统配置</button>
                    </div>
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
