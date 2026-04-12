// ==UserScript==
// @name         PTA pintia 学习助手 (个人版)
// @namespace    personal.pta.helper
// @version      1.0.0
// @description  个人版PTA学习助手，支持判断、单选、填空、函数、编程题自动答题
// @author       Personal User
// @match        *://pintia.cn/problem-sets/*/exam/*
// @match        *://*.pintia.cn/problem-sets/*/exam/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @connect      127.0.0.1
// @connect      8.140.201.232
// @icon      	 data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// ==/UserScript==

(function () {
  'use strict';

  // 确保DOM加载完成
  function waitForDOM() {
    if (document.body && document.querySelector('body')) {
      initPTAHelper();
    } else {
      setTimeout(waitForDOM, 100);
    }
  }

  function initPTAHelper() {
    // 调试信息
    console.log('[PTA Helper] 脚本已启动！');
    console.log('[PTA Helper] 当前URL:', window.location.href);
    console.log('[PTA Helper] DOM状态:', document.body ? '已加载' : '未加载');

    // --- 0. 配置管理 ---
    let isRunning = false;
    let solveCount = 0;
    let antiBlockInstalled = false;
    let antiBlockTimer = null;

    // 兼容迁移：从旧测试键 pta_test_* 自动迁移到正式键 pta_*
    const migrateValueKey = (prodKey, legacyKey) => {
      const prodVal = GM_getValue(prodKey, undefined);
      if (prodVal !== undefined) return;
      const legacyVal = GM_getValue(legacyKey, undefined);
      if (legacyVal !== undefined) {
        GM_setValue(prodKey, legacyVal);
      }
    };

    [
      ['pta_auto_next', 'pta_test_auto_next'],
      ['pta_func_lang', 'pta_test_func_lang'],
      ['pta_prog_lang', 'pta_test_prog_lang'],
      ['pta_remove_comments', 'pta_test_remove_comments'],
      ['pta_thinking_mode', 'pta_test_thinking_mode'],
      ['pta_auth_token', 'pta_test_auth_token'],
      ['pta_device_id', 'pta_test_device_id'],
      ['pta_plan', 'pta_test_plan'],
      ['pta_expires_at', 'pta_test_expires_at'],
      ['pta_remaining_days', 'pta_test_remaining_days'],
      ['pta_remaining_questions', 'pta_test_remaining_questions']
    ].forEach(([prodKey, legacyKey]) => migrateValueKey(prodKey, legacyKey));

    // PTA 题目内容干扰元素选择器 (新增对新版 CodeMirror 6 编辑器的清理)
    const TRASH_SELECTORS = [
    '.ln', '.lnBorder', '.ln-border', '.function_HJSmz', '.foldIcon_V3Ad2',
    'button', '.cm-gutters', '.cm-panels', '.cm-announced',
    '.language_E7263', '.languageName_cZYHa', '.toolbar_SkQeK',
    '.pc-button', '.select-none.bd-left-1', // 额外新增的冗余按钮和分隔符
    '.action_ZO2qN', '.cm-panel', // 新增的按钮和面板容器
    // 清除分数标签和多余的小图标
    '.pc-icon', '.select-none.bd-left-1',
    'span[class*="rounded-r-sm"]', // PTA 新版分数标签外层
    'span.select-none' // 分数文字容器
    ];

    const CONFIG = {
    get autoNext() { return GM_getValue('pta_auto_next', false); },
    set autoNext(v) { GM_setValue('pta_auto_next', v); },
    get funcLang() { return GM_getValue('pta_func_lang', 'C'); },
    set funcLang(v) { GM_setValue('pta_func_lang', v); },
    get progLang() { return GM_getValue('pta_prog_lang', 'C'); },
    set progLang(v) { GM_setValue('pta_prog_lang', v); },
    get removeComments() { return GM_getValue('pta_remove_comments', true); },
    set removeComments(v) { GM_setValue('pta_remove_comments', v); },
    get thinkingMode() { return GM_getValue('pta_thinking_mode', false); },
    set thinkingMode(v) { GM_setValue('pta_thinking_mode', v); },
    get minimized() { return GM_getValue('pta_minimized', false); },
    set minimized(v) { GM_setValue('pta_minimized', v); },
    get panelPosition() { return GM_getValue('pta_panel_position', null); },
    set panelPosition(v) { GM_setValue('pta_panel_position', v); },
    get apiUrl() { return GM_getValue('pta_api_url', 'http://localhost:3000'); },
    set apiUrl(v) { GM_setValue('pta_api_url', v || 'http://localhost:3000'); }
    };

    // 简化授权系统，仅保留基础配置
    const AUTH = {
    get apiKey() { return GM_getValue('pta_api_key', ''); },
    set apiKey(v) { GM_setValue('pta_api_key', v || ''); },
    get deviceId() {
      let id = GM_getValue('pta_device_id', '');
      if (!id) {
        id = `pta-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        GM_setValue('pta_device_id', id);
      }
      return id;
    }
    };

    // 移除套餐文本，改为个人版本

    // 语言映射表
    const LANG_MAP = {
    'C': 'C (gcc)',
    'C++': 'C++ (g++)',
    'Java': 'Java (javac)',
    'Python': 'Python (python3)'
    };

    // --- 1. 样式定义 ---
    GM_addStyle(`
        #pta-helper-window {
            position: fixed !important;
            top: 100px !important;
            right: 20px !important;
            width: 340px;
            height: 520px;
            background: #fff;
            border: 2px solid #007bff !important;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
            z-index: 2147483647 !important;
            display: flex !important;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden;
            transition: all 0.3s ease !important;
        }
        #pta-helper-window.minimized {
            width: 50px !important;
            height: 50px !important;
            border-radius: 50% !important;
            cursor: pointer !important;
        }
        #pta-helper-window.minimized #pta-helper-header {
            padding: 0 !important;
            border: none !important;
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
        }
        #pta-helper-window.minimized #pta-helper-header span,
        #pta-helper-window.minimized #pta-helper-tabs,
        #pta-helper-window.minimized #pta-tab-content,
        #pta-helper-window.minimized #pta-helper-footer {
            display: none !important;
        }
        #pta-helper-window.minimized #minimize-btn {
            display: none !important;
        }
        #pta-helper-window.minimized #expand-icon {
            display: inline-block !important;
        }
        #pta-helper-header {
            padding: 12px;
            background: #f8f9fa;
            cursor: default;
            border-bottom: 1px solid #eee;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        #pta-helper-tabs {
            display: flex;
            background: #f8f9fa;
            border-bottom: 1px solid #eee;
        }
        .pta-tab {
            flex: 1;
            padding: 10px;
            text-align: center;
            cursor: pointer;
            font-size: 13px;
            color: #666;
            transition: all 0.2s;
        }
        .pta-tab.active {
            color: #007bff;
            border-bottom: 2px solid #007bff;
            background: #fff;
            font-weight: bold;
        }
        #donate-tab, #protocol-tab {
            padding: 20px;
            text-align: center;
            font-size: 13px;
            color: #444;
            line-height: 1.6;
        }
        .protocol-text {
            text-align: left;
            font-size: 12px;
            color: #666;
            background: #f9f9f9;
            padding: 15px;
            border-radius: 8px;
            height: 350px;
            overflow-y: auto;
            line-height: 1.8;
        }
        .pay-title {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 10px;
            color: #222;
        }
        .donate-text {
            color: #666;
            margin-top: 15px;
            text-align: left;
            padding: 0 10px;
        }
        #pta-tab-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .tab-pane {
            display: none;
            flex: 1;
            flex-direction: column;
            overflow: hidden;
        }
        .tab-pane.active {
            display: flex;
        }
        #pta-helper-settings {
            padding: 15px;
            font-size: 13px;
            overflow-y: auto;
        }
        .setting-item { margin-bottom: 15px; }
        .setting-item label { display: block; margin-bottom: 6px; color: #444; font-weight: 500; }
        .setting-item input[type="text"], .setting-item select {
            width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ddd; border-radius: 6px;
            font-size: 13px;
        }
        .setting-item.checkbox-item { display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .setting-item.checkbox-item label { display: inline; margin-bottom: 0; color: #333; cursor: pointer; }
        .setting-item.checkbox-item input { width: auto; margin: 0; cursor: pointer; }

        #pta-helper-log {
            flex: 1;
            padding: 12px;
            font-size: 12px;
            overflow-y: auto;
            background: #fff;
            color: #333;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .log-item {
            border-left: 3px solid #eee;
            padding: 4px 8px;
            background: #fcfcfc;
        }
        .log-item.info { border-left-color: #007bff; background: #f0f7ff; color: #0056b3; font-weight: 500; text-align: center; border-left: none; border-radius: 4px; }
        .log-item.warn { border-left: none; background: #fff4e5; color: #b42318; font-weight: 700; text-align: left; border-radius: 6px; border: 1px solid #ffd8a8; }
        .log-q { color: #555; font-weight: 600; margin-bottom: 2px; white-space: pre-wrap; word-break: break-all; }
        .log-a { color: #28a745; white-space: pre-wrap; line-height: 1.4; }
        .log-err { color: #dc3545; }
        .log-status { color: #999; font-style: italic; font-size: 11px; }

        #pta-helper-footer {
            padding: 12px;
            border-top: 1px solid #eee;
            background: #fff;
            display: flex;
            gap: 8px;
        }
        .pta-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            flex: 1;
            transition: background 0.2s;
        }
        .pta-btn.danger { background: #dc3545; }
        .pta-btn.secondary { background: #6c757d; }
        .pta-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .pta-btn:hover:not(:disabled) { opacity: 0.9; }

    `);

    // --- 2. 创建 UI ---

    console.log('[PTA Helper] 开始创建面板...');
    console.log('[PTA Helper] document.body 状态:', document.body);

    if (!document.body) {
      console.error('[PTA Helper] document.body 不存在，无法创建面板！');
      return;
    }

    const helperWin = document.createElement('div');
    helperWin.id = 'pta-helper-window';
    helperWin.innerHTML = `
        <div id="pta-helper-header">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span id="expand-icon" style="display: none; font-size: 18px;">📊</span>
                <span style="font-size: 14px; font-weight: 600;">PTA 学习助手</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 10px; color: #999;">v2.0</span>
                <button id="minimize-btn" style="background: none; border: none; font-size: 16px; cursor: pointer; padding: 4px; line-height: 1;">➖</button>
            </div>
        </div>
        <div id="pta-helper-tabs">
            <div class="pta-tab active" data-tab="home">主页</div>
            <div class="pta-tab" data-tab="settings">设置</div>
        </div>
        <div id="pta-tab-content">
            <div id="home-tab" class="tab-pane active">
                <div id="pta-helper-log"></div>
                <div id="pta-helper-footer">
                    <button id="start-btn" class="pta-btn">开始答题</button>
                    <button id="stop-btn" class="pta-btn danger" style="display:none;">停止</button>
                    <button id="clear-btn" class="pta-btn secondary">清空日志</button>
                </div>
            </div>
            <div id="settings-tab" class="tab-pane">
                <div id="pta-helper-settings">
                    <div class="setting-item">
                        <label>API 地址:</label>
                        <input type="text" id="api-url-input" value="${CONFIG.apiUrl}" placeholder="http://localhost:3000">
                    </div>
                    <div class="setting-item">
                        <label>API Key:</label>
                        <input type="text" id="api-key-input" value="${AUTH.apiKey}" placeholder="输入你的API Key">
                    </div>
                    <div class="setting-item checkbox-item">
                        <input type="checkbox" id="auto-next-input" ${CONFIG.autoNext ? 'checked' : ''}>
                        <label for="auto-next-input">完成后自动切换下一题型</label>
                    </div>
                    <div class="setting-item checkbox-item">
                        <input type="checkbox" id="thinking-mode-input" ${CONFIG.thinkingMode ? 'checked' : ''}>
                        <label for="thinking-mode-input" style="color: #007bff; font-weight: bold;">思考模式（提高正确率，降低速度）</label>
                    </div>
                    <div class="setting-item checkbox-item">
                        <input type="checkbox" id="remove-comments-input" ${CONFIG.removeComments ? 'checked' : ''}>
                        <label for="remove-comments-input">提交前自动清除代码注释</label>
                    </div>
                    <div class="setting-item">
                        <label>函数题语言:</label>
                        <select id="func-lang-select">
                            <option value="C" ${CONFIG.funcLang === 'C' ? 'selected' : ''}>C</option>
                            <option value="C++" ${CONFIG.funcLang === 'C++' ? 'selected' : ''}>C++</option>
                            <option value="Java" ${CONFIG.funcLang === 'Java' ? 'selected' : ''}>Java</option>
                            <option value="Python" ${CONFIG.funcLang === 'Python' ? 'selected' : ''}>Python</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <label>编程题语言:</label>
                        <select id="prog-lang-select">
                            <option value="C" ${CONFIG.progLang === 'C' ? 'selected' : ''}>C</option>
                            <option value="C++" ${CONFIG.progLang === 'C++' ? 'selected' : ''}>C++</option>
                            <option value="Java" ${CONFIG.progLang === 'Java' ? 'selected' : ''}>Java</option>
                            <option value="Python" ${CONFIG.progLang === 'Python' ? 'selected' : ''}>Python</option>
                        </select>
                    </div>
                    <div style="font-size: 11px; color: #999; text-align: center; margin-top: 20px;">
                        设置将自动保存<br><br><br>
                        个人版本，仅供学习使用<br>
                        模型思考较久，若长时间(3分钟以上)无回应请刷新网页
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(helperWin);

    console.log('[PTA Helper] ✅ 面板已创建并添加到页面');
    console.log('[PTA Helper] 面板位置: 右上角固定');

    console.log('[PTA Helper] ✅ 面板已创建并添加到页面');
    console.log('[PTA Helper] 面板元素:', helperWin);
    console.log('[PTA Helper] 面板可见性:', window.getComputedStyle(helperWin).display);
    console.log('[PTA Helper] 面板位置:', {
      top: helperWin.style.top,
      left: helperWin.style.left,
      right: helperWin.style.right,
      zIndex: helperWin.style.zIndex
    });

    // 在全局作用域暴露面板，方便调试
    window.ptaHelperPanel = helperWin;
    console.log('[PTA Helper] 💡 调试：可以尝试 window.ptaHelperPanel.style.display = "block"');

    const logContainer = document.getElementById('pta-helper-log');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');



    function addLog(question) {
    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerHTML = `<div class="log-q">题: ${question}</div><div class="log-status">AI 思考中...</div>`;
    logContainer.appendChild(div);
    logContainer.scrollTop = logContainer.scrollHeight;
    return div;
    }

    function addInfoLog(message, type = 'info') {
    const div = document.createElement('div');
    div.className = `log-item ${type}`;
    div.innerText = message;
    logContainer.appendChild(div);
    logContainer.scrollTop = logContainer.scrollHeight;
    }

    function isEditableTarget(target) {
    if (!target || !(target instanceof Element)) return false;
    if (target.isContentEditable) return true;
    const tag = (target.tagName || '').toLowerCase();
    if (tag === 'textarea') return true;
    if (tag === 'input') {
      const type = (target.getAttribute('type') || 'text').toLowerCase();
      return !['button', 'submit', 'checkbox', 'radio', 'file', 'image', 'reset', 'color'].includes(type);
    }
    return Boolean(target.closest('textarea, input, [contenteditable="true"], .cm-editor, .cm-content'));
    }

    function clearInlineBlockers(scope = document) {
    try {
      const root = scope && scope.querySelectorAll ? scope : document;
      const targets = [document, window];
      if (document.body) targets.push(document.body);
      if (document.documentElement) targets.push(document.documentElement);

      root.querySelectorAll('input, textarea, [contenteditable], .cm-editor, .cm-content').forEach((el) => {
        targets.push(el);
      });

      const props = ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart', 'onkeydown', 'onbeforeinput'];
      for (const el of targets) {
        for (const prop of props) {
          try { el[prop] = null; } catch (_) { }
        }
        if (el && el.style && (el.classList?.contains('cm-editor') || el.classList?.contains('cm-content') || el.isContentEditable)) {
          try { el.style.userSelect = 'text'; } catch (_) { }
          try { el.style.webkitUserSelect = 'text'; } catch (_) { }
        }
      }
    } catch (err) {
      console.warn('清理内联拦截失败:', err);
    }
    }

    function installInputBypassPatch() {
    if (antiBlockInstalled) return;
    antiBlockInstalled = true;

    const clipboardGuard = (evt) => {
      if (!isEditableTarget(evt.target)) return;
      evt.stopImmediatePropagation();
    };

    const keydownGuard = (evt) => {
      if (!isEditableTarget(evt.target)) return;
      const key = String(evt.key || '').toLowerCase();
      const isShortcut = (evt.ctrlKey || evt.metaKey) && ['v', 'c', 'x', 'a'].includes(key);
      if (isShortcut) evt.stopImmediatePropagation();
    };

    ['copy', 'cut', 'paste', 'beforeinput', 'selectstart', 'contextmenu'].forEach((type) => {
      window.addEventListener(type, clipboardGuard, true);
    });
    window.addEventListener('keydown', keydownGuard, true);

    clearInlineBlockers(document);
    antiBlockTimer = setInterval(() => clearInlineBlockers(document), 1500);
    addInfoLog('已启用输入反拦截补丁（测试模式）。');
    }

    function getErrorMessage(error) {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    return '请求失败，请检查网络和API配置';
    }

    function updateLog(logItem, answerText, success = true) {
    const statusDiv = logItem.querySelector('.log-status');
    if (statusDiv) {
      statusDiv.className = success ? 'log-a' : 'log-err';
      statusDiv.innerText = success ? `答: ${answerText}` : `错误: ${answerText}`;
    }

    if (success) {
      solveCount++;
    }
    logContainer.scrollTop = logContainer.scrollHeight;
    }

    // --- 3. 逻辑绑定 ---
    // Tab 切换逻辑
    document.querySelectorAll('.pta-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.pta-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
    };
    });

    // 实时保存逻辑
    document.getElementById('auto-next-input').onchange = (e) => CONFIG.autoNext = e.target.checked;
    document.getElementById('thinking-mode-input').onchange = (e) => CONFIG.thinkingMode = e.target.checked;
    document.getElementById('remove-comments-input').onchange = (e) => CONFIG.removeComments = e.target.checked;
    document.getElementById('func-lang-select').onchange = (e) => CONFIG.funcLang = e.target.value;
    document.getElementById('prog-lang-select').onchange = (e) => CONFIG.progLang = e.target.value;

    // API配置保存
    document.getElementById('api-url-input').onchange = (e) => CONFIG.apiUrl = e.target.value;
    document.getElementById('api-key-input').onchange = (e) => AUTH.apiKey = e.target.value;

    document.getElementById('clear-btn').onclick = () => { logContainer.innerHTML = ''; };

    // 收起/展开功能
    const minimizeBtn = document.getElementById('minimize-btn');
    if (minimizeBtn) {
      // 恢复保存的状态
      if (CONFIG.minimized) {
        helperWin.classList.add('minimized');
        minimizeBtn.innerHTML = '📊';
      }

      minimizeBtn.onclick = (e) => {
        e.stopPropagation();
        helperWin.classList.toggle('minimized');
        const isMinimized = helperWin.classList.contains('minimized');
        CONFIG.minimized = isMinimized;
        minimizeBtn.innerHTML = isMinimized ? '📊' : '➖';

        if (!isMinimized) {
          // 展开时恢复拖拽功能
          addInfoLog('面板已展开');
        } else {
          addInfoLog('面板已收起');
        }
      };

      // 点击收起的小球展开
      helperWin.onclick = (e) => {
        if (helperWin.classList.contains('minimized')) {
          helperWin.classList.remove('minimized');
          CONFIG.minimized = false;
          minimizeBtn.innerHTML = '➖';
          addInfoLog('面板已展开');
          e.stopPropagation();
        }
      };
    }

    stopBtn.onclick = () => {
    isRunning = false;
    addInfoLog("正在停止...");
    };

    // --- 4. 拖拽逻辑 ---
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    const header = document.getElementById('pta-helper-header');
    header.onmousedown = (e) => { return; // 拖拽功能已禁用
    if (e.target.tagName === 'BUTTON') return;
    // 收起状态下禁用拖拽
    if (helperWin.classList.contains('minimized')) return;
    isDragging = true;
    offset.x = e.clientX - helperWin.offsetLeft;
    offset.y = e.clientY - helperWin.offsetTop;
    };
    document.onmousemove = (e) => {
      if (!isDragging) return;

      let newLeft = e.clientX - offset.x;
      let newTop = e.clientY - offset.y;

      // 边界检查：确保面板不会完全拖出屏幕
      const maxX = window.innerWidth - 50;
      const maxY = window.innerHeight - 50;
      const minX = -helperWin.offsetWidth + 50;
      const minY = 0;

      if (newLeft > maxX) newLeft = maxX;
      if (newLeft < minX) newLeft = minX;
      if (newTop > maxY) newTop = maxY;
      if (newTop < minY) newTop = minY;

      helperWin.style.left = newLeft + 'px';
      helperWin.style.top = newTop + 'px';
      helperWin.style.right = 'auto';
    };
    document.onmouseup = () => {
      if (isDragging) {
        isDragging = false;
        // 保存拖拽后的位置
        CONFIG.panelPosition = {
          top: helperWin.style.top,
          left: helperWin.style.left,
          right: helperWin.style.right
        };
        console.log('[PTA Helper] 💾 保存面板位置:', CONFIG.panelPosition);
      }
    };

    // --- 5. AI 调用 ---
    function getUsername() {
    const nameElem = document.querySelector('.space-y-0 .text-normal.text-base');
    return nameElem ? nameElem.innerText.trim() : 'Unknown';
    }

    async function askAI(question, type = 'TF', lang = 'C') {
    console.log('[PTA Helper] 📞 askAI函数被调用, 题目类型:', type);
    return new Promise((resolve, reject) => {
      let systemPrompt = "";
      const isThinking = CONFIG.thinkingMode;
      console.log('[PTA Helper] 🎛️ 思考模式:', isThinking);

      if (type === 'TF') {
        systemPrompt = "Please judge if the statement is correct. Reply with only 'T' for true or 'F' for false.";
      } else if (type === 'MC') {
        systemPrompt = "Please select the correct answer. Reply with only the letter (A, B, C, or D).";
      } else if (type === 'MC_MORE') {
        systemPrompt = "Please select all correct answers. Reply with only the letters concatenated (like 'AB' or 'ABC').";
      } else if (type === 'FIB' || type === 'FIB_PROG') {
        const isProg = type === 'FIB_PROG';
        if (isThinking) {
          systemPrompt = `你是一个程序设计竞赛专家。请分析${isProg ? '程序逻辑' : '题目内容'}并完成填空。题目中用 [空n] 表示填空位置。

    你必须遵守以下回复格式：
    【思考】：[简要分析题目逻辑]
    【最终答案】：
    [空1] 第一个空的答案内容 [/空1]
    [空2] 第二个空的答案内容 [/空2]
    ...依此类推，直到所有空都填满。

    注意：
    1. 请务必为每一个出现的 [空n] 提供答案。
    2. 每一个答案必须包裹在 [空n] 和 [/空n] 标签中。
    3. 只输出上述要求的两个部分，不要有任何额外的文字。`;
        } else {
          systemPrompt = `你是一个程序设计专家。请按格式提供填空答案。
    回复格式：
    【最终答案】：
    [空1] 第一个空的答案内容 [/空1]
    [空2] 第二个空的答案内容 [/空2]
    ...依此类推。`;
        }
      } else if (type === 'FUNC') {
        if (isThinking) {
          systemPrompt = `你是一个程序设计竞赛专家。请根据题目描述写出缺失的函数实现代码。使用 ${lang} 语言。

    请在编写代码时严格遵守以下要求：
    1. **深度分析题目**：仔细阅读题目描述，识别出所有的特殊条件和约束。
    2. **边界与极端情况**：特别注意处理边界条件（如最大/最小值）、重复输入、正负数切换、大规模数据带来的性能问题以及空白或非法输入。
    3. **输入输出规范**：严格按照题目要求的格式读取输入和产生输出，不要多输或少输任何字符。
    4. **通过注释思考**：请在代码内部编写详细的注释，解释你的算法思路、关键变量的含义以及如何处理特殊边界。这不仅有助于确保逻辑正确，也能展示你的思考过程。
    5. **严禁在代码外回复**：你的所有内容必须包含在代码块内，严禁在代码块外写任何文字、解释、提示或 Markdown 标记（除了包裹代码的 \`\`\`）。
    6. **纯净输出**：只输出代码块，不要有任何开场白或结束语。`;
        } else {
          systemPrompt = `你是一个程序设计专家。请直接给出 ${lang} 语言的函数实现代码，严禁任何解释或 Markdown 标记（除了包裹代码的 \`\`\`）。`;
        }
      } else if (type === 'PROG') {
        if (isThinking) {
          systemPrompt = `你是一个程序设计竞赛专家。请根据要求写出完整的程序代码。使用 ${lang} 语言。

    请在编写代码时严格遵守以下要求：
    1. **深度分析题目**：仔细阅读题目描述，识别出所有的特殊条件和约束。
    2. **边界与极端情况**：特别注意处理边界条件（如最大/最小值）、重复输入、正负数切换、大规模数据带来的性能问题以及空白或非法输入。
    3. **输入输出规范**：严格按照题目要求的格式读取输入和产生输出，不要多输或少输任何字符。
    4. **通过注释思考**：请在代码内部编写详细的注释，解释你的算法思路、关键变量的含义以及如何处理特殊边界。这不仅有助于确保逻辑正确，也能展示你的思考过程。
    5. **严禁在代码外回复**：你的所有内容必须包含在代码块内，严禁在代码块外写任何文字、解释、提示或 Markdown 标记（除了包裹代码的 \`\`\`）。
    6. **纯净输出**：只输出代码块，不要有任何开场白或结束语。`;
        } else {
          systemPrompt = `你是一个程序设计专家。请直接给出 ${lang} 语言的完整程序代码，严禁任何解释或 Markdown 标记（除了包裹代码的 \`\`\`）。`;
        }
      }

      GM_xmlhttpRequest({
        method: "POST",
        url: `${CONFIG.apiUrl}/solve`,
        headers: {
          "Content-Type": "application/json"
        },
        data: JSON.stringify({
          systemPrompt: systemPrompt,
          question: question,
          username: getUsername(),
          apiKey: AUTH.apiKey || '', // 使用你的API Key
          deviceId: AUTH.deviceId
        }),
        onload: function (response) {
          try {
            const res = JSON.parse(response.responseText);
            if (res.error) {
              reject(getErrorMessage(res));
              return;
            }
            const fullContent = res.choices[0].message.content.trim();
            const cleanedContent = fullContent.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();

            if (type === 'TF' || type === 'MC' || type === 'MC_MORE' || type === 'FIB' || type === 'FIB_PROG') {
              if (type === 'FIB' || type === 'FIB_PROG') {
                // 填空题提取逻辑深度优化
                // 1. 定位最后一段答案区域
                const sections = cleanedContent.split(/【最终答案】[：:\n\s]*/i);
                let targetContent = sections[sections.length - 1].trim();

                // 如果最后一段太短（可能 AI 只回复了“请检查”之类的话），尝试往前找
                if (targetContent.length < 5 && sections.length > 1) {
                  targetContent = sections[sections.length - 2].trim();
                }

                let answers = [];

                // 2. 顺序提取 [空n] 标记的内容
                for (let i = 1; i <= 50; i++) {
                  // 匹配 [空i] 到下一个 [空d] 或结尾
                  // 使用 gi 确保能找到该段落内最后一个 [空i]（防止 AI 在同一段内反复修改）
                  const markerRegex = new RegExp(`\\[空${i}\\]([\\s\\S]*?)(?=\\[空\\d+\\]|$)`, 'gi');
                  const matches = targetContent.match(markerRegex);

                  if (matches) {
                    // 取本段内最后一次出现的该编号空
                    const lastMatch = matches[matches.length - 1];
                    // 提取内容
                    const contentMatch = lastMatch.match(new RegExp(`\\[空${i}\\]([\\s\\S]*)`, 'i'));
                    if (contentMatch) {
                      let val = contentMatch[1].trim();
                      // 清洗：去除闭合标签、去除开头的冒号/空格、去除末尾的干扰
                      val = val.replace(/\[\/空\d+\]/gi, '') // 去除 [/空n]
                        .replace(/^[:：\s|]+/, '')      // 去除开头的干扰符
                        .trim();
                      answers.push(val);
                    }
                  } else {
                    // 如果中间断档了（比如 AI 漏掉了 [空2] 直接写了 [空3]），则停止
                    break;
                  }
                }

                if (answers.length > 0) {
                  resolve({ choice: 'FIB', full: cleanedContent, answers: answers });
                  return;
                }

                // 3. 最后的兜底：按行拆分，过滤掉说明行
                const lines = targetContent.split('\n')
                  .map(l => l.trim())
                  .filter(l => l !== "" && !l.includes('【') && !l.includes('应该'));
                resolve({ choice: 'FIB', full: cleanedContent, answers: lines });
                return;
              }

              // 简化的答案提取逻辑
              let finalAnswer = '';
              const trimmedContent = cleanedContent.trim().toUpperCase();

              if (type === 'TF') {
                // 判断题：直接寻找T或F
                if (trimmedContent.includes('T') && !trimmedContent.includes('F')) {
                  finalAnswer = 'T';
                } else if (trimmedContent.includes('F')) {
                  finalAnswer = 'F';
                } else {
                  finalAnswer = ''; // 无法确定时返回空字符串
                }
              } else if (type === 'MC') {
                // 单选题：寻找A-D
                const match = trimmedContent.match(/[A-D]/);
                finalAnswer = match ? match[0] : '';
              } else if (type === 'MC_MORE') {
                // 多选题：寻找所有A-D字母
                const allLetters = trimmedContent.match(/[A-D]/g);
                finalAnswer = allLetters ? allLetters.join('') : '';
              }

              resolve({ choice: finalAnswer, full: cleanedContent });
            } else {
              resolve({ choice: 'CODE', full: cleanedContent });
            }
          } catch (e) { reject('解析失败，请刷新页面后重试。'); }
        },
        onerror: function (err) { reject('无法连接到服务器，请检查网络或服务状态。'); }
      });
    });
    }

    // --- 6. 代码编辑器操作 ---
    async function switchLanguage(targetLang) {
    const ptaLangName = LANG_MAP[targetLang];
    if (!ptaLangName) return false;


    // 1. 查找当前语言显示框文字
    const currentLangElem = document.querySelector('.select__single-value .pc-text-raw');
    const currentText = currentLangElem ? currentLangElem.innerText : "";

    if (currentLangElem) {
      if (targetLang === 'Python') {
        // 如果当前已经是 python3，直接跳过
        if (currentText.includes('Python (python3)')) {
          addInfoLog(`当前语言已是 ${currentText}，无需切换。`);
          return true;
        }
      } else if (currentText.includes(targetLang)) {
        addInfoLog(`当前语言已是 ${currentText}，无需切换。`);
        return true;
      }
    }

    addInfoLog(`正在尝试打开菜单并切换至 ${ptaLangName}...`);

    // 针对 react-select 的多重触发策略
    const triggerElements = [
      document.querySelector('.select__dropdown-indicator svg'), // 你提供的那个 SVG
      document.querySelector('.select__dropdown-indicator'),
      document.querySelector('.select__control'),
      document.querySelector('input[id^="react-select-"][role="combobox"]')
    ];

    let opened = false;
    for (const el of triggerElements) {
      if (el) {
        try {
          // 模拟 mousedown + click，这是触发 react-select 最稳妥的方式
          el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          if (typeof el.click === 'function') {
            el.click();
          } else {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
          await new Promise(r => setTimeout(r, 600));
        } catch (e) {
          console.error("触发切换失败:", e);
        }

        // 检查菜单是否真的出来了
        if (document.querySelectorAll('.select__option').length > 0) {
          opened = true;
          break;
        }
      }
    }

    if (!opened) {
      addInfoLog("提示：菜单可能未通过常规点击打开，尝试最后一次强行扫描...", false);
      await new Promise(r => setTimeout(r, 1000));
    }

    // 寻找目标选项
    let options = Array.from(document.querySelectorAll('.select__option'));
    let targetOption = null;

    if (targetLang === 'Python') {
      // Python 优先级逻辑
      const priorities = ['Python (python3)', 'Python (python2)', 'Python'];
      for (const p of priorities) {
        targetOption = options.find(opt => {
          const label = opt.getAttribute('aria-label') || opt.innerText;
          return label.includes(p);
        });
        if (targetOption) break;
      }
    } else {
      targetOption = options.find(opt => {
        const label = opt.getAttribute('aria-label') || opt.innerText;
        return label.includes(targetLang);
      });
    }

    if (targetOption) {
      const finalLangName = targetOption.innerText.trim();
      addInfoLog(`找到选项: ${finalLangName}，正在执行选择...`);
      // 点击并触发 mousedown 确保 react 监听到状态变化
      targetOption.scrollIntoView({ block: 'nearest' });
      targetOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      targetOption.click();

      await new Promise(r => setTimeout(r, 1000));
      addInfoLog(`语言已成功切换为: ${targetLang}`);
      return true;
    } else {
      addInfoLog(`错误：无法在菜单中找到 ${targetLang} (检测到 ${options.length} 个选项)`, false);
      // 点击页面空白处关闭可能卡住的菜单
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      return false;
    }
    }

    function findCodeMirrorInstance(editor) {
    let node = editor;
    while (node) {
      if (node.CodeMirror && typeof node.CodeMirror.setValue === 'function') {
        return { type: 'cm5', instance: node.CodeMirror };
      }

      const cmView = node.cmView;
      if (cmView?.view?.state?.doc && typeof cmView.view.dispatch === 'function') {
        return { type: 'cm6', instance: cmView.view };
      }
      if (cmView?.rootView?.view?.state?.doc && typeof cmView.rootView.view.dispatch === 'function') {
        return { type: 'cm6', instance: cmView.rootView.view };
      }

      if (node.view?.state?.doc && typeof node.view.dispatch === 'function') {
        return { type: 'cm6', instance: node.view };
      }

      node = node.parentElement;
    }
    return null;
    }

    function normalizeEditorText(text) {
    return String(text || '').replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').trim();
    }

    function triggerEditorSyncEvents(editor, text) {
    try {
      editor.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    } catch (_) { }
    try {
      editor.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      }));
    } catch (_) { }
    try {
      editor.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: text
      }));
    } catch (_) {
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    try {
      editor.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    } catch (_) { }
    }

    function fillByCodeMirrorApi(editor, code) {
    const found = findCodeMirrorInstance(editor);
    if (!found) return false;
    try {
      if (found.type === 'cm6') {
        const view = found.instance;
        const docLen = view.state.doc.length;
        view.dispatch({
          changes: { from: 0, to: docLen, insert: code },
          selection: { anchor: Math.max(0, code.length) }
        });
        if (typeof view.focus === 'function') view.focus();
        return true;
      }
      if (found.type === 'cm5') {
        const cm = found.instance;
        cm.setValue(code);
        if (typeof cm.focus === 'function') cm.focus();
        return true;
      }
    } catch (err) {
      console.warn('CodeMirror API 写入失败:', err);
    }
    return false;
    }

    async function fillCodeEditor(code) {
    installInputBypassPatch();

    // 尝试找到所有的编辑器内容区域，并优先选择可编辑的那个
    const container = document.querySelector('[data-e2e="code-editor-input"]');
    let editors = container ?
      Array.from(container.querySelectorAll('.cm-content[contenteditable="true"]')) :
      Array.from(document.querySelectorAll('.cm-content[contenteditable="true"]'));

    if (editors.length === 0) {
      // 兜底：寻找普通的 cm-content (可能是只读或未标记 contenteditable)
      const anyEditor = document.querySelector('.cm-content');
      if (anyEditor) editors = [anyEditor];
    }

    if (editors.length === 0) return false;

    // 在 PTA 中，如果有多个编辑器（如函数题），通常最后一个是我们要填空的那个
    const editor = editors[editors.length - 1];
    clearInlineBlockers(editor.closest('.cm-editor') || editor);

    editor.focus();
    const finalCode = String(code || '').replace(/\r\n/g, '\n');

    // 针对 CodeMirror 6 的强力清空与填入逻辑
    try {
      const hasNonWhitespace = /\S/.test(finalCode);
      const isMeaningfulFilled = () => {
        const current = normalizeEditorText(editor.innerText || editor.textContent || '');
        if (!hasNonWhitespace) return true;
        return current.length > 0 && /\S/.test(current);
      };

      // 0. 优先使用 CodeMirror 内部 API（最不受禁粘贴逻辑影响）
      if (fillByCodeMirrorApi(editor, finalCode)) {
        await new Promise(r => setTimeout(r, 80));
        if (isMeaningfulFilled()) return true;
      }

      // 1. 全选并删除
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      await new Promise(r => setTimeout(r, 100));

      // 2. 主路径：直接 insertText，避免触发站点读取系统剪贴板
      document.execCommand('insertText', false, finalCode);
      await new Promise(r => setTimeout(r, 120));

      // 3. 兜底1：按行写入，显式插入换行，避免整段 insertText 变成空白/空格
      if (!isMeaningfulFilled()) {
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        await new Promise(r => setTimeout(r, 60));

        const lines = finalCode.split('\n');
        for (let i = 0; i < lines.length; i++) {
          document.execCommand('insertText', false, lines[i]);
          if (i < lines.length - 1) {
            document.execCommand('insertLineBreak', false, null);
          }
        }
        await new Promise(r => setTimeout(r, 120));
      }

      // 4. 兜底2：直接赋值并触发 input/change，确保 React 状态同步
      if (!isMeaningfulFilled()) {
        editor.textContent = finalCode;
        triggerEditorSyncEvents(editor, finalCode);
        await new Promise(r => setTimeout(r, 60));
      }

      // 5. 最后再次尝试 CodeMirror API（防止前面被页面脚本回滚）
      if (!isMeaningfulFilled()) {
        fillByCodeMirrorApi(editor, finalCode);
        await new Promise(r => setTimeout(r, 80));
      }

      return isMeaningfulFilled();
    } catch (e) {
      console.error("代码填充失败:", e);
      return false;
    }
    }

    // --- 7. 核心功能：跳转与保存 ---
    async function saveAndNext() {
    const submitBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.innerText.includes('提交本题作答') ||
      b.innerText.includes('Submit For This Problem')
    );
    if (submitBtn) {
      addInfoLog("编程类题型当前页已处理。");
    } else {
      const saveBtn = document.querySelector('button[data-e2e="problem-set-bottom-submit-btn"]');
      if (saveBtn) {
        addInfoLog("正在保存答案...");
        saveBtn.click();
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    if (!CONFIG.autoNext) {
      addInfoLog("自动切换已关闭，任务结束。");
      return false;
    }

    const navIds = ['TRUE_OR_FALSE', 'MULTIPLE_CHOICE', 'MULTIPLE_CHOICE_MORE_THAN_ONE_ANSWER', 'FILL_IN_THE_BLANK', 'FILL_IN_THE_BLANKS', 'FILL_IN_THE_BLANK_FOR_PROGRAMMING', 'CODE_COMPLETION', 'PROGRAMMING', 'CODE_PROGRAMMING'];
    const activeTab = document.querySelector('a.active-anchor, a.active');
    if (activeTab) {
      const currentId = activeTab.id;
      const currentIndex = navIds.indexOf(currentId);
      if (currentIndex !== -1) {
        for (let i = currentIndex + 1; i < navIds.length; i++) {
          const nextTab = document.getElementById(navIds[i]);
          if (nextTab) {
            addInfoLog(`切换题型: ${nextTab.innerText.split('\n')[0]}`);
            nextTab.click();
            return true;
          }
        }
      }
    }
    addInfoLog("所有题型已完成！");
    return false;
    }

    // --- 新增：代码注释处理函数 ---
    function removeComments(code, lang) {
    if (!code) return "";
    let result = "";
    if (lang === 'Python') {
      // 移除单行注释
      let lines = code.split('\n');
      let processedLines = lines.map(line => {
        let inString = false;
        let quoteChar = '';
        for (let i = 0; i < line.length; i++) {
          if ((line[i] === '"' || line[i] === "'") && (i === 0 || line[i - 1] !== '\\')) {
            if (!inString) {
              inString = true;
              quoteChar = line[i];
            } else if (line[i] === quoteChar) {
              inString = false;
            }
          }
          if (line[i] === '#' && !inString) {
            return line.substring(0, i).trimEnd();
          }
        }
        return line;
      });
      result = processedLines.filter(line => line.trim() !== "").join('\n').trim();
    } else {
      // C, C++, Java
      // 先处理多行注释
      let cleaned = code.replace(/\/\*[\s\S]*?\*\//g, '');
      let lines = cleaned.split('\n');
      let processedLines = lines.map(line => {
        let inString = false;
        let quoteChar = '';
        for (let i = 0; i < line.length; i++) {
          if ((line[i] === '"' || line[i] === "'") && (i === 0 || line[i - 1] !== '\\')) {
            if (!inString) {
              inString = true;
              quoteChar = line[i];
            } else if (line[i] === quoteChar) {
              inString = false;
            }
          }
          if (line[i] === '/' && line[i + 1] === '/' && !inString) {
            return line.substring(0, i).trimEnd();
          }
        }
        return line;
      });
      result = processedLines.filter(line => line.trim() !== "").join('\n').trim();
    }
    return result;
    }

    // --- 8. 各类题型解决逻辑 ---
    async function solveTrueFalse() {
    console.log('[PTA Helper] 🚀 solveTrueFalse 函数开始执行');
    const questions = document.querySelectorAll('div.pc-x[id]');
    console.log('[PTA Helper] 📋 找到判断题数量:', questions.length);
    if (questions.length === 0) return;

    // 统计已完成题目
    let completedCount = 0;
    let answeredCount = 0;
    for (const q of questions) {
      if (q.querySelector('.PROBLEM_ACCEPTED_iri62') ||
          q.querySelector('.fa-check-circle') ||
          q.querySelector('[class*="accepted"]')) {
        completedCount++;
      } else if (q.querySelector('input[type="radio"]:checked') ||
                 q.querySelector('input[type="checkbox"]:checked')) {
        answeredCount++;
      }
    }

    const processedCount = completedCount + answeredCount;
    const remainingCount = questions.length - processedCount;
    addInfoLog(`[判断题] 总数 ${questions.length}，已完成 ${completedCount}，已选择 ${answeredCount}，待处理 ${remainingCount}`);

    if (remainingCount === 0) {
      addInfoLog('[判断题] 所有题目已完成，跳过');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      if (!isRunning) return;
      const qBlock = questions[i];

      // 断点续答：检查题目是否已完成或已作答
      const isCompleted = qBlock.querySelector('.PROBLEM_ACCEPTED_iri62') ||
                        qBlock.querySelector('.fa-check-circle') ||
                        qBlock.querySelector('[class*="accepted"]') ||
                        qBlock.querySelector('[class*="correct"]') ||
                        qBlock.querySelector('.text-success') ||
                        qBlock.querySelector('.pc-bg-success');

      // 检查是否已经有选择答案
      const hasAnswer = qBlock.querySelector('input[type="radio"]:checked') ||
                       qBlock.querySelector('input[type="checkbox"]:checked');

      if (isCompleted || hasAnswer) {
        console.log(`[PTA Helper] ⏭️ 跳过已作答题目 ${i + 1} (${isCompleted ? '已完成' : '已选择'})`);
        continue;
      }

      // 改进：更精准地克隆并清理题目区域，避免误删正文中的 flex 布局
      const qClone = qBlock.cloneNode(true);

      // 针对 PTA 的判断题结构，选项通常在最后
      const optionsArea = qClone.querySelector('span.flex.flex-wrap[class*="-m-0.5"]') ||
        qClone.querySelector('.flex.flex-wrap.mt-4') ||
        qClone.querySelector('.flex.flex-wrap');
      if (optionsArea) optionsArea.remove();

      // 2. 剔除题目标题头 (如 R1-1, 分数, 作者, 单位)
      const headerInfo = qClone.querySelector('.flex.flex-wrap.gap-2') ||
        qClone.querySelector('.flex.flex-wrap.gap-x-5') ||
        qClone.querySelector('.flex.flex-wrap.gap-2.grow');
      if (headerInfo) headerInfo.remove();

      const questionText = getCleanText(qClone);

      if (!questionText) {
        addInfoLog(`[跳过] 第 ${i + 1} 题内容为空。`, false);
        continue;
      }

      const logItem = addLog(`${i + 1}. ${questionText}`);

      try {
        if (!isRunning) return;
        console.log('[PTA Helper] 📞 准备调用AI，题目:', questionText.substring(0, 50) + '...');
        const result = await askAI(questionText, 'TF');
        if (!isRunning) return;

        console.log('[PTA Helper] 📨 AI返回结果:', result);
        const answer = result.choice;
        console.log('[PTA Helper] 🎯 提取的答案:', answer);

        // 如果答案为空，跳过此题
        if (!answer) {
          updateLog(logItem, '跳过：AI无法确定答案', false);
          await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
          continue;
        }

        const labels = Array.from(qBlock.querySelectorAll('label'));
        console.log('[PTA Helper] 🏷️ 可用选项:', labels.map(l => l.innerText.trim()));
        let targetLabel = null;

        // 改进的匹配逻辑：更精确的匹配，避免错误匹配
        for (const label of labels) {
          const labelText = label.innerText.trim().toUpperCase();
          console.log('[PTA Helper] 🔍 检查选项:', labelText, 'vs 答案:', answer);

          // 精确匹配优先
          if (labelText === answer) {
            targetLabel = label;
            console.log('[PTA Helper] ✅ 精确匹配成功!');
            break;
          }

          // 判断题特殊匹配 - 只匹配明确的文字
          if (answer === 'T') {
            if (labelText === '正确' || labelText === 'TRUE' || labelText === '对' || labelText === '√' || labelText === '✔') {
              targetLabel = label;
              console.log('[PTA Helper] ✅ 匹配到"正确"选项!');
              break;
            }
          } else if (answer === 'F') {
            if (labelText === '错误' || labelText === 'FALSE' || labelText === '错' || labelText === '×' || labelText === '✘') {
              targetLabel = label;
              console.log('[PTA Helper] ✅ 匹配到"错误"选项!');
              break;
            }
          }
        }

        if (targetLabel) {
          const input = targetLabel.querySelector('input');
          if (input) input.focus();
          targetLabel.click();
          updateLog(logItem, result.full);
          console.log('[PTA Helper] ✅ 成功选择选项!');
        } else {
          console.log('[PTA Helper] ❌ 未找到匹配选项');
          updateLog(logItem, `未找到选项: ${answer} (可用选项: ${labels.map(l => l.innerText.trim()).join(', ')})`, false);
        }
      } catch (err) {
        updateLog(logItem, `请求失败: ${err}`, false);
      }
      // 增加延迟，避免触发API限流：1-2秒随机延迟
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
    }
    }

    // --- 优化通用文本清洗函数 ---
    function getCleanText(element) {
    if (!element) return "";
    const clone = element.nodeType ? element.cloneNode(true) : element;

    // 0. 预先移除干扰元素
    TRASH_SELECTORS.forEach(s => {
      clone.querySelectorAll(s).forEach(el => el.remove());
    });

    // 1. 处理图片
    clone.querySelectorAll('img').forEach(img => {
      if (img.alt) {
        const span = document.createElement('span');
        span.innerText = ` [图片: ${img.alt}] `;
        img.parentNode.replaceChild(span, img);
      }
    });

    // 2. 深度处理所有代码块 (保证换行)
    const processedBlocks = new Set();
    clone.querySelectorAll('[data-code], .codeEditor_CHvdZ, .cm-editor').forEach(codeBlock => {
      if (processedBlocks.has(codeBlock)) return;

      const cmContent = codeBlock.querySelector('.cm-content');
      if (cmContent) {
        // 修正：显式提取每一行并拼接换行符
        let lines = Array.from(cmContent.querySelectorAll('.cm-line'))
          .map(line => line.innerText)
          .join('\n');

        // 兜底：如果没找到 .cm-line (可能是旧版或非 CM 编辑器)
        if (!lines) {
          lines = cmContent.innerText;
        }

        const lang = codeBlock.getAttribute('data-lang') || "";
        const pre = document.createElement('pre');
        // 关键：在 pre 标签中设置文本，innerText 提取时会保留换行
        pre.innerText = `\n\`\`\`${lang}\n${lines}\n\`\`\`\n`;

        // 标记其子孙节点，防止重复处理
        codeBlock.querySelectorAll('*').forEach(child => processedBlocks.add(child));
        codeBlock.parentNode.replaceChild(pre, codeBlock);
        processedBlocks.add(codeBlock);
      }
    });

    // 3. 处理表格：增加换行和分隔符，方便 AI 理解
    clone.querySelectorAll('table').forEach(table => {
      let tableText = "\n[表格内容]\n";
      table.querySelectorAll('tr').forEach(tr => {
        const row = Array.from(tr.querySelectorAll('td, th'))
          .map(cell => cell.innerText.trim())
          .join(' | ');
        tableText += "| " + row + " |\n";
      });
      const pre = document.createElement('pre');
      pre.innerText = tableText + "[表格结束]\n";
      table.parentNode.replaceChild(pre, table);
    });

    // 4. 处理 KaTeX 公式
    clone.querySelectorAll('.katex-html').forEach(el => el.remove());

    return clone.innerText
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    }

    async function solveMultipleChoice() {
    const questions = document.querySelectorAll('div.pc-x[id]');
    if (questions.length === 0) return;

    // 统计已完成和已选择题目
    let completedCount = 0;
    let answeredCount = 0;
    for (const q of questions) {
      if (q.querySelector('.PROBLEM_ACCEPTED_iri62') ||
          q.querySelector('.fa-check-circle') ||
          q.querySelector('[class*="accepted"]')) {
        completedCount++;
      } else if (q.querySelector('input[type="radio"]:checked')) {
        answeredCount++;
      }
    }

    const processedCount = completedCount + answeredCount;
    const remainingCount = questions.length - processedCount;
    addInfoLog(`[单选题] 总数 ${questions.length}，已完成 ${completedCount}，已选择 ${answeredCount}，待处理 ${remainingCount}`);
    for (let i = 0; i < questions.length; i++) {
      if (!isRunning) return;
      const qBlock = questions[i];

      // 断点续答：检查题目是否已完成或已作答
      const isCompleted = qBlock.querySelector('.PROBLEM_ACCEPTED_iri62') ||
                        qBlock.querySelector('.fa-check-circle') ||
                        qBlock.querySelector('[class*="accepted"]') ||
                        qBlock.querySelector('[class*="correct"]') ||
                        qBlock.querySelector('.text-success') ||
                        qBlock.querySelector('.pc-bg-success');

      // 检查是否已经有选择答案
      const hasAnswer = qBlock.querySelector('input[type="radio"]:checked') ||
                       qBlock.querySelector('input[type="checkbox"]:checked');

      if (isCompleted || hasAnswer) {
        console.log(`[PTA Helper] ⏭️ 跳过已作答题目 ${i + 1} (${isCompleted ? '已完成' : '已选择'})`);
        continue;
      }

      // 改进：克隆并清理，保留代码、表格，剔除作者和选项
      const qClone = qBlock.cloneNode(true);

      // 1. 剔除选项区域
      const optionsArea = qClone.querySelector('span.flex.flex-wrap[class*="-m-0.5"]') ||
        qClone.querySelector('.flex.flex-wrap.mt-4') ||
        qClone.querySelector('.flex.flex-wrap');
      if (optionsArea) optionsArea.remove();

      // 2. 剔除题目标题头 (如 R2-1, 分数, 作者, 单位)
      const headerInfo = qClone.querySelector('.flex.flex-wrap.gap-2') ||
        qClone.querySelector('.flex.flex-wrap.gap-x-5');
      if (headerInfo) headerInfo.remove();

      const questionText = getCleanText(qClone);
      if (!questionText) {
        addInfoLog(`[跳过] 第 ${i + 1} 题提取文本为空。`, false);
        continue;
      }

      // 3. 提取所有选项
      const labels = Array.from(qBlock.querySelectorAll('label'));
      let optionsPrompt = "\n选项：\n";
      labels.forEach(label => {
        // 找到选项标号 (如 A.)
        const indicator = label.querySelector('span')?.innerText.trim() || "";
        // 选项内容通过清洗函数提取，确保支持代码等复杂格式
        const optionClone = label.cloneNode(true);
        // 删掉标号，只留内容
        const span = optionClone.querySelector('span');
        if (span) span.remove();
        const contentText = getCleanText(optionClone);
        optionsPrompt += `${indicator} ${contentText}\n`;
      });

      const logItem = addLog(`${i + 1}. ${questionText}`);
      try {
        if (!isRunning) return;
        const result = await askAI(questionText + optionsPrompt, 'MC');
        if (!isRunning) return;

        const answer = result.choice;

        // 如果答案为空，跳过此题
        if (!answer) {
          updateLog(logItem, '跳过：AI无法确定答案', false);
          await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
          continue;
        }

        let targetLabel = null;

        // 改进的选项匹配逻辑
        for (const label of labels) {
          const indicator = label.querySelector('span')?.innerText.trim() || label.innerText.trim();
          // 精确匹配：选项标号完全匹配答案
          if (indicator.toUpperCase() === answer.toUpperCase() || indicator.startsWith(answer + '.') || indicator.startsWith(answer + '、')) {
            targetLabel = label;
            break;
          }
        }

        if (targetLabel) {
          targetLabel.click();
          updateLog(logItem, result.full);
        } else {
          updateLog(logItem, `未找到选项: ${answer}，跳过此题`, false);
        }
      } catch (err) { updateLog(logItem, `错误: ${err}`, false); }
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    }
    }

    async function solveMultipleChoiceMore() {
    const questions = document.querySelectorAll('div.pc-x[id]');
    if (questions.length === 0) return;

    // 统计已完成和已选择题目
    let completedCount = 0;
    let answeredCount = 0;
    for (const q of questions) {
      if (q.querySelector('.PROBLEM_ACCEPTED_iri62') ||
          q.querySelector('.fa-check-circle') ||
          q.querySelector('[class*="accepted"]')) {
        completedCount++;
      } else if (q.querySelector('input[type="checkbox"]:checked')) {
        answeredCount++;
      }
    }

    const processedCount = completedCount + answeredCount;
    const remainingCount = questions.length - processedCount;
    addInfoLog(`[多选题] 总数 ${questions.length}，已完成 ${completedCount}，已选择 ${answeredCount}，待处理 ${remainingCount}`);
    for (let i = 0; i < questions.length; i++) {
      if (!isRunning) return;
      const qBlock = questions[i];

      // 断点续答：检查题目是否已完成或已作答
      const isCompleted = qBlock.querySelector('.PROBLEM_ACCEPTED_iri62') ||
                        qBlock.querySelector('.fa-check-circle') ||
                        qBlock.querySelector('[class*="accepted"]') ||
                        qBlock.querySelector('[class*="correct"]') ||
                        qBlock.querySelector('.text-success') ||
                        qBlock.querySelector('.pc-bg-success');

      // 检查是否已经有选择答案
      const hasAnswer = qBlock.querySelector('input[type="radio"]:checked') ||
                       qBlock.querySelector('input[type="checkbox"]:checked');

      if (isCompleted || hasAnswer) {
        console.log(`[PTA Helper] ⏭️ 跳过已作答题目 ${i + 1} (${isCompleted ? '已完成' : '已选择'})`);
        continue;
      }

      // 改进：克隆并清理，保留代码、表格，剔除作者和选项
      const qClone = qBlock.cloneNode(true);

      // 1. 剔除选项区域
      const optionsArea = qClone.querySelector('span.flex.flex-wrap[class*="-m-0.5"]') ||
        qClone.querySelector('.flex.flex-wrap.mt-4') ||
        qClone.querySelector('.flex.flex-wrap');
      if (optionsArea) optionsArea.remove();

      // 2. 剔除题目标题头 (如 R2-1, 分数, 作者, 单位)
      const headerInfo = qClone.querySelector('.flex.flex-wrap.gap-2') ||
        qClone.querySelector('.flex.flex-wrap.gap-x-5');
      if (headerInfo) headerInfo.remove();

      const questionText = getCleanText(qClone);
      if (!questionText) {
        addInfoLog(`[跳过] 第 ${i + 1} 题内容为空。`, false);
        continue;
      }

      const labels = Array.from(qBlock.querySelectorAll('label'));
      let optionsPrompt = "\n(多选题) 选项：\n";
      labels.forEach(label => {
        const indicator = label.querySelector('span')?.innerText.trim() || "";
        const optionClone = label.cloneNode(true);
        const span = optionClone.querySelector('span');
        if (span) span.remove();
        const contentText = getCleanText(optionClone);
        optionsPrompt += `${indicator} ${contentText}\n`;
      });

      const logItem = addLog(`${i + 1}. ${questionText}`);
      try {
        if (!isRunning) return;
        const result = await askAI(questionText + optionsPrompt, 'MC_MORE');
        if (!isRunning) return;

        const answers = result.choice;

        // 增强调试信息
        const availableOptions = labels.map(label => {
          const indicator = label.querySelector('span')?.innerText.trim() || label.innerText.trim();
          return indicator;
        });
        console.log('[PTA Helper] AI答案:', answers, '可用选项:', availableOptions);

        for (const label of labels) {
          const indicator = label.querySelector('span')?.innerText.trim() || label.innerText.trim();
          const firstChar = indicator[0].toUpperCase();

          const checkbox = label.querySelector('input[type="checkbox"]');
          if (answers.includes(firstChar)) {
            if (checkbox && !checkbox.checked) label.click();
          } else {
            if (checkbox && checkbox.checked) label.click();
          }
        }
        updateLog(logItem, result.full);
      } catch (err) { updateLog(logItem, `错误: ${err}`, false); }
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    }
    }

    async function solveFillInTheBlank(typeName = '填空题') {
    const questions = document.querySelectorAll('div.pc-x[id]');
    if (questions.length === 0) return;
    addInfoLog(`[${typeName}] 开始处理 ${questions.length} 道题目`);

    for (let i = 0; i < questions.length; i++) {
      if (!isRunning) return;
      const qBlock = questions[i];

      // 兼容性：找寻填空题的真实内容区域，可能在 rendered-markdown 或 codeEditor 中
      const textElement = qBlock.querySelector('.rendered-markdown') || qBlock.querySelector('.generalProblemBody_WIhdN') || qBlock;
      if (!textElement) continue;

      const clone = textElement.cloneNode(true);

      // --- 关键修正：先进行标记替换，再进行代码转换 ---

      // 定义填空位置寻找逻辑 (兼容新旧版编辑器)
      const findBlanksInternal = (root) => {
        const blanks = [];
        root.querySelectorAll('[data-blank-index]').forEach(el => blanks.push(el));
        root.querySelectorAll('.cm-content span[contenteditable="false"]').forEach(el => {
          if (el.querySelector('input, textarea') && !blanks.includes(el)) blanks.push(el);
        });
        root.querySelectorAll('input, textarea').forEach(input => {
          let p = input.parentElement;
          while (p && p !== root) {
            if (blanks.includes(p)) return;
            if (p.classList.contains('inline-flex') || p.tagName === 'SPAN' || p.classList.contains('cm-widgetBuffer')) {
              blanks.push(p);
              return;
            }
            p = p.parentElement;
          }
          if (!blanks.some(b => b.contains(input))) blanks.push(input);
        });
        return blanks;
      };

      // 1. 替换填空标记位
      const blanksInClone = findBlanksInternal(clone);
      blanksInClone.forEach((b, idx) => {
        const marker = document.createTextNode(` [空${idx + 1}] `);
        if (b.parentNode) {
          b.parentNode.replaceChild(marker, b);
        }
      });

      // 2. 清理分数标签等干扰项 (现在分数标签应该作为标记的一部分被移除了，这里是二次加固)
      TRASH_SELECTORS.forEach(s => {
        clone.querySelectorAll(s).forEach(el => el.remove());
      });

      // 3. 转换代码编辑器内容 (修正换行丢失)
      clone.querySelectorAll('[data-code]').forEach(codeBlock => {
        const cmContent = codeBlock.querySelector('.cm-content');
        if (cmContent) {
          // 修正：显式提取每一行，保证 [空n] 标记也在正确行内并保留换行
          let content = Array.from(cmContent.querySelectorAll('.cm-line'))
            .map(line => line.innerText)
            .join('\n');
          if (!content) content = cmContent.innerText;

          const lang = codeBlock.getAttribute('data-lang') || '';
          // 使用 pre 标签包装，确保最终 innerText 包含换行
          const pre = document.createElement('pre');
          pre.innerText = `\n\`\`\`${lang}\n${content}\n\`\`\`\n`;
          codeBlock.parentNode.replaceChild(pre, codeBlock);
        }
      });

      const questionText = clone.innerText.trim();
      const realBlanks = findBlanksInternal(qBlock);
      if (realBlanks.length === 0) continue;

      const logItem = addLog(`${i + 1}. ${questionText}`);
      try {
        if (!isRunning) return;
        const isProg = typeName.includes('程序');
        const aiType = isProg ? 'FIB_PROG' : 'FIB';

        addInfoLog(`[${typeName}] 共有 ${realBlanks.length} 个空，正在请求 AI (${aiType})...`);
        const result = await askAI(questionText + `\n\n(提示：请给出以上题目中 ${realBlanks.length} 个空的答案，按顺序排列，每空请使用 [空n]内容 [/空n] 的格式回复)`, aiType);
        if (!isRunning) return;

        const aiAnswers = result.answers || [];
        for (let j = 0; j < realBlanks.length; j++) {
          if (aiAnswers[j]) {
            const blankParent = realBlanks[j];
            const el = blankParent.tagName === 'INPUT' || blankParent.tagName === 'TEXTAREA' ?
              blankParent : blankParent.querySelector('input, textarea');
            if (el) {
              const value = aiAnswers[j];

              // 修复：针对 React 状态同步的强力赋值
              const lastValue = el.value;
              el.value = value;
              const tracker = el._valueTracker;
              if (tracker) tracker.setValue(lastValue);
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }
        updateLog(logItem, aiAnswers.join(' | '));
      } catch (err) { updateLog(logItem, `错误: ${err}`, false); }
      await new Promise(r => setTimeout(r, 800));
    }
    }

    async function solveCodeProblems(type) {
    const problemBtns = document.querySelectorAll('a[href*="problemSetProblemId"]');
    if (problemBtns.length === 0) { addInfoLog("未找到题目按钮"); return; }

    const targetLang = type === 'FUNC' ? CONFIG.funcLang : CONFIG.progLang;
    addInfoLog(`[${type === 'FUNC' ? '函数题' : '编程题'}] 共有 ${problemBtns.length} 题，预设语言: ${targetLang}`);

    for (let i = 0; i < problemBtns.length; i++) {
      if (!isRunning) return;

      const btn = problemBtns[i];
      if (btn.querySelector('.PROBLEM_ACCEPTED_iri62')) {
        addInfoLog(`第 ${i + 1} 题已通过，跳过`); continue;
      }
      addInfoLog(`正在解决第 ${i + 1} 题...`);
      btn.click();
      await new Promise(r => setTimeout(r, 2500));

      if (!isRunning) return;

      const title = document.querySelector('.text-darkest.font-bold.text-lg')?.innerText ||
        document.querySelector('.problem-title')?.innerText ||
        `第 ${i + 1} 题`;
      const logItem = addLog(title);

      // 切换语言
      await switchLanguage(targetLang);

      // 等待编辑器出现，增加重试机制
      let editorExists = false;
      for (let j = 0; j < 10; j++) {
        if (document.querySelector('.cm-content')) {
          editorExists = true;
          break;
        }
        addInfoLog(`等待编辑器加载中 (${j + 1}/10)...`);
        await new Promise(r => setTimeout(r, 1000));
      }

      if (!editorExists) {
        addInfoLog(`[跳过] 无法加载编辑器，跳过此题。`, false);
        updateLog(logItem, "编辑器未加载", false);
        continue;
      }

      // 获取题目内容区域，考虑多重可能的选择器
      const contentArea = document.querySelector('.rendered-markdown') ||
        document.querySelector('.generalProblemBody_WIhdN') ||
        document.querySelector('.problem-body') ||
        document.querySelector('.problemBody_S_NqD');

      // 获取题目限制信息 (时间、内存等)
      const infoList = document.querySelector('.problemInfo_HVczC');
      const infoText = infoList ? infoList.innerText.replace(/\n+/g, ' ').trim() : '';

      try {
        if (!isRunning) return;
        addInfoLog(`正在请求 AI 生成代码 (${targetLang})...`);

        // 组合更完整的题目信息给 AI
        const mainContent = getCleanText(contentArea || document.body);
        const fullPrompt = `【题目标题】：${title}\n【限制信息】：${infoText}\n【题目正文】：\n${mainContent}`;

        const result = await askAI(fullPrompt, type, targetLang);

        if (!isRunning) return;
        addInfoLog(`AI 生成完毕，正在填入编辑器...`);

        let codeToFill = result.full;
        if (CONFIG.removeComments) {
          addInfoLog(`[优化] 正在本地清除代码注释以符合提交要求...`);
          codeToFill = removeComments(result.full, targetLang);
        }

        const filled = await fillCodeEditor(codeToFill);

        if (filled) {
          await new Promise(r => setTimeout(r, 800));

          if (!isRunning) return;

          const submitBtn = Array.from(document.querySelectorAll('button')).find(b =>
            b.innerText.includes('提交本题作答') || b.querySelector('.pc-text-raw')?.innerText === '提交本题作答'
          );

          if (submitBtn) {
            addInfoLog(`[提示] 代码已填写完毕，请手动检查并提交`);
            // 已禁用自动提交 - submitBtn.click();

            addInfoLog(`[等待] 等待提交结果返回...`);
            let foundResult = false;
            for (let attempt = 0; attempt < 15; attempt++) {
              if (!isRunning) break;
              const closeBtn = document.querySelector('button[data-e2e="modal-close-btn"]');
              if (closeBtn) {
                addInfoLog(`[成功] 检测到提交结果窗口，准备关闭...`);
                closeBtn.click();
                foundResult = true;
                break;
              }
              await new Promise(r => setTimeout(r, 1000));
            }

            if (!foundResult && isRunning) {
              addInfoLog(`[警告] 提交后未检测到结果反馈，请检查。`, false);
            }

            updateLog(logItem, `已提交 (${targetLang})`, true);
          } else {
            addInfoLog(`[错误] 未能定位到提交按钮！`, false);
            updateLog(logItem, "未找到提交按钮", false);
          }
        } else {
          addInfoLog(`[错误] 无法填入代码。`, false);
          updateLog(logItem, "编辑器定位失败", false);
        }
      } catch (err) {
        addInfoLog(`[异常] ${err}`);
        updateLog(logItem, `错误: ${err}`, false);
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    }

    // --- 9. 主逻辑入口 ---
    async function solveCurrentPage() {
    console.log('[PTA Helper] 🚀 solveCurrentPage 函数被调用!');
    if (isRunning) return;

    // 检查API配置
    if (!CONFIG.apiUrl || !AUTH.apiKey) {
      console.log('[PTA Helper] ⚠️ API配置不完整:', { apiUrl: CONFIG.apiUrl, apiKey: AUTH.apiKey });
      addInfoLog("请先在设置中配置API地址和API Key。", 'warn');
      return;
    }
    console.log('[PTA Helper] ✅ API配置检查通过，开始答题...');

    isRunning = true;
    startBtn.disabled = true;
    startBtn.innerText = "运行中...";
    stopBtn.style.display = 'inline-block';

    while (isRunning) {
      const tfTab = document.getElementById('TRUE_OR_FALSE');
      const mcTab = document.getElementById('MULTIPLE_CHOICE');
      const mcmTab = document.getElementById('MULTIPLE_CHOICE_MORE_THAN_ONE_ANSWER');
      const fibTab = document.getElementById('FILL_IN_THE_BLANK') || document.getElementById('FILL_IN_THE_BLANKS');
      const fibpTab = document.getElementById('FILL_IN_THE_BLANK_FOR_PROGRAMMING');
      const funcTab = document.getElementById('CODE_COMPLETION');
      const progTab = document.getElementById('PROGRAMMING') || document.getElementById('CODE_PROGRAMMING');

      const activeTab = document.querySelector('a.active-anchor, a.active');
      const activeTabText = activeTab ? activeTab.innerText.trim() : "";

      try {
        if (tfTab && tfTab.classList.contains('active')) {
          await solveTrueFalse();
        } else if (mcTab && mcTab.classList.contains('active')) {
          await solveMultipleChoice();
        } else if (mcmTab && mcmTab.classList.contains('active')) {
          await solveMultipleChoiceMore();
        } else if ((fibTab && fibTab.classList.contains('active')) || (activeTabText.includes('填空题') && !activeTabText.includes('程序'))) {
          await solveFillInTheBlank('普通填空题');
        } else if ((fibpTab && fibpTab.classList.contains('active')) || activeTabText.includes('程序填空题')) {
          await solveFillInTheBlank('程序填空题');
        } else if ((funcTab && funcTab.classList.contains('active')) || activeTabText.includes('函数题')) {
          await solveCodeProblems('FUNC');
        } else if ((progTab && progTab.classList.contains('active')) || activeTabText.includes('编程题')) {
          await solveCodeProblems('PROG');
        } else {
          addInfoLog("当前板块暂不支持或已全部完成。");
          break;
        }

        if (!isRunning) break;

        const switched = await saveAndNext();
        if (switched && CONFIG.autoNext && isRunning) {
          addInfoLog("等待页面加载，5秒后开始下一板块...");
          for (let i = 0; i < 5; i++) {
            if (!isRunning) break;
            await new Promise(r => setTimeout(r, 1000));
          }
          if (!isRunning) break;
        } else {
          break;
        }
      } catch (err) {
        addInfoLog(`运行中发生错误: ${err}`);
        break;
      }
    }

    stopTask();
    addInfoLog("所有自动化任务已结束。");
    }

    function stopTask() {
    isRunning = false;
    startBtn.disabled = false;
    startBtn.innerText = "开始答题";
    stopBtn.style.display = 'none';
    }

    console.log('[PTA Helper] 🔧 绑定按钮事件...');
    const startButton = document.getElementById('start-btn');
    console.log('[PTA Helper] 🎯 找到开始按钮:', startButton);
    if (startButton) {
      startButton.onclick = solveCurrentPage;
      console.log('[PTA Helper] ✅ 按钮事件绑定成功!');
    } else {
      console.log('[PTA Helper] ❌ 未找到开始按钮!');
    }
    }

    // 启动脚本
  waitForDOM();
})();
