import { API } from '../api.js';

export function openRenamer(currentPath, onSuccess) {
    const modalContainer = document.getElementById('modal-container');

    // @author weifengl
    // Initial Render
    modalContainer.innerHTML = `
        <div class="modal modal-open backdrop-blur-sm transition-all duration-500">
            <div class="modal-box max-w-4xl bg-base-100/90 backdrop-blur-xl border border-white/20 shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh] rounded-[2rem] animate-fade-in">
                <div class="navbar bg-transparent px-8 py-6 border-b border-base-content/5">
                    <div class="flex-1">
                        <div class="flex items-center gap-4">
                            <div class="p-3 bg-primary/10 rounded-2xl text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </div>
                            <h3 class="font-black text-2xl tracking-tight">智能批量重命名</h3>
                        </div>
                    </div>
                    <div class="flex-none">
                        <button class="btn btn-ghost btn-circle hover:bg-base-300/50" id="close-modal">✕</button>
                    </div>
                </div>

                <div class="p-8 overflow-y-auto flex-1 custom-scrollbar" id="renamer-body">
                    <!-- Wizard Content -->
                </div>

                <div class="px-8 py-6 bg-base-200/50 border-t border-base-content/5 flex flex-col sm:flex-row justify-between items-center gap-6">
                   <div id="step-indicator" class="steps steps-horizontal w-full sm:w-auto">
                        <li class="step step-primary text-xs font-bold uppercase tracking-wider">01. 配置规则</li>
                        <li class="step text-xs font-bold uppercase tracking-wider">02. 预览执行</li>
                   </div>
                   <div class="flex gap-3 w-full sm:w-auto">
                       <button class="btn btn-ghost rounded-xl px-6 hidden" id="btn-back">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                            上一步
                       </button>
                       <button class="btn btn-primary rounded-xl px-10 shadow-lg shadow-primary/20 hover:scale-105 transition-all" id="btn-next">
                            预览更改
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                       </button>
                       <button class="btn btn-success rounded-xl px-10 shadow-lg shadow-success/20 hover:scale-105 transition-all hidden" id="btn-execute">
                            确认执行
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
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
            <div class="space-y-10 animate-fade-in">
                <div class="form-control max-w-sm">
                    <label class="label mb-1">
                        <span class="label-text font-black text-base-content/60 uppercase tracking-widest text-xs">重命名模式选择</span>
                    </label>
                    <div class="relative group">
                        <select id="mode-select" class="select select-bordered w-full rounded-2xl bg-base-200/50 border-base-content/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer">
                            <option value="quick" ${config.mode === 'quick' ? 'selected' : ''}>⚡ 智能快速清洗 (推荐)</option>
                            <option value="basic" ${config.mode === 'basic' ? 'selected' : ''}>🛠️ 自定义规则系统</option>
                        </select>
                    </div>
                </div>

                <div id="quick-ui" class="${config.mode !== 'quick' ? 'hidden' : ''} space-y-6">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="h-1 w-6 bg-primary rounded-full"></div>
                        <h4 class="font-bold text-lg">快速处理套件</h4>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label class="flex items-center p-5 bg-base-200/50 hover:bg-primary/5 border border-base-content/5 hover:border-primary/20 rounded-2xl cursor-pointer transition-all group">
                            <div class="flex-1 mr-4">
                                <span class="block font-bold mb-0.5 group-hover:text-primary transition-colors">清洗中括号</span>
                                <span class="text-xs opacity-50">移除文件名中的 [...] 内容</span>
                            </div>
                            <input type="checkbox" id="chk-brackets" class="checkbox checkbox-primary rounded-lg" ${config.quick_rules.remove_brackets ? 'checked' : ''}>
                        </label>
                        <label class="flex items-center p-5 bg-base-200/50 hover:bg-primary/5 border border-base-content/5 hover:border-primary/20 rounded-2xl cursor-pointer transition-all group">
                            <div class="flex-1 mr-4">
                                <span class="block font-bold mb-0.5 group-hover:text-primary transition-colors">移除网址广告</span>
                                <span class="text-xs opacity-50">自动检测并剔除常用域名</span>
                            </div>
                            <input type="checkbox" id="chk-urls" class="checkbox checkbox-primary rounded-lg" ${config.quick_rules.remove_url ? 'checked' : ''}>
                        </label>
                        <label class="flex items-center p-5 bg-base-200/50 hover:bg-primary/5 border border-base-content/5 hover:border-primary/20 rounded-2xl cursor-pointer transition-all group">
                            <div class="flex-1 mr-4">
                                <span class="block font-bold mb-0.5 group-hover:text-primary transition-colors">规范分隔符</span>
                                <span class="text-xs opacity-50">将下划线替换为标准点号</span>
                            </div>
                            <input type="checkbox" id="chk-delim" class="checkbox checkbox-primary rounded-lg" ${config.quick_rules.normalize_delim ? 'checked' : ''}>
                        </label>
                        <label class="flex items-center p-5 bg-base-200/50 hover:bg-primary/5 border border-base-content/5 hover:border-primary/20 rounded-2xl cursor-pointer transition-all group">
                            <div class="flex-1 mr-4">
                                <span class="block font-bold mb-0.5 group-hover:text-primary transition-colors">后缀锁定</span>
                                <span class="text-xs opacity-50">强制保护文件扩展名不被修改</span>
                            </div>
                            <input type="checkbox" id="chk-ext" class="checkbox checkbox-primary rounded-lg" ${config.quick_rules.protect_extension ? 'checked' : ''}>
                        </label>
                    </div>
                </div>

                <div id="basic-ui" class="${config.mode !== 'basic' ? 'hidden' : ''} space-y-6">
                    <div class="flex justify-between items-end mb-2">
                        <div class="flex items-center gap-2">
                            <div class="h-1 w-6 bg-primary rounded-full"></div>
                            <h4 class="font-bold text-lg">规则链管理</h4>
                        </div>
                        <button class="btn btn-outline btn-primary btn-sm rounded-xl px-4 border-primary/30 hover:bg-primary/5" id="add-rule">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                            添加规则
                        </button>
                    </div>
                    
                    <div id="smart-suggestions" class="flex flex-wrap gap-2 p-4 bg-primary/5 rounded-2xl border border-primary/10"></div>
                    
                    <div id="rules-list" class="space-y-4"></div>
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
                    list.innerHTML = config.custom_rules.map((rule, idx) => {
                        const isReplace = rule.type === 'replace';
                        return `
                            <div class="flex flex-col sm:flex-row gap-3 p-4 bg-base-200 rounded-xl border border-base-300 relative group animate-in fade-in slide-in-from-top-2 duration-300">
                                <select class="select select-bordered select-sm sm:w-32 focus:select-primary" onchange="window.updateRule(${idx}, 'type', this.value)">
                                    <option value="replace" ${rule.type === 'replace' ? 'selected' : ''}>替换</option>
                                    <option value="prefix" ${rule.type === 'prefix' ? 'selected' : ''}>前缀</option>
                                    <option value="suffix" ${rule.type === 'suffix' ? 'selected' : ''}>后缀</option>
                                </select>
                                <input type="text" class="input input-bordered input-sm flex-1 focus:input-primary" placeholder="${isReplace ? '目标文本' : '添加文本'}" value="${rule.target || ''}" oninput="window.updateRule(${idx}, 'target', this.value)">
                                <div class="hidden sm:flex items-center opacity-30 ${!isReplace ? 'invisible' : ''}">➜</div>
                                <input type="text" class="input input-bordered input-sm flex-1 focus:input-primary ${!isReplace ? 'hidden' : ''}" placeholder="替换为" value="${rule.replacement || ''}" oninput="window.updateRule(${idx}, 'replacement', this.value)">
                                <button class="btn btn-error btn-sm btn-ghost btn-circle" onclick="window.removeRule(${idx})">✕</button>
                            </div>
                        `;
                    }).join('');
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

            window.updateRule = (idx, key, val) => {
                config.custom_rules[idx][key] = val;
                if (key === 'type') renderRules(); // Re-render to show/hide replacement input
            };
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

            const changedItems = res.items.filter(item => item.new_name !== item.original_name);

            if (changedItems.length === 0) {
                body.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
                        <div class="p-6 bg-base-200 rounded-full text-base-content/20 scale-150 mb-4 border border-base-content/5">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <h3 class="text-2xl font-black opacity-60">未检测到任何命名变更</h3>
                        <p class="max-w-xs mx-auto opacity-40 text-sm">当前的规则配置对该目录下的文件没有产生任何修改建议，请尝试调整规则。</p>
                        <button class="btn btn-ghost btn-sm text-primary font-bold mt-4" id="btn-back-from-empty">返回调整规则</button>
                    </div>
                `;
                document.getElementById('btn-back-from-empty').addEventListener('click', () => {
                    currentStep = 1;
                    updateView();
                });
                btnExecute.classList.add('hidden');
                return;
            }

            let itemsHtml = changedItems.map(item => {
                const isConflict = item.status === 'conflict';
                return `
                    <div class="card bg-base-100 border ${isConflict ? 'border-error bg-error/5' : 'border-success/30 bg-success/5'} shadow-sm">
                        <div class="card-body p-4 space-y-3">
                            <div class="text-xs opacity-50 uppercase tracking-wide">原始名称</div>
                            <p class="text-sm break-words line-through opacity-70">${item.original_name}</p>
                            <div class="divider my-1">↓</div>
                            <div class="text-xs opacity-50 uppercase tracking-wide">新名称</div>
                            <p class="text-sm break-words font-bold ${isConflict ? 'text-error' : 'text-primary'}">${item.new_name}</p>
                            ${isConflict ? `
                                <div class="badge badge-error gap-1 mt-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    ${item.message}
                                </div>
                            ` : '<div class="badge badge-success badge-sm mt-2">就绪</div>'}
                        </div>
                    </div>
                `;
            }).join('');

            body.innerHTML = `
                <div class="space-y-4">
                    <div class="alert ${changedItems.some(i => i.status === 'conflict') ? 'alert-warning' : 'alert-info'} shadow-sm border border-base-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>合计发现 ${res.items.length} 个任务，其中 ${changedItems.length} 个将被修改。</span>
                    </div>

                    <div class="flex flex-col gap-3 md:grid md:grid-cols-2">
                        ${itemsHtml}
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
