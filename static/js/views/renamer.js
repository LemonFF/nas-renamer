import { API } from '../api.js';

export function openRenamer(currentPath, onSuccess) {
    const modalContainer = document.getElementById('modal-container');

    // @author weifengl
    // Initial Render
    modalContainer.innerHTML = `
        <div class="modal modal-open">
            <div class="modal-box max-w-4xl bg-base-100 border border-base-300 shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <div class="navbar bg-base-200 px-6 py-4 border-b border-base-300">
                    <div class="flex-1">
                        <h3 class="font-bold text-xl flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            批量重命名
                        </h3>
                    </div>
                    <div class="flex-none">
                        <button class="btn btn-ghost btn-circle btn-sm" id="close-modal">✕</button>
                    </div>
                </div>

                <div class="p-6 overflow-y-auto flex-1" id="renamer-body">
                    <!-- Wizard Content -->
                </div>

                <div class="p-4 sm:p-6 bg-base-200 border-t border-base-300 flex flex-col sm:flex-row justify-between items-center gap-4">
                   <div id="step-indicator" class="steps steps-horizontal w-full sm:w-auto">
                        <li class="step step-primary text-xs">配置规则</li>
                        <li class="step text-xs">预览执行</li>
                   </div>
                   <div class="flex gap-2 w-full sm:w-auto">
                       <button class="btn btn-ghost hidden" id="btn-back">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                            上一步
                       </button>
                       <button class="btn btn-primary px-8 shadow-lg" id="btn-next">
                            下一步: 预览
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                       </button>
                       <button class="btn btn-success px-8 shadow-lg hidden" id="btn-execute">
                            确认执行
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                       </button>
                   </div>
                </div>
            </div>
        </div>
    `;

    const body = document.getElementById('renamer-body');
    const btnNext = document.getElementById('btn-next');
    const btnBack = document.getElementById('btn-back');
    const btnExecute = document.getElementById('btn-execute');
    const btnClose = document.getElementById('close-modal');
    const steps = modalContainer.querySelectorAll('.step');

    let currentStep = 1;
    let suggestions = [];
    let config = {
        mode: 'quick',
        quick_rules: {
            remove_brackets: false,
            remove_url: false,
            normalize_delim: false,
            protect_extension: true
        },
        custom_rules: []
    };

    API.scanFrequentStrings(currentPath).then(data => {
        suggestions = data || [];
        if (currentStep === 1) renderStep1();
    }).catch(console.error);

    function renderStep1() {
        body.innerHTML = `
            <div class="space-y-8">
                <div class="form-control max-w-xs">
                    <label class="label">
                        <span class="label-text font-bold">重命名模式</span>
                    </label>
                    <select id="mode-select" class="select select-bordered focus:select-primary">
                        <option value="quick" ${config.mode === 'quick' ? 'selected' : ''}>⚡ 快速清洗</option>
                        <option value="basic" ${config.mode === 'basic' ? 'selected' : ''}>🛠️ 基础规则 (替换/前缀/后缀)</option>
                    </select>
                </div>

                <div id="quick-ui" class="${config.mode !== 'quick' ? 'hidden' : ''} bg-base-200 p-6 rounded-xl border border-base-300">
                    <h4 class="font-bold mb-4 opacity-70">快速处理选项</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label class="label cursor-pointer justify-start gap-4 p-2 hover:bg-base-300 rounded-lg transition-colors">
                            <input type="checkbox" id="chk-brackets" class="checkbox checkbox-primary" ${config.quick_rules.remove_brackets ? 'checked' : ''}>
                            <span class="label-text font-medium">去除中括号 [...]</span>
                        </label>
                        <label class="label cursor-pointer justify-start gap-4 p-2 hover:bg-base-300 rounded-lg transition-colors">
                            <input type="checkbox" id="chk-urls" class="checkbox checkbox-primary" ${config.quick_rules.remove_url ? 'checked' : ''}>
                            <span class="label-text font-medium">去除常用网址 (如 .com)</span>
                        </label>
                        <label class="label cursor-pointer justify-start gap-4 p-2 hover:bg-base-300 rounded-lg transition-colors">
                            <input type="checkbox" id="chk-delim" class="checkbox checkbox-primary" ${config.quick_rules.normalize_delim ? 'checked' : ''}>
                            <span class="label-text font-medium">规范化分隔符 (_ 转 .)</span>
                        </label>
                        <label class="label cursor-pointer justify-start gap-4 p-2 hover:bg-base-300 rounded-lg transition-colors">
                            <input type="checkbox" id="chk-ext" class="checkbox checkbox-primary" ${config.quick_rules.protect_extension ? 'checked' : ''}>
                            <span class="label-text font-medium">保护扩展名 (不重命名后缀)</span>
                        </label>
                    </div>
                </div>

                <div id="basic-ui" class="${config.mode !== 'basic' ? 'hidden' : ''} space-y-4">
                    <div class="flex justify-between items-center">
                        <h4 class="font-bold opacity-70">自定义规则列表</h4>
                        <button class="btn btn-outline btn-primary btn-sm" id="add-rule">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                            添加规则
                        </button>
                    </div>
                    
                    <div id="smart-suggestions" class="flex flex-wrap gap-2 py-2"></div>
                    
                    <div id="rules-list" class="space-y-3"></div>
                </div>
            </div>
        `;

        const modeSelect = document.getElementById('mode-select');
        modeSelect.addEventListener('change', () => {
            config.mode = modeSelect.value;
            renderStep1();
        });

        if (config.mode === 'quick') {
            ['brackets', 'urls', 'delim', 'ext'].forEach(key => {
                const el = document.getElementById(`chk-${key}`);
                if (el) {
                    el.addEventListener('change', () => {
                        if (key === 'brackets') config.quick_rules.remove_brackets = el.checked;
                        if (key === 'urls') config.quick_rules.remove_url = el.checked;
                        if (key === 'delim') config.quick_rules.normalize_delim = el.checked;
                        if (key === 'ext') config.quick_rules.protect_extension = el.checked;
                    });
                }
            });
        }

        if (config.mode === 'basic') {
            const list = document.getElementById('rules-list');
            const addBtn = document.getElementById('add-rule');

            function renderRules() {
                if (config.custom_rules.length === 0) {
                    list.innerHTML = `
                        <div class="text-center py-8 opacity-40 border-2 border-dashed border-base-300 rounded-xl">
                            还未添加任何规则，请点击“添加规则”或下方推荐
                        </div>
                    `;
                } else {
                    list.innerHTML = config.custom_rules.map((rule, idx) => `
                        <div class="flex flex-col sm:flex-row gap-3 p-4 bg-base-200 rounded-xl border border-base-300 relative group animate-in fade-in slide-in-from-top-2 duration-300">
                            <select class="select select-bordered select-sm sm:w-32 focus:select-primary" onchange="window.updateRule(${idx}, 'type', this.value)">
                                <option value="replace" ${rule.type === 'replace' ? 'selected' : ''}>替换</option>
                                <option value="prefix" ${rule.type === 'prefix' ? 'selected' : ''}>前缀</option>
                                <option value="suffix" ${rule.type === 'suffix' ? 'selected' : ''}>后缀</option>
                            </select>
                            <input type="text" class="input input-bordered input-sm flex-1 focus:input-primary" placeholder="目标文本" value="${rule.target || ''}" oninput="window.updateRule(${idx}, 'target', this.value)">
                            <div class="hidden sm:flex items-center opacity-30">➜</div>
                            <input type="text" class="input input-bordered input-sm flex-1 focus:input-primary" placeholder="替换为" value="${rule.replacement || ''}" oninput="window.updateRule(${idx}, 'replacement', this.value)">
                            <button class="btn btn-error btn-sm btn-ghost btn-circle" onclick="window.removeRule(${idx})">✕</button>
                        </div>
                    `).join('');
                }
            }

            const suggestionsContainer = document.getElementById('smart-suggestions');
            if (suggestions.length > 0) {
                suggestionsContainer.innerHTML = '<span class="text-xs uppercase font-bold opacity-40 self-center mr-2">推荐关键字:</span>' + suggestions.map(s => `
                    <button class="btn btn-xs btn-outline btn-primary rounded-full" onclick="window.applySuggestion('${s.replace(/'/g, "\\'")}')">${s}</button>
                 `).join('');
            }

            window.applySuggestion = (str) => {
                const emptyRuleIdx = config.custom_rules.findIndex(r => r.type === 'replace' && !r.target);
                if (emptyRuleIdx >= 0) {
                    config.custom_rules[emptyRuleIdx].target = str;
                } else {
                    config.custom_rules.push({ type: 'replace', target: str, replacement: '' });
                }
                renderRules();
            };

            window.updateRule = (idx, key, val) => { config.custom_rules[idx][key] = val; };
            window.removeRule = (idx) => { config.custom_rules.splice(idx, 1); renderRules(); };

            addBtn.addEventListener('click', () => {
                config.custom_rules.push({ type: 'replace', target: '', replacement: '' });
                renderRules();
            });

            renderRules();
        }
    }

    async function renderStep2() {
        body.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 opacity-50">
                <span class="loading loading-spinner loading-lg text-primary mb-4"></span>
                <p class="font-medium">正在计算重命名结果...</p>
            </div>
        `;

        try {
            const res = await API.previewRename({
                dir_path: currentPath,
                mode: config.mode,
                quick_rules: config.quick_rules,
                custom_rules: config.custom_rules,
                dry_run: true
            });

            let itemsHtml = res.items.map(item => {
                const isConflict = item.status === 'conflict';
                const hasChange = item.new_name !== item.original_name;
                return `
                    <tr class="${isConflict ? 'bg-error/10 text-error' : ''} ${hasChange && !isConflict ? 'bg-success/5' : ''}">
                        <td class="max-w-[200px] truncate text-xs opacity-70">${item.original_name}</td>
                        <td class="max-w-[200px] truncate font-bold text-sm ${hasChange ? 'text-primary' : ''}">${item.new_name}</td>
                        <td>
                            ${isConflict ? `
                                <div class="badge badge-error gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    ${item.message}
                                </div>
                            ` : hasChange ? '<div class="badge badge-success badge-sm">就绪</div>' : '<div class="badge badge-ghost badge-sm opacity-50">无变化</div>'}
                        </td>
                    </tr>
                `;
            }).join('');

            body.innerHTML = `
                <div class="space-y-4">
                    <div class="alert ${res.items.some(i => i.status === 'conflict') ? 'alert-warning' : 'alert-info'} shadow-sm border border-base-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>合计发现 ${res.items.length} 个任务，其中 ${res.items.filter(i => i.new_name !== i.original_name).length} 个将被修改。</span>
                    </div>

                    <div class="overflow-x-auto border border-base-300 rounded-xl">
                        <table class="table table-sm table-zebra w-full">
                            <thead class="bg-base-200">
                                <tr><th>原始名称</th><th>预览结果</th><th>状态</th></tr>
                            </thead>
                            <tbody>${itemsHtml}</tbody>
                        </table>
                    </div>
                </div>
            `;

            const hasConflict = res.items.some(i => i.status === 'conflict');
            btnExecute.disabled = hasConflict;
            if (hasConflict) btnExecute.classList.add('btn-disabled');
            else btnExecute.classList.remove('btn-disabled');

        } catch (err) {
            body.innerHTML = `
                <div class="alert alert-error shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>错误: ${err.message}</span>
                </div>
            `;
        }
    }

    function updateView() {
        steps.forEach((s, idx) => {
            if (idx + 1 === currentStep) s.classList.add('step-primary');
            else if (idx + 1 < currentStep) s.classList.add('step-primary');
            else s.classList.remove('step-primary');
        });

        if (currentStep === 1) {
            btnBack.classList.add('hidden');
            btnNext.classList.remove('hidden');
            btnExecute.classList.add('hidden');
            renderStep1();
        } else {
            btnBack.classList.remove('hidden');
            btnNext.classList.add('hidden');
            btnExecute.classList.remove('hidden');
            renderStep2();
        }
    }

    btnNext.addEventListener('click', () => {
        currentStep = 2;
        updateView();
    });

    btnBack.addEventListener('click', () => {
        currentStep = 1;
        updateView();
    });

    btnExecute.addEventListener('click', async () => {
        btnExecute.textContent = "执行中...";
        btnExecute.disabled = true;

        try {
            const res = await API.executeRename({
                dir_path: currentPath,
                mode: config.mode,
                quick_rules: config.quick_rules,
                custom_rules: config.custom_rules,
                dry_run: false
            });

            // Use success alert from DaisyUI instead of browser alert for better look
            body.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div class="text-success scale-[2]">
                         <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 class="text-3xl font-bold mt-4">重命名完成！</h2>
                    <p class="text-lg opacity-60">成功处理了 ${res.success_count} 个文件。</p>
                    <button class="btn btn-primary mt-8" id="btn-done">返回文件夹</button>
                </div>
            `;
            btnBack.classList.add('hidden');
            btnExecute.classList.add('hidden');

            document.getElementById('btn-done').addEventListener('click', () => {
                close();
                if (onSuccess) onSuccess();
            });

        } catch (err) {
            alert('执行失败: ' + err.message);
            btnExecute.textContent = "确认执行";
            btnExecute.disabled = false;
        }
    });

    function close() {
        modalContainer.innerHTML = '';
        delete window.updateRule;
        delete window.removeRule;
        delete window.applySuggestion;
    }

    btnClose.addEventListener('click', close);
    updateView();
}
