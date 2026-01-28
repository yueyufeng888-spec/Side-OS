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