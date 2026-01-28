// content.js - 全局滚轮与键盘监听脚本
// 作用：
// 1. 监听 Alt+滚轮 -> 通知侧边栏切换标签
// 2. 监听 Alt+Q -> 通知侧边栏返回主页
// 3. [V1.1.X 新增] 监听侧边栏导航指令 (后退/前进) - [已加固安全校验]

// 1. 滚轮监听 (现有功能)
window.addEventListener('wheel', (e) => {
    // 只有当按住 Alt 键时才触发
    if (e.altKey) {
        e.preventDefault();
        e.stopImmediatePropagation();

        // 发送消息给侧边栏
        try {
            chrome.runtime.sendMessage({
                action: "tabSwitchWheel",
                direction: e.deltaY > 0 ? "next" : "prev"
            });
        } catch (err) {
            // 忽略连接错误
        }
    }
}, { passive: false });

// 2. 键盘监听
window.addEventListener('keydown', (e) => {
    // 检测 Alt + Q (兼容大小写)
    if (e.altKey && (e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q')) {
        // 阻止网页可能存在的默认行为
        e.preventDefault();
        
        // 发送回家指令
        try {
            chrome.runtime.sendMessage({ action: "goHome" });
        } catch (err) {
            // 忽略连接错误
        }
    }
});

// 3. [V1.1.X 新增] 监听侧边栏的导航指令
window.addEventListener('message', function(event) {
    // 安全校验1：确保有数据
    if (!event.data) return;

    // 安全校验2：[新增] 验证消息来源是否为本扩展
    // chrome-extension://<您的扩展ID>
    const expectedOrigin = 'chrome-extension://' + chrome.runtime.id;
    if (event.origin !== expectedOrigin) return;

    if (event.data.type === 'SIDEOS_NAV_BACK') {
        window.history.back();
    } else if (event.data.type === 'SIDEOS_NAV_FORWARD') {
        window.history.forward();
    }
});

// 4. [V1.5 新增] 标签页标题同步机制
// 仅当 content.js 运行在 iframe (Side OS 内部) 时触发
if (window.self !== window.top) {
    const reportTitleToSideOS = () => {
        try {
            // 向父窗口 (Side OS 侧边栏) 发送标题更新消息
            // "*" 允许跨域通信，因为我们在扩展环境相对可控，且只发送标题
            window.parent.postMessage({
                type: 'SIDEOS_UPDATE_TITLE',
                title: document.title || 'Loading...',
                url: window.location.href
            }, '*');
        } catch (e) {
            // 忽略跨域报错
        }
    };

    // 1. 页面加载完成后立即发送一次
    if (document.readyState === 'complete') {
        reportTitleToSideOS();
    } else {
        window.addEventListener('load', reportTitleToSideOS);
    }

    // 2. 监听标题及其变化的 MutationObserver
    const titleTag = document.querySelector('title');
    if (titleTag) {
        const observer = new MutationObserver(reportTitleToSideOS);
        observer.observe(titleTag, { childList: true, subtree: true });
    }
    
    // 3. 兜底：定时检查 (防止 SPA 页面切换标题后 Observer 失效)
    setInterval(() => {
        if(document.title) reportTitleToSideOS();
    }, 2000);
}

// ==========================================
// 5. [V1.1.X 完整版] 划词灵动岛 (Shadow DOM + 信箱机制)
// ==========================================
(function() {
    let toolbarMode = 'disable';
    let toolbarShadow = null;
    let toolbarContainer = null;
    let isClickingToolbar = false;

    // 同步配置
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

        const style = document.createElement('style');
        style.textContent = `
            :host { all: initial; }
            .sideos-dock {
                display: flex; align-items: center; gap: 8px; padding: 6px;
                background: rgba(30, 30, 30, 0.85); backdrop-filter: blur(12px);
                border: 1px solid rgba(255,255,255,0.15); border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.25);
                opacity: 0; transform: translateY(10px) scale(0.95);
                transition: opacity 0.2s, transform 0.2s; pointer-events: auto;
            }
            .sideos-dock.show { opacity: 1; transform: translateY(0) scale(1); }
            .main-btn {
                width: 32px; height: 32px; border-radius: 8px;
                background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: all 0.2s;
            }
            .main-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
            .main-btn img { width: 20px; height: 20px; object-fit: contain; }
        `;
        shadow.appendChild(style);

        const dock = document.createElement('div'); dock.className = 'sideos-dock';
        const mainBtn = document.createElement('div'); mainBtn.className = 'main-btn';
        mainBtn.title = 'Side OS 搜索/AI';
        mainBtn.innerHTML = `<img src="${logoUrl}">`;
        
        // === 核心点击逻辑 ===
        mainBtn.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation(); isClickingToolbar = true;
            const selection = window.getSelection().toString().trim();
            
            if (selection) {
                // 1. 立即复制 (修复复制失败问题)
                navigator.clipboard.writeText(selection).catch(()=>{});

                // 2. 存入信箱 (修复未打开侧边栏时参数失效问题)
                chrome.storage.local.set({ 
                    'sideos_pending_action': { 
                        type: 'toolbar', 
                        text: selection 
                    } 
                }, () => {
                    // 3. 唤醒侧边栏
                    chrome.runtime.sendMessage({ action: "openSidePanel" });
                });

                // 4. 双重保险 (针对已打开情况)
                chrome.runtime.sendMessage({ action: "performSearchFromMenu", text: selection });
                
                hideToolbar();
            }
            setTimeout(() => { isClickingToolbar = false; }, 200);
        });

        dock.appendChild(mainBtn); shadow.appendChild(dock);
        document.body.appendChild(toolbarContainer);
    }

    function showToolbar(x, y) {
        if (!toolbarContainer) createToolbar();
        const dock = toolbarShadow.querySelector('.sideos-dock');
        let finalX = x + 10; let finalY = y + 10;
        if (finalX + 60 > window.innerWidth) finalX = x - 60;
        if (finalY + 60 > window.innerHeight) finalY = y - 60;
        toolbarContainer.style.top = finalY + 'px'; toolbarContainer.style.left = finalX + 'px';
        requestAnimationFrame(() => dock.classList.add('show'));
    }

    function hideToolbar() {
        if (toolbarContainer && toolbarShadow) {
            const dock = toolbarShadow.querySelector('.sideos-dock');
            if(dock) dock.classList.remove('show');
            setTimeout(() => { toolbarContainer.style.top = '-9999px'; }, 250);
        }
    }

    document.addEventListener('mouseup', (e) => {
        if (toolbarMode === 'disable' || isClickingToolbar) return;
        setTimeout(() => {
            const txt = window.getSelection().toString().trim();
            if (txt) {
                try {
                    const range = window.getSelection().getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    showToolbar(rect.right + window.scrollX, rect.bottom + window.scrollY);
                } catch(e) { showToolbar(e.pageX, e.pageY); }
            } else { hideToolbar(); }
        }, 10);
    });
    document.addEventListener('mousedown', (e) => {
        if (toolbarContainer && e.target !== toolbarContainer) hideToolbar();
    });
})();

