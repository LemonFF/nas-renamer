import { API } from '../api.js';

export function openRenamer(currentPath, onSuccess) {
    const modalContainer = document.getElementById('modal-container');

    // Initial Render
    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <span>批量重命名</span>
                    <button class="btn btn-secondary btn-sm" id="close-modal">X</button>
                </div>
                <div class="modal-body" id="renamer-body">
                    <!-- Wizard Content -->
                </div>
                <div class="modal-footer flex justify-between">
                   <div id="step-indicator" class="text-muted text-sm self-center">步骤 1/2</div>
                   <div>
                       <button class="btn btn-secondary hidden" id="btn-back">上一步</button>
                       <button class="btn btn-primary" id="btn-next">预览</button>
                       <button class="btn btn-success hidden" id="btn-execute">执行</button>
                   </div>
                </div>
            </div>
        </div>
    `;

    // Elements
    const body = document.getElementById('renamer-body');
    const btnNext = document.getElementById('btn-next');
    const btnBack = document.getElementById('btn-back');
    const btnExecute = document.getElementById('btn-execute');
    const btnClose = document.getElementById('close-modal');
    const stepIndicator = document.getElementById('step-indicator');

    let currentStep = 1;
    let suggestions = [];

    // Fetch suggestions async
    API.scanFrequentStrings(currentPath).then(data => {
        suggestions = data || [];
        if (config.mode === 'basic') renderStep1(); // Refresh if already rendered
    }).catch(console.error);

    let config = {
        mode: 'quick',
        quick_rules: {
            remove_brackets: false,
            remove_url: false,
            normalize_delim: false,
            protect_extension: true
        },
        custom_rules: [
            // { type: 'replace', target: '', replacement: '' }
        ]
    };
    let previewData = null;

    // Render Step 1: Config
    function renderStep1() {
        body.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <label class="font-bold">选择模式:</label>
                <select id="mode-select" class="form-control" style="width: auto; display:inline-block;">
                    <option value="quick" ${config.mode === 'quick' ? 'selected' : ''}>快速清洗</option>
                    <option value="basic" ${config.mode === 'basic' ? 'selected' : ''}>基础 (替换)</option>
                    <!-- Advanced mode omitted for simplicity initially -->
                </select>
            </div>

            <!-- Quick Mode UI -->
            <div id="quick-ui" class="${config.mode !== 'quick' ? 'hidden' : ''}">
                <div class="flex flex-col gap-2">
                    <label><input type="checkbox" id="chk-brackets" ${config.quick_rules.remove_brackets ? 'checked' : ''}> 去除中括号 [...]</label>
                    <label><input type="checkbox" id="chk-urls" ${config.quick_rules.remove_url ? 'checked' : ''}> 去除网址 (如 .com)</label>
                    <label><input type="checkbox" id="chk-delim" ${config.quick_rules.normalize_delim ? 'checked' : ''}> 规范化分隔符 (_ 转 .)</label>
                    <label><input type="checkbox" id="chk-ext" ${config.quick_rules.protect_extension ? 'checked' : ''}> 保护扩展名</label>
                </div>
            </div>

            <!-- Basic Mode UI -->
            <div id="basic-ui" class="${config.mode !== 'basic' ? 'hidden' : ''}">
                <div class="mb-2">
                    <button class="btn btn-sm btn-secondary" id="add-rule">+ 添加规则</button>
                </div>
                <!-- Smart Suggestions -->
                <div id="smart-suggestions" class="flex flex-wrap gap-2 mb-4">
                     <!-- Chips go here -->
                </div>
                <div id="rules-list" class="flex flex-col gap-2"></div>
            </div>
        `;

        // Bindings
        const modeSelect = document.getElementById('mode-select');
        modeSelect.addEventListener('change', () => {
            config.mode = modeSelect.value;
            renderStep1(); // Re-render to toggle UIs
        });

        // Quick Bindings
        if (config.mode === 'quick') {
            ['brackets', 'urls', 'delim', 'ext'].forEach(key => {
                const el = document.getElementById(`chk-${key}`);
                if (el) {
                    el.addEventListener('change', () => {
                        // mapping ui id to config key manually
                        if (key === 'brackets') config.quick_rules.remove_brackets = el.checked;
                        if (key === 'urls') config.quick_rules.remove_url = el.checked;
                        if (key === 'delim') config.quick_rules.normalize_delim = el.checked;
                        if (key === 'ext') config.quick_rules.protect_extension = el.checked;
                    });
                }
            });
        }

        // Basic Bindings
        if (config.mode === 'basic') {
            const list = document.getElementById('rules-list');
            const addBtn = document.getElementById('add-rule');

            function renderRules() {
                list.innerHTML = config.custom_rules.map((rule, idx) => `
                    <div class="flex flex-col md-flex-row gap-2 items-start md-items-center border-b pb-2 mb-2 md-border-none md-pb-0 md-mb-0">
                        <select class="form-control w-full md-w-auto" onchange="window.updateRule(${idx}, 'type', this.value)">
                            <option value="replace" ${rule.type === 'replace' ? 'selected' : ''}>替换</option>
                            <option value="prefix" ${rule.type === 'prefix' ? 'selected' : ''}>前缀</option>
                            <option value="suffix" ${rule.type === 'suffix' ? 'selected' : ''}>后缀</option>
                        </select>
                        <input type="text" class="form-control flex-1" placeholder="目标" value="${rule.target || ''}" oninput="window.updateRule(${idx}, 'target', this.value)">
                        <input type="text" class="form-control flex-1" placeholder="替换为" value="${rule.replacement || ''}" oninput="window.updateRule(${idx}, 'replacement', this.value)">
                        <button class="btn btn-danger btn-sm w-full md-w-auto" onclick="window.removeRule(${idx})">删除</button>
                    </div>
                `).join('');
            }

            // Render Suggestions
            const suggestionsContainer = document.getElementById('smart-suggestions');
            if (suggestions.length > 0) {
                suggestionsContainer.innerHTML = '<span class="text-sm text-muted self-center mr-2">快速填入:</span>' + suggestions.map(s => `
                    <span class="chip" onclick="window.applySuggestion('${s.replace(/'/g, "\\'")}')">${s}</span>
                 `).join('');
            } else {
                suggestionsContainer.innerHTML = '<span class="text-sm text-muted">Scan found no common strings.</span>';
            }

            // Global suggestion handler
            window.applySuggestion = (str) => {
                // Find first empty rule target OR add new rule
                const emptyRuleIdx = config.custom_rules.findIndex(r => r.type === 'replace' && !r.target);
                if (emptyRuleIdx >= 0) {
                    config.custom_rules[emptyRuleIdx].target = str;
                } else {
                    config.custom_rules.push({ type: 'replace', target: str, replacement: '' });
                }
                renderRules();
            };

            // Global helpers for inline handlers (a bit dirty but simple for vanilla)
            window.updateRule = (idx, key, val) => { config.custom_rules[idx][key] = val; };
            window.removeRule = (idx) => { config.custom_rules.splice(idx, 1); renderRules(); };

            addBtn.addEventListener('click', () => {
                config.custom_rules.push({ type: 'replace', target: '', replacement: '' });
                renderRules();
            });

            renderRules();
        }
    }

    // Render Step 2: Preview
    async function renderStep2() {
        body.innerHTML = '<div class="text-center p-4">正在计算预览...</div>';

        try {
            const res = await API.previewRename({
                dir_path: currentPath,
                mode: config.mode,
                quick_rules: config.quick_rules,
                custom_rules: config.custom_rules,
                dry_run: true
            });
            previewData = res;

            let html = `
                <div class="mb-2 text-sm text-muted">发现 ${res.items.length} 个变更。</div>
                <table class="table text-sm">
                    <thead><tr><th>原文件名</th><th>新文件名</th><th>状态</th></tr></thead>
                    <tbody>
            `;

            res.items.forEach(item => {
                const isConflict = item.status === 'conflict';
                html += `
                    <tr class="${isConflict ? 'bg-red-50' : ''}">
                        <td>${item.original_name}</td>
                        <td class="${item.new_name !== item.original_name ? 'font-bold text-primary' : ''}">${item.new_name}</td>
                        <td class="${isConflict ? 'text-danger' : 'text-success'}">${item.status} ${isConflict ? `(${item.message})` : ''}</td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            body.innerHTML = html;

            // Check if any conflicts block execution
            const hasConflict = res.items.some(i => i.status === 'conflict');
            if (hasConflict) {
                btnExecute.disabled = true;
                btnExecute.title = "请先解决冲突再执行";
            } else {
                btnExecute.disabled = false;
            }

        } catch (err) {
            body.innerHTML = `<div class="text-danger">错误: ${err.message}</div>`;
        }
    }

    // Controller
    function updateFooter() {
        stepIndicator.textContent = `步骤 ${currentStep}/2`;
        if (currentStep === 1) {
            btnBack.classList.add('hidden');
            btnNext.classList.remove('hidden');
            btnExecute.classList.add('hidden');
        } else {
            btnBack.classList.remove('hidden');
            btnNext.classList.add('hidden');
            btnExecute.classList.remove('hidden');
        }
    }

    btnNext.addEventListener('click', () => {
        currentStep = 2;
        updateFooter();
        renderStep2();
    });

    btnBack.addEventListener('click', () => {
        currentStep = 1;
        updateFooter();
        renderStep1();
    });

    btnExecute.addEventListener('click', async () => {
        if (!confirm("确定要重命名这些文件吗？")) return;

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

            alert(`成功！重命名了 ${res.success_count} 个文件。`);
            close();
            if (onSuccess) onSuccess();
        } catch (err) {
            alert('执行失败: ' + err.message);
            btnExecute.textContent = "执行";
            btnExecute.disabled = false;
        }
    });

    function close() {
        modalContainer.innerHTML = ''; // Destroy
        // Cleanup globals
        delete window.updateRule;
        delete window.removeRule;
    }

    btnClose.addEventListener('click', close);

    // Init
    renderStep1();
    updateFooter();
}
