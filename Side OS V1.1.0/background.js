// background.js - V1.1.0 Chrome & Edge Compatibility Fixed

const MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

// 【核心升级】使用 Map 存储：WindowID -> Port (连接对象)
// 这样我们不仅知道哪个窗口开了，还能向那个窗口发送消息
let panelPorts = new Map();

// ==========================================
// 1. 核心函数定义
// ==========================================

function setupPanelBehavior() {
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
            .catch(err => console.log("Panel behavior error:", err));
    }
}

// background.js - 替换原有的 applyRules 函数

function applyRules(isMobile, callback) {
    const rules = [];
    
    // 规则 1: 移除 iframe 限制 (保持不变)
    rules.push({
        "id": 1,
        "priority": 1,
        "action": {
            "type": "modifyHeaders",
            "responseHeaders": [
                { "header": "x-frame-options", "operation": "remove" },
                { "header": "content-security-policy", "operation": "remove" },
                { "header": "frame-options", "operation": "remove" }
            ]
        },
        "condition": { "urlFilter": "*", "resourceTypes": ["sub_frame"] }
    });

    // 规则 2: 手机 UA 模拟 (核心修改点)
    if (isMobile) {
        rules.push({
            "id": 2,
            "priority": 1,
            "action": {
                "type": "modifyHeaders",
                "requestHeaders": [
                    { "header": "User-Agent", "operation": "set", "value": MOBILE_UA }
                ]
            },
            "condition": { 
                "urlFilter": "*", 
                // [修复] 只修改 iframe 的 UA，让它加载手机版 HTML。
                // 页面内部的 JS/API 请求保持默认（电脑 UA），这通常兼容性最好，且绝不干扰主浏览器。
                "resourceTypes": ["sub_frame"] 
            }
        });
    }

    try {
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [1, 2],
            addRules: rules
        }, () => {
            if (chrome.runtime.lastError) console.error("Rule warn:", chrome.runtime.lastError);
            if (callback) callback();
        });
    } catch (e) { 
        if (callback) callback(); 
    }
}

function createContextMenus() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({ id: "sideos_search", title: "在 Side OS 中搜索 \"%s\"", contexts: ["selection"] });
        chrome.contextMenus.create({ id: "sideos_toggle", title: "打开 Side OS 侧边栏", contexts: ["page", "frame", "link", "image", "action"] });
    });
}

function refreshMenuState(windowId) {
    if (!windowId || windowId === -1 || windowId === chrome.windows.WINDOW_ID_NONE) return;
    
    // 检查 Map 中是否有这个窗口的连接
    const isOpen = panelPorts.has(windowId);
    
    chrome.contextMenus.update("sideos_toggle", {
        title: isOpen ? "关闭 Side OS 侧边栏" : "打开 Side OS 侧边栏"
    }, () => { if (chrome.runtime.lastError) {} });
}

// 兼容性关闭逻辑：混合策略
function executeSmartClose(windowId, tab) {
    // 策略 A: 优先通过 Port 发送 window.close() 指令 (Chrome 必须)
    const port = panelPorts.get(windowId);
    if (port) {
        try {
            port.postMessage({ action: "forceClose" });
        } catch (e) { console.log("Port msg failed", e); }
    }

    // 策略 B: 延迟执行权限禁用 (Edge 必须，Chrome 作为兜底)
    // 延迟 100ms 避免与 window.close() 冲突
    setTimeout(() => {
        // 如果能拿到具体 tab，就操作 tab
        if (tab && tab.id) {
            toggleSidePanelPermission(tab.id);
        } else {
            // 否则尝试获取当前窗口的活动 tab
            chrome.tabs.query({ active: true, windowId: windowId }, (tabs) => {
                if (tabs && tabs.length > 0) toggleSidePanelPermission(tabs[0].id);
            });
        }
    }, 100);
}

// 辅助：权限切换 (先禁再开)
function toggleSidePanelPermission(tabId) {
    chrome.sidePanel.setOptions({ tabId: tabId, enabled: false }, () => {
        setTimeout(() => {
            chrome.sidePanel.setOptions({ tabId: tabId, enabled: true });
        }, 200);
    });
}

function handleMenuClick(info, windowId, tab) {
    if (info.menuItemId === "sideos_search") {
        if (chrome.sidePanel && chrome.sidePanel.open) chrome.sidePanel.open({ windowId: windowId }).catch(() => {});
        setTimeout(() => {
            chrome.runtime.sendMessage({ action: "performSearchFromMenu", text: info.selectionText }).catch(() => {});
        }, 300);

    } else if (info.menuItemId === "sideos_toggle") {
        const isOpen = panelPorts.has(windowId);
        
        if (isOpen) {
            // === 执行混合关闭 ===
            executeSmartClose(windowId, tab);
        } else {
            // === 执行打开 ===
            if (chrome.sidePanel && chrome.sidePanel.open) {
                chrome.sidePanel.open({ windowId: windowId }).catch(console.error);
            }
        }
    }
}

// ==========================================
// 2. 事件监听
// ==========================================

chrome.runtime.onInstalled.addListener(() => {
    setupPanelBehavior();
    applyRules(false, null);
    createContextMenus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    let targetWindowId = tab ? tab.windowId : null;
    if (targetWindowId === null) {
        chrome.windows.getLastFocused((win) => { if (win) handleMenuClick(info, win.id, tab); });
    } else {
        handleMenuClick(info, targetWindowId, tab);
    }
});

// 【核心升级】监听长连接，存储 Port 对象
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "sideos_lifecycle") {
        let registeredWindowId = null;

        port.onMessage.addListener((msg) => {
            if (msg.type === "register" && msg.windowId) {
                registeredWindowId = msg.windowId;
                // 存入 Map
                panelPorts.set(registeredWindowId, port);
                refreshMenuState(registeredWindowId);
            }
        });

        port.onDisconnect.addListener(() => {
            if (registeredWindowId) {
                // 从 Map 移除
                panelPorts.delete(registeredWindowId);
                refreshMenuState(registeredWindowId);
            }
        });
    }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE || windowId === -1) return;
    refreshMenuState(windowId);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "enableMobile") {
        applyRules(true, () => sendResponse({status: "Mobile Enabled"}));
        return true; 
    } else if (request.action === "disableMobile") {
        applyRules(false, () => sendResponse({status: "PC Enabled"}));
        return true; 
    } else if (request.action === "openSidePanel") {
        // [新增] 接收来自网页的“打开侧边栏”指令
        // 注意：Chrome 限制此 API 必须在用户交互上下文中调用。
        // 点击网页内的 ShadowDOM 按钮属于用户交互，通常允许触发。
        if (chrome.sidePanel && chrome.sidePanel.open) {
            // 获取发送消息的标签页所在的窗口ID
            const winId = sender.tab.windowId;
            chrome.sidePanel.open({ windowId: winId }).catch(err => {
                console.warn("尝试自动打开侧边栏失败 (可能是浏览器限制):", err);
            });
        }
        return false;
    }
});