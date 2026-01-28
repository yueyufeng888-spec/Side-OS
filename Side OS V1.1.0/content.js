// content.js - Side OS 核心与网页交互脚本
// 集成功能：滚轮切换、键盘快捷键、标题同步、划词灵动岛、AI自动填入

// ==========================================
// 1. 基础交互监听 (滚轮与键盘)
// ==========================================
window.addEventListener('wheel', (e) => {
    // 监听 Alt+滚轮 -> 通知侧边栏切换标签
    if (e.altKey) {
        e.preventDefault();
        e.stopImmediatePropagation();
        try {
            chrome.runtime.sendMessage({
                action: "tabSwitchWheel",
                direction: e.deltaY > 0 ? "next" : "prev"
            }).catch(() => {}); // 防止侧边栏未打开时报错
        } catch (err) {}
    }
}, { passive: false });

window.addEventListener('keydown', (e) => {
    // 检测 Alt + Q -> 通知侧边栏返回主页
    if (e.altKey && (e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        try {
            chrome.runtime.sendMessage({ action: "goHome" }).catch(() => {});
        } catch (err) {}
    }
});

// ==========================================
// 2. 侧边栏导航指令监听 (后退/前进)
// ==========================================
window.addEventListener('message', function(event) {
    if (!event.data) return;
    const expectedOrigin = 'chrome-extension://' + chrome.runtime.id;
    if (event.origin !== expectedOrigin) return;

    if (event.data.type === 'SIDEOS_NAV_BACK') {
        window.history.back();
    } else if (event.data.type === 'SIDEOS_NAV_FORWARD') {
        window.history.forward();
    }
});

// ==========================================
// 3. 标签页标题同步机制 (仅在 Side OS 内部运行时触发)
// ==========================================
if (window.self !== window.top) {
    const reportTitleToSideOS = () => {
        try {
            window.parent.postMessage({
                type: 'SIDEOS_UPDATE_TITLE',
                title: document.title || 'Loading...',
                url: window.location.href
            }, '*');
        } catch (e) {}
    };

    if (document.readyState === 'complete') {
        reportTitleToSideOS();
    } else {
        window.addEventListener('load', reportTitleToSideOS);
    }

    const titleTag = document.querySelector('title');
    if (titleTag) {
        const observer = new MutationObserver(reportTitleToSideOS);
        observer.observe(titleTag, { childList: true, subtree: true });
    }
    
    setInterval(() => {
        if(document.title) reportTitleToSideOS();
    }, 2000);
}

// ==========================================
// 4. [V1.1.X 优化版] 划词灵动岛 (Shadow DOM)
// ==========================================
(function() {
    let toolbarMode = 'disable';
    let toolbarShadow = null;
    let toolbarContainer = null;
    let isClickingToolbar = false;

    // 读取配置
    const syncConfig = () => {
        chrome.storage.local.get(['sideos_selection_toolbar_mode'], (res) => {
            toolbarMode = res.sideos_selection_toolbar_mode || 'disable';
        });
    };
    syncConfig();
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.sideos_selection_toolbar_mode) syncConfig();
    });

    const logoUrl = chrome.runtime.getURL("icons/icon48.png");

    function createToolbar() {
        if (toolbarContainer) return;
        
        toolbarContainer = document.createElement('div');
        toolbarContainer.style.all = 'initial';
        toolbarContainer.style.position = 'absolute';
        toolbarContainer.style.zIndex = '2147483647';
        toolbarContainer.style.top = '-9999px';
        toolbarContainer.style.left = '-9999px';
        
        const shadow = toolbarContainer.attachShadow({mode: 'open'});
        toolbarShadow = shadow;

        // 样式：模仿 Side OS 的磨砂玻璃风格
        const style = document.createElement('style');
        style.textContent = `
            :host { all: initial; }
            .sideos-dock {
                display: flex; align-items: center; gap: 8px;
                padding: 6px;
                background: rgba(30, 30, 30, 0.85);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.25);
                opacity: 0; transform: translateY(10px) scale(0.95);
                transition: opacity 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
                pointer-events: auto;
                cursor: default;
            }
            .sideos-dock.show { opacity: 1; transform: translateY(0) scale(1); }
            
            .main-btn {
                width: 32px; height: 32px;
                border-radius: 8px;
                background: rgba(255,255,255,0.1);
                display: flex; align-items: center; justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
                overflow: hidden;
            }
            .main-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
            .main-btn:active { transform: scale(0.95); }
            .main-btn img { width: 20px; height: 20px; object-fit: contain; border-radius: 4px; pointer-events: none; }
        `;
        shadow.appendChild(style);

        const dock = document.createElement('div');
        dock.className = 'sideos-dock';
        
        const mainBtn = document.createElement('div');
        mainBtn.className = 'main-btn';
        mainBtn.title = '在 Side OS 中搜索';
        mainBtn.innerHTML = `<img src="${logoUrl}" alt="Side OS">`;
        
        // [核心修复] 彻底解决双开问题
        mainBtn.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            isClickingToolbar = true;
            
            const selection = window.getSelection().toString().trim();
            if (selection) {
                // 立即复制
                navigator.clipboard.writeText(selection).catch(err => {
                    console.log("网页端复制受限");
                });

                // 1. [唯一通道] 存入信箱
                // 侧边栏通过监听这个数据的变化来执行任务
                chrome.storage.local.set({ 
                    'sideos_pending_action': { 
                        type: 'toolbar', 
                        text: selection 
                    } 
                });

                // 2. 发送“打开”指令 (唤醒侧边栏)
                chrome.runtime.sendMessage({ action: "openSidePanel" }).catch(()=>{});
                
                // ⚠️ 注意：之前这里有一段 sendMessage "performSearchFromToolbar" 的代码已被删除
                // 这正是导致双重搜索的罪魁祸首

                hideToolbar();
            }
            setTimeout(() => { isClickingToolbar = false; }, 200);
        });

        dock.appendChild(mainBtn);
        shadow.appendChild(dock);
        document.body.appendChild(toolbarContainer);
    }

    function showToolbar(x, y) {
        if (!toolbarContainer) createToolbar();
        const dock = toolbarShadow.querySelector('.sideos-dock');
        
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        let finalX = x + 10;
        let finalY = y + 10;

        if (finalX + 60 > winW) finalX = x - 60;
        if (finalY + 60 > winH) finalY = y - 60;

        toolbarContainer.style.top = finalY + 'px';
        toolbarContainer.style.left = finalX + 'px';
        
        requestAnimationFrame(() => {
            if(dock) dock.classList.add('show');
        });
    }

    function hideToolbar() {
        if (toolbarContainer && toolbarShadow) {
            const dock = toolbarShadow.querySelector('.sideos-dock');
            if (dock) dock.classList.remove('show');
            setTimeout(() => {
                toolbarContainer.style.top = '-9999px';
            }, 250);
        }
    }

    document.addEventListener('mouseup', (e) => {
        if (toolbarMode === 'disable') return;
        if (isClickingToolbar) return;

        setTimeout(() => {
            const selection = window.getSelection();
            const text = selection.toString().trim();
            
            if (text && text.length > 0) {
                try {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    showToolbar(rect.right + window.scrollX, rect.bottom + window.scrollY);
                } catch(err) {
                    showToolbar(e.pageX, e.pageY);
                }
            } else {
                hideToolbar();
            }
        }, 10);
    });

    document.addEventListener('mousedown', (e) => {
        if (toolbarContainer && e.target !== toolbarContainer) {
            hideToolbar();
        }
    });

})();