// ==========================================
// 5. [V1.1.X 优化版] 划词灵动岛 (Shadow DOM) - 修复复制问题
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

    // 获取扩展内置图标 URL
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
            
            /* Logo 图标按钮 */
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

        // 结构
        const dock = document.createElement('div');
        dock.className = 'sideos-dock';
        
        const mainBtn = document.createElement('div');
        mainBtn.className = 'main-btn';
        mainBtn.title = '在 Side OS 中搜索';
        mainBtn.innerHTML = `<img src="${logoUrl}" alt="Side OS">`;
        
        // [核心修复] 点击事件
        mainBtn.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            isClickingToolbar = true;
            
            const selection = window.getSelection().toString().trim();
            if (selection) {
                // [新增] 立即在网页端写入剪贴板
                // 这是最可靠的复制时机，因为它发生在用户点击的瞬间
                navigator.clipboard.writeText(selection).catch(err => {
                    console.log("网页端复制受限，将依赖侧边栏兜底");
                });

                // 1. [修改] 存入统一的 pending_action 信箱，注明来源 "toolbar"
                chrome.storage.local.set({ 
                    'sideos_pending_action': { 
                        type: 'toolbar', 
                        text: selection 
                    } 
                });

                // 2. 发送“打开”指令给 Background
                chrome.runtime.sendMessage({ action: "openSidePanel" });

                // 3. 同时发送直接搜索指令 (为了 SidePanel 已经打开的情况)
                chrome.runtime.sendMessage({
                    action: "performSearchFromToolbar",
                    text: selection
                });
                
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

    // 监听鼠标抬起：显示工具栏
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

    // 监听鼠标按下：隐藏工具栏
    document.addEventListener('mousedown', (e) => {
        if (toolbarContainer && e.target !== toolbarContainer) {
            hideToolbar();
        }
    });

})();