// ==========================================
// 5. [新增] AI 网站自动填入与搜索脚本
// ==========================================
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAutoSearch);
    } else {
        initAutoSearch();
    }

    function initAutoSearch() {
        chrome.storage.local.get(['sideos_auto_search_payload'], (res) => {
            const payload = res.sideos_auto_search_payload;
            if (!payload || !payload.text) return;

            // 15秒内有效
            if (Date.now() - payload.timestamp > 15000) {
                chrome.storage.local.remove('sideos_auto_search_payload');
                return;
            }

            tryFillAndSend(payload.text);
        });
    }

    function tryFillAndSend(text) {
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (attempts > 20) {
                clearInterval(interval);
                chrome.storage.local.remove('sideos_auto_search_payload');
                return;
            }

            let inputEl = 
                document.querySelector('#prompt-textarea') || 
                document.querySelector('textarea[placeholder*="Ask"]') ||
                document.querySelector('textarea[id*="chat"]') ||
                document.querySelector('div[contenteditable="true"]') ||
                document.querySelector('textarea');
            
            if (inputEl) {
                clearInterval(interval);
                inputEl.focus();

                if (inputEl.tagName === 'DIV') {
                    inputEl.textContent = text;
                } else {
                    inputEl.value = text;
                }
                
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                inputEl.dispatchEvent(new Event('change', { bubbles: true }));

                setTimeout(() => {
                    const sendBtn = 
                        document.querySelector('button[data-testid="send-button"]') ||
                        document.querySelector('button[aria-label*="Send"]') || 
                        document.querySelector('button[class*="send"]');

                    if (sendBtn) {
                        sendBtn.click();
                    } else {
                        inputEl.dispatchEvent(new KeyboardEvent('keydown', {
                            key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
                        }));
                    }
                    chrome.storage.local.remove('sideos_auto_search_payload');
                }, 300);
            }
        }, 500);
    }
})();