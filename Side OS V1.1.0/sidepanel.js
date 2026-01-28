// sidepanel.js - V1.1.0 (Independent Startup Mode & Tab Isolation)

// 1. 获取当前侧边栏所在的窗口 ID，保持生命周期
chrome.windows.getCurrent((currentWindow) => {
    if (!currentWindow || !currentWindow.id) return;
    const winId = currentWindow.id;
    const keepAlivePort = chrome.runtime.connect({ name: "sideos_lifecycle" });
    keepAlivePort.postMessage({ type: "register", windowId: winId });
    keepAlivePort.onMessage.addListener((msg) => {
        if (msg.action === "forceClose") window.close();
    });
});

document.addEventListener('DOMContentLoaded', function() {

    // === Views & Elements ===
    const desktopView = document.getElementById('desktop-view');
    const settingsView = document.getElementById('settings-view');
    const browserView = document.getElementById('browser-view');
    
    // Containers
    const webviewsContainer = document.getElementById('webviews-container');
    const browserTabsBar = document.getElementById('browser-tabs-bar');
    const tabAddBtn = document.getElementById('tab-add-btn');
    const appPageContainer = document.getElementById('app-page-container');
    const paginationDots = document.getElementById('pagination-dots');
    const dragGhost = document.getElementById('drag-ghost');
    
    // Category Elements
    const categoryFixedBtn = document.getElementById('fixed-all-pill');
    const categoryScrollContainer = document.getElementById('category-scroll');
    const categoryAddBtn = document.getElementById('category-add-btn');
    const appCategoryInput = document.getElementById('app-category-input'); 

    // Widget Elements
    const widgetContainer = document.getElementById('widget-container');
    const widgetTime = document.getElementById('widget-time');
    const widgetDate = document.getElementById('widget-date');
    const widgetWeather = document.getElementById('widget-weather');
    const weatherIcon = document.getElementById('weather-icon');
    const weatherTemp = document.getElementById('weather-temp');

    // Header & Modal Elements
    const headerAddBtn = document.getElementById('header-add-btn');
    const headerSettingsBtn = document.getElementById('header-settings-btn');
    const headerDoneBtn = document.getElementById('header-done-btn'); 
    const closeSettingsBtn = document.getElementById('close-settings-btn'); 
    const modalOverlay = document.getElementById('universal-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalForm = document.getElementById('modal-form-content');
    const modalMsg = document.getElementById('modal-msg-content');
    const qrContainer = document.getElementById('qr-container');
    const qrImg = document.getElementById('qr-img');
    const qrUrlText = document.getElementById('qr-url-text');
    const appNameInput = document.getElementById('app-name-input');
    const appUrlInput = document.getElementById('app-url-input');
    const appOpenModeInput = document.getElementById('app-open-mode-input');
    const appStartupModeInput = document.getElementById('app-startup-mode-input'); // 界面模式
    const appIconInput = document.getElementById('app-icon-input');
    const appIconFile = document.getElementById('app-icon-file');
    const triggerUploadBtn = document.getElementById('trigger-upload-btn');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');

    // Search & Settings Elements
    const homeSearchInput = document.getElementById('home-search-input');
    const homeSearchIconBtn = document.getElementById('home-search-icon-btn');
    const homeSearchGo = document.getElementById('home-search-go');
    const quickEngineMenu = document.getElementById('quick-engine-menu');
    const navEngineIcon = document.getElementById('nav-engine-icon');
    const navQrBtn = document.getElementById('nav-qr-btn');
    const urlInput = document.getElementById('url-input');
    const browserSearchGo = document.getElementById('browser-search-go');
    
    const showWidgetSelect = document.getElementById('show-widget-select'); 
    const weatherCityInput = document.getElementById('weather-city-input'); 
    const startupBehaviorSelect = document.getElementById('startup-behavior-select'); 
    const defaultModeSelect = document.getElementById('default-mode-select');
    const openModeSelect = document.getElementById('open-mode-select'); 
    const independentModeSelect = document.getElementById('independent-mode-select');
    // independentStartupSelect 在 initSettings 中获取
    const tabStyleSelect = document.getElementById('tab-style-select'); 
    const engineSelect = document.getElementById('engine-select');
    const themeSelect = document.getElementById('theme-select');
    const wallpaperSelect = document.getElementById('wallpaper-select');
    const backupExportBtn = document.getElementById('backup-export-btn');
    const backupImportBtn = document.getElementById('backup-import-btn');
    const backupFileInput = document.getElementById('backup-file-input');
    const helpShortcutKey = document.getElementById('help-shortcut-key');

    // WebDAV Cloud Sync Elements
    const webdavConfigPanel = document.getElementById('webdav-config-panel');
    const toggleConfigBtn = document.getElementById('toggle-webdav-config');
    const webdavUrlInput = document.getElementById('webdav-url');
    const webdavUserInput = document.getElementById('webdav-user');
    const webdavPassInput = document.getElementById('webdav-pass');
    const webdavRemember = document.getElementById('webdav-remember');
    const webdavSaveBtn = document.getElementById('webdav-save-btn');
    
    const uploadBtn = document.getElementById('cloud-upload-btn');
    const downloadBtn = document.getElementById('cloud-download-btn');
    const statusMsg = document.getElementById('cloud-status-msg');
    
    // Auto Backup Elements
    const autoBackupToggle = document.getElementById('auto-backup-toggle');
    const autoBackupInterval = document.getElementById('auto-backup-interval');
    const lastAutoBackupTime = document.getElementById('last-auto-backup-time');

    // Dock Buttons
    const navHome = document.getElementById('nav-home');
    const modeSwitchBtn = document.getElementById('mode-switch-btn');
    const modeSwitchIcon = document.getElementById('mode-switch-icon');
    const modeSwitchText = document.getElementById('mode-switch-text');
    const navOpenNew = document.getElementById('nav-open-new'); 
    const navRefresh = document.getElementById('nav-refresh');
    const navPrevTab = document.getElementById('nav-prev-tab');
    const navNextTab = document.getElementById('nav-next-tab');
    const dockSettingsContainer = document.getElementById('dock-settings-container');

    // Custom Wallpaper & Theme Elements
    const customWallpaperUpload = document.getElementById('custom-wallpaper-upload');
    const uploadWallpaperBtn = document.getElementById('upload-wallpaper-btn');
    const customThemePanel = document.getElementById('custom-theme-panel');
    const customColorAccent = document.getElementById('custom-color-accent');
    const customColorBg = document.getElementById('custom-color-bg');
    const customColorPanel = document.getElementById('custom-color-panel');
    const customColorText = document.getElementById('custom-color-text');
    const resetCustomThemeBtn = document.getElementById('reset-custom-theme-btn');

    // State Variables
    let isEditing = false;
    let isDragging = false;
    let dragSrcId = null;           // For Apps
    let dragCategorySrcId = null;   // For Categories
    let longPressTimer = null;
    let didTriggerLongPress = false; 
    let currentModalAction = null;
    let aiConfigTarget = 'context'; // [新增] 记忆当前正在配置的是 "toolbar" 还是 "context" 
    let currentTargetId = null; 
    let currentUploadedIcon = null;
    let pendingCloudData = null; 
    let APPS_PER_PAGE = 20; 
    let autoScrollSpeed = 0;
    let autoScrollFrame = null;
    let activeTabs = {}; 
    let currentActiveId = null;
    let dragTargetCategoryId = null;
    let autoBackupCheckInterval = null;

    // Categories
    const DEFAULT_CATEGORIES = [
        { id: 'default', name: '常用' },
        { id: 'work', name: '办公' },
        { id: 'entertainment', name: '娱乐' },
        { id: 'tools', name: '工具' },
        { id: 'reading', name: '阅读' },
        { id: 'dev', name: '开发' }
    ];
    let currentCategory = 'all';

    // === PRESET AI LIST ===
    const PRESET_AIS = [
        { name: "ChatGPT", url: "https://chatgpt.com/" },
        { name: "DeepSeek", url: "https://chat.deepseek.com/" },
        { name: "Claude", url: "https://claude.ai/" },
        { name: "Gemini", url: "https://gemini.google.com/" },
        { name: "Perplexity", url: "https://www.perplexity.ai/" },
        { name: "秘塔 AI", url: "https://metaso.cn/" },
        { name: "Kimi", url: "https://kimi.moonshot.cn/" },
        { name: "豆包", url: "https://www.doubao.com/" },
        { name: "HuggingChat", url: "https://huggingface.co/chat/" }
    ];

    const ICON_MOBILE = "M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z";
    const ICON_PC = "M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z";

    // === Helpers ===
    function getCategories() { return JSON.parse(localStorage.getItem('sideos_categories_v2')) || DEFAULT_CATEGORIES; }
    function saveCategories(cats) { localStorage.setItem('sideos_categories_v2', JSON.stringify(cats)); renderCategories(); updateModalCategoryOptions(); }
    function switchCategory(id) { currentCategory = id; renderCategories(); renderApps(); appPageContainer.scrollLeft = 0; }

    // === Switching Logic ===
    function performHistoryNav(action) {
        if (!currentActiveId || !activeTabs[currentActiveId]) return;
        const tab = activeTabs[currentActiveId];
        if (tab.frame && tab.frame.contentWindow) tab.frame.contentWindow.postMessage({ type: action === 'back' ? 'SIDEOS_NAV_BACK' : 'SIDEOS_NAV_FORWARD' }, '*');
    }
    function performTabSwitch(direction) {
        if (browserView.style.display !== 'flex') return;
        const tabs = Array.from(document.querySelectorAll('.browser-tab'));
        const activeIdx = tabs.findIndex(el => el.classList.contains('active'));
        if (activeIdx !== -1) {
            if (direction === 'next' && activeIdx < tabs.length - 1) tabs[activeIdx + 1].click();
            else if (direction === 'prev' && activeIdx > 0) tabs[activeIdx - 1].click();
        }
    }
    function performCategorySwitch(direction) {
        const cats = getCategories(); const catList = ['all', ...cats.map(c => c.id)]; const currentIdx = catList.indexOf(currentCategory);
        if (currentIdx !== -1) {
            let newIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
            if (newIdx < 0) newIdx = 0; if (newIdx >= catList.length) newIdx = catList.length - 1;
            if (newIdx !== currentIdx) { switchCategory(catList[newIdx]); const targetBtn = document.querySelector(`.category-pill[data-id="${catList[newIdx]}"]`); if(targetBtn && catList[newIdx] !== 'all') targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }
        }
    }

    window.addEventListener('wheel', (e) => { if (e.altKey && !isEditing) { e.preventDefault(); const direction = e.deltaY > 0 ? 'next' : 'prev'; if (browserView.style.display === 'flex') performTabSwitch(direction); else performCategorySwitch(direction); } }, { passive: false });
    
    // === Title Sync Listener ===
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SIDEOS_UPDATE_TITLE') {
            const tabId = Object.keys(activeTabs).find(id => activeTabs[id].frame.contentWindow === event.source);
            
            if (tabId) {
                const tab = activeTabs[tabId];
                const newTitle = event.data.title;
                if (newTitle && tab.name !== newTitle && !tab.lockTitle) {
                    tab.name = newTitle;
                    const titleEl = tab.btn.querySelector('.tab-title-text');
                    if (titleEl) titleEl.textContent = newTitle;
                    tab.btn.title = newTitle;
                    const fallback = tab.btn.querySelector('.icon-text-fallback');
                    if (fallback) {
                        const char = newTitle.trim().charAt(0).toUpperCase();
                        fallback.textContent = (char.match(/[A-Z0-9\u4e00-\u9fa5]/) ? char : "🔗");
                    }
                    if (currentActiveId === tabId && urlInput && event.data.url) {
                        urlInput.value = event.data.url;
                    }
                    saveSession();
                }
            }
        }
    });

    // === Runtime Message Listener ===
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'tabSwitchWheel') performTabSwitch(msg.direction);
        else if (msg.action === 'goHome') goHome();
        else if (msg.action === 'performSearchFromMenu' && msg.text) {
            window.focus();
            const mode = localStorage.getItem('sideos_context_mode') || 'search';
            // [修改] 支持 copy_open 和 auto_search 两种模式
            if (mode === 'copy_open' || mode === 'auto_search') {
                const robustCopy = (text) => {
                    navigator.clipboard.writeText(text).then(() => {
                        if (typeof showStatus === 'function') showStatus("✅ 已复制", 2000);
                    }).catch(() => {});
                };
                robustCopy(msg.text);

                // [新增] 如果是自动搜索模式，埋下暗号 payload
                if (mode === 'auto_search') {
                    chrome.storage.local.set({ 
                        'sideos_auto_search_payload': { text: msg.text, timestamp: Date.now() } 
                    });
                }

                // 读取目标 URL (复用原有逻辑)
                let targetUrl = '';
                if (msg.action === 'performSearchFromToolbar') {
                     targetUrl = localStorage.getItem('sideos_selection_toolbar_url') || 'https://chatgpt.com/';
                } else {
                     targetUrl = localStorage.getItem('sideos_context_url') || 'https://chatgpt.com/';
                }
                
                // 查找 AI 名称并跳转
                let targetName = "AI Assistant";
                const presets = PRESET_AIS;
                const customs = JSON.parse(localStorage.getItem('sideos_custom_ais') || '[]');
                const match = [...customs, ...presets].find(ai => ai.url === targetUrl);
                if(match) targetName = match.name;
                
                loadUrl(targetUrl, targetName, null, true);
                
            } else {
                // ... (原有的 search 逻辑保持不变) ...
                const engines = getEngines(); 
                const currentKey = localStorage.getItem('sideos_engine') || 'baidu'; 
                const eng = engines[currentKey];
                let searchUrl = eng ? eng.url + encodeURIComponent(msg.text) : "https://www.baidu.com/s?wd=" + encodeURIComponent(msg.text);
                loadUrl(searchUrl, msg.text, null, false); 
            }
        }
        else if (msg.action === 'performSearchFromToolbar' && msg.text) {
             // [新增] 处理来自划词工具栏的请求
             window.focus();
             // 强制读取工具栏的设置
             const mode = localStorage.getItem('sideos_selection_toolbar_mode') || 'disable';
             
             // [修改] 支持 copy_open 和 auto_search 两种模式
            if (mode === 'copy_open' || mode === 'auto_search') {
                const robustCopy = (text) => {
                    navigator.clipboard.writeText(text).then(() => {
                        if (typeof showStatus === 'function') showStatus("✅ 已复制", 2000);
                    }).catch(() => {});
                };
                robustCopy(msg.text);

                // [新增] 如果是自动搜索模式，埋下暗号 payload
                if (mode === 'auto_search') {
                    chrome.storage.local.set({ 
                        'sideos_auto_search_payload': { text: msg.text, timestamp: Date.now() } 
                    });
                }

                // 读取目标 URL (复用原有逻辑)
                let targetUrl = '';
                if (msg.action === 'performSearchFromToolbar') {
                     targetUrl = localStorage.getItem('sideos_selection_toolbar_url') || 'https://chatgpt.com/';
                } else {
                     targetUrl = localStorage.getItem('sideos_context_url') || 'https://chatgpt.com/';
                }
                
                // 查找 AI 名称并跳转
                let targetName = "AI Assistant";
                const presets = PRESET_AIS;
                const customs = JSON.parse(localStorage.getItem('sideos_custom_ais') || '[]');
                const match = [...customs, ...presets].find(ai => ai.url === targetUrl);
                if(match) targetName = match.name;
                
                loadUrl(targetUrl, targetName, null, true);
                
            } else {
                // ... (原有的 search 逻辑保持不变) ...
                const engines = getEngines(); 
                const currentKey = localStorage.getItem('sideos_engine') || 'baidu'; 
                const eng = engines[currentKey];
                let searchUrl = eng ? eng.url + encodeURIComponent(msg.text) : "https://www.baidu.com/s?wd=" + encodeURIComponent(msg.text);
                loadUrl(searchUrl, msg.text, null, false); 
            }
        }
    });

    window.addEventListener('keydown', (e) => { if (e.altKey && e.code === 'KeyQ') { e.preventDefault(); goHome(); } });

    // === Standard Logic ===
    function updateTime() {
        const now = new Date(); widgetTime.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const dayMap = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]; widgetDate.textContent = `${now.getMonth() + 1}月${now.getDate()}日 ${dayMap[now.getDay()]}`;
    }
    function fetchWeatherData(lat, lon) {
         fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`).then(res => res.json()).then(data => {
            let icon = "☀️"; const c = data.current_weather.weathercode;
            if (c > 1 && c < 4) icon = "☁️"; else if (c >= 45 && c < 80) icon = "🌧️"; else if (c >= 80) icon = "⛈️";
            weatherIcon.textContent = icon; weatherTemp.textContent = `${Math.round(data.current_weather.temperature)}°`;
         }).catch(() => { weatherIcon.textContent = "🌍"; weatherTemp.textContent = "--"; });
    }
    function updateWeather() {
        weatherTemp.textContent = ".."; const manualCity = localStorage.getItem('sideos_weather_city');
        if (manualCity) {
            fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(manualCity)}&count=1&language=zh&format=json`).then(res => res.json()).then(data => {
                if (data.results && data.results.length > 0) fetchWeatherData(data.results[0].latitude, data.results[0].longitude);
                else { weatherIcon.textContent = "❓"; weatherTemp.textContent = ""; }
            }).catch(() => weatherIcon.textContent = "📶");
        } else { weatherIcon.textContent = "🏙️"; weatherTemp.textContent = "设置城市"; }
    }
    setInterval(updateTime, 1000); updateTime(); updateWeather(); setInterval(updateWeather, 1800000);
    widgetWeather.addEventListener('click', () => { desktopView.style.display = 'none'; settingsView.style.display = 'flex'; setTimeout(() => { weatherCityInput.focus(); weatherCityInput.select(); }, 100); });

    function createSafeIcon(src, appName, parentSquircle) {
        const wrapper = document.createElement('div'); wrapper.className = 'icon-wrapper';
        const textFallback = document.createElement('div'); textFallback.className = 'icon-text-fallback';
        const char = appName ? appName.trim().charAt(0).toUpperCase() : "🌐";
        textFallback.textContent = (char.match(/[A-Z0-9\u4e00-\u9fa5]/) ? char : "🔗");
        wrapper.appendChild(textFallback);
        if (src && (src.startsWith('http') || src.startsWith('data:'))) {
            if (parentSquircle) parentSquircle.classList.add('loading');
            const img = document.createElement('img'); img.className = 'icon-img-content'; img.loading = "lazy"; img.draggable = false;
            img.onload = () => { if (parentSquircle) parentSquircle.classList.remove('loading'); img.classList.add('loaded'); textFallback.style.opacity = '0'; };
            img.onerror = () => { if (parentSquircle) parentSquircle.classList.remove('loading'); img.remove(); }; 
            img.src = src; wrapper.appendChild(img);
        } else if (src && !src.startsWith('http')) { textFallback.textContent = src; }
        return wrapper;
    }

    function initTabsUI() {
        tabAddBtn.addEventListener('mouseenter', () => {}); tabAddBtn.addEventListener('mouseleave', () => {});
    }

    // === Session Management (Updated for Mode) ===
    function saveSession() {
        if ((localStorage.getItem('sideos_startup_behavior') || 'restore') !== 'restore') return;
        const tabs = []; let activeIndex = -1;
        document.querySelectorAll('.browser-tab').forEach((el, index) => { 
            if (el.classList.contains('active')) activeIndex = index; 
            const entry = Object.values(activeTabs).find(t => t.btn === el); 
            if (entry) { 
                tabs.push({ 
                    url: entry.url, 
                    name: entry.name, 
                    icon: entry.icon, 
                    lockTitle: entry.lockTitle,
                    mode: entry.mode || 'pc' // 保存时记录模式
                }); 
            }
        });
        localStorage.setItem('sideos_session', JSON.stringify({ view: browserView.style.display === 'flex' ? 'browser' : 'desktop', tabs: tabs, activeIndex: activeIndex }));
    }
    
    function restoreSession() {
        const raw = localStorage.getItem('sideos_session'); if (!raw) return;
        try { 
            const session = JSON.parse(raw); 
            if (session.view === 'browser' && session.tabs) {
                session.tabs.forEach((t, i) => { 
                    // 恢复时读取模式，默认为 pc
                    openTab(t.url, t.name, t.icon, (i === session.activeIndex), t.lockTitle || false, t.mode || 'pc'); 
                });
            }
        } catch(e) {}
    }

    headerAddBtn.addEventListener('click', () => openModal('add'));
    headerSettingsBtn.addEventListener('click', () => { desktopView.style.display = 'none'; settingsView.style.display = 'flex'; });
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => { settingsView.style.display = 'none'; desktopView.style.display = 'flex'; });

    function generateId() { return 'tab_' + Date.now() + '_' + Math.floor(Math.random()*1000); }
    
    // === Tab Management (Modified for Mode Isolation) ===
    function openTab(url, name, icon, switchToStart = true, lockTitle = false, mode = 'pc') {
        desktopView.style.display = 'none'; settingsView.style.display = 'none'; browserView.style.display = 'flex'; 
        
        let finalUrl = url; 
        // 手机模式下B站自动跳转m站
        if (mode === 'mobile' && finalUrl.includes('www.bilibili.com')) {
            finalUrl = finalUrl.replace('www.', 'm.');
        }

        const id = generateId(); 
        const iframe = document.createElement('iframe'); 
        iframe.src = finalUrl; iframe.style.display = 'none'; 
        iframe.allow = "clipboard-read; clipboard-write; microphone; camera; geolocation";
        webviewsContainer.appendChild(iframe);

        const tabEl = document.createElement('div'); tabEl.className = 'browser-tab'; tabEl.title = name || url; 
        const infoDiv = document.createElement('div'); infoDiv.className = 'tab-info';
        const iconDiv = document.createElement('div'); iconDiv.className = 'tab-icon'; 
        iconDiv.appendChild(createSafeIcon(icon, name)); infoDiv.appendChild(iconDiv);
        const titleSpan = document.createElement('span'); titleSpan.className = 'tab-title-text'; titleSpan.textContent = name || "New Tab"; infoDiv.appendChild(titleSpan);
        const closeBtn = document.createElement('div'); closeBtn.className = 'tab-close-btn'; closeBtn.textContent = '×';
        tabEl.appendChild(infoDiv); tabEl.appendChild(closeBtn);
        tabEl.addEventListener('click', (e) => { if(!e.target.classList.contains('tab-close-btn')) switchTab(id); });
        closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeTab(id); });
        browserTabsBar.insertBefore(tabEl, null);
        
        // 保存 Mode 到 activeTabs
        activeTabs[id] = { id, url: finalUrl, name, icon, frame: iframe, btn: tabEl, lockTitle: lockTitle, mode: mode };
        
        if (switchToStart) switchTab(id); 
        saveSession(); 
    }

    function switchTab(id) {
        if (!activeTabs[id]) return; 
        if(desktopView) desktopView.style.display = 'none'; if(settingsView) settingsView.style.display = 'none'; if(browserView) browserView.style.display = 'flex';
        currentActiveId = id; const tab = activeTabs[id];
        Object.values(activeTabs).forEach(t => { if(t.frame) t.frame.style.display = 'none'; if(t.btn) t.btn.classList.remove('active'); });
        if(tab.frame) tab.frame.style.display = 'block'; if(tab.btn) tab.btn.classList.add('active'); 
        if(urlInput) urlInput.value = tab.url; if(tab.btn) tab.btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); 
        
        // === 切换标签时，恢复该标签的 UA 模式 ===
        const targetMode = tab.mode || 'pc';
        switchUA(targetMode);
        updateModeBtnUI(targetMode);

        saveSession();
    }

    function closeTab(id) {
        if (!activeTabs[id]) return; const tab = activeTabs[id]; tab.frame.remove(); tab.btn.remove(); delete activeTabs[id];
        if (currentActiveId === id) { const remaining = Object.keys(activeTabs); if (remaining.length > 0) switchTab(remaining[remaining.length - 1]); else goHome(); } saveSession();
    }
    function goHome() { 
        if(desktopView) desktopView.style.display = 'flex'; if(browserView) browserView.style.display = 'none'; if(settingsView) settingsView.style.display = 'none'; 
        document.querySelectorAll('.browser-tab').forEach(el => el.classList.remove('active'));
        setTimeout(recalculateGrid, 10); saveSession(); 
    }
    tabAddBtn.addEventListener('click', goHome);
    
    function getFaviconUrl(url) { try { const domain = new URL(url).hostname; return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`; } catch(e) { return ""; } }
    
    // 更新 loadUrl，支持传递 mode 参数
    function loadUrl(url, name = null, icon = null, lockTitle = false, mode = 'pc') { 
        if (!name) name = "New Tab"; 
        if (!icon) icon = getFaviconUrl(url) || ""; 
        openTab(url, name, icon, true, lockTitle, mode); 
    }

    const defaultEngines = { baidu: { name: "百度", url: "https://www.baidu.com/s?wd=" }, google: { name: "Google", url: "https://www.google.com/search?q=" },googleai: { name: "Google Ai模式", url: "https://www.google.com/search?sourceid=chrome&udm=50&aep=48&q=" }, bing: { name: "必应", url: "https://cn.bing.com/search?q=" },duckduckgo: { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=" }, github: { name: "GitHub", url: "https://github.com/search?q=" },douyin: { name: "抖音", url: "https://www.douyin.com/search/" },bilibili: { name: "Bilibili", url: "https://search.bilibili.com/all?keyword=" } };
    function getEngines() { return JSON.parse(localStorage.getItem('sideos_engines_v1')) || defaultEngines; }
    function saveEngines(engines) { localStorage.setItem('sideos_engines_v1', JSON.stringify(engines)); renderEngineOptions(); }
    function renderEngineOptions() {
        const engines = getEngines(); engineSelect.innerHTML = ''; quickEngineMenu.innerHTML = ''; 
        let hasCustom = false;
        Object.keys(engines).forEach(key => {
            if (key.startsWith('custom_')) hasCustom = true;
            const eng = engines[key]; const option = document.createElement('option'); option.value = key; option.textContent = eng.name; engineSelect.appendChild(option);
            const menuItem = document.createElement('div'); menuItem.className = 'quick-menu-item'; menuItem.setAttribute('data-engine', key);
            let iconUrl = getFaviconUrl(eng.url);
            if (key === 'baidu') iconUrl = "https://www.baidu.com/favicon.ico"; if (key === 'google') iconUrl = "https://www.google.com/favicon.ico";
            const iconEl = createSafeIcon(iconUrl, eng.name); iconEl.style.width = "16px"; iconEl.style.height = "16px"; if(iconEl.querySelector('.icon-text-fallback')) iconEl.querySelector('.icon-text-fallback').style.fontSize="12px";
            menuItem.appendChild(iconEl); menuItem.appendChild(document.createTextNode(" " + eng.name));
            menuItem.addEventListener('click', () => { setEngine(key); quickEngineMenu.style.display = 'none'; }); quickEngineMenu.appendChild(menuItem);
        });
        const divider = document.createElement('option'); divider.disabled = true; divider.textContent = '──────────'; engineSelect.appendChild(divider);
        const addOpt = document.createElement('option'); addOpt.value = 'add_custom_trigger'; addOpt.textContent = '➕ 添加自定义...'; engineSelect.appendChild(addOpt);
        if (hasCustom) { const delOpt = document.createElement('option'); delOpt.value = 'del_custom_trigger'; delOpt.textContent = '➖ 删除自定义...'; engineSelect.appendChild(delOpt); }
        const current = localStorage.getItem('sideos_engine') || 'baidu'; if (engines[current]) engineSelect.value = current; else engineSelect.value = Object.keys(engines)[0];
    }
    function setEngine(key) { localStorage.setItem('sideos_engine', key); engineSelect.value = key; updateEngineIcon(key); }
    function updateEngineIcon(key) { 
        const eng = getEngines()[key]; if(eng) { 
            let iconUrl = getFaviconUrl(eng.url); if (key === 'baidu') iconUrl = "https://www.baidu.com/favicon.ico"; if (key === 'google') iconUrl = "https://www.google.com/favicon.ico";
            const renderTo = (container) => { container.innerHTML = ''; const safe = createSafeIcon(iconUrl, eng.name); safe.style.width = "20px"; safe.style.height = "20px"; if(safe.querySelector('.icon-text-fallback')) safe.querySelector('.icon-text-fallback').style.fontSize = "16px"; container.appendChild(safe); };
            renderTo(navEngineIcon); renderTo(homeSearchIconBtn); homeSearchInput.placeholder = `Search ${eng.name}...`; 
        } 
    }

    if (navQrBtn) navQrBtn.addEventListener('click', () => { if (urlInput.value) { qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(urlInput.value)}`; qrUrlText.textContent = urlInput.value; openModal('qr'); } });
    navRefresh.addEventListener('click', () => { if(currentActiveId && activeTabs[currentActiveId]) activeTabs[currentActiveId].frame.src = activeTabs[currentActiveId].frame.src; });
    navOpenNew.addEventListener('click', () => { if(currentActiveId && activeTabs[currentActiveId]) window.open(activeTabs[currentActiveId].frame.src, '_blank'); });
    navHome.addEventListener('click', goHome); 
    navPrevTab.addEventListener('click', () => performHistoryNav('back')); 
    navNextTab.addEventListener('click', () => performHistoryNav('forward'));

    // === WebDAV Logic ===
    function showStatus(msg, clearAfter = 3000) {
        if(statusMsg) statusMsg.textContent = msg;
        if (clearAfter && statusMsg) setTimeout(() => statusMsg.textContent = '', clearAfter);
    }

    const SEC_KEY = "SideOS_Secure_Key_v1"; 
    function encryptPass(text) {
        if (!text) return ""; try { let result = ""; for (let i = 0; i < text.length; i++) { result += String.fromCharCode(text.charCodeAt(i) ^ SEC_KEY.charCodeAt(i % SEC_KEY.length)); } return btoa(result); } catch (e) { return text; }
    }
    function decryptPass(encoded) {
        if (!encoded) return ""; try { let text = atob(encoded); let result = ""; for (let i = 0; i < text.length; i++) { result += String.fromCharCode(text.charCodeAt(i) ^ SEC_KEY.charCodeAt(i % SEC_KEY.length)); } return result; } catch (e) { return encoded; }
    }

    function initWebDAV() {
        const saved = JSON.parse(localStorage.getItem('sideos_webdav_config')) || {};
        if (saved.url) webdavUrlInput.value = saved.url;
        if (saved.user) webdavUserInput.value = saved.user;
        if (saved.pass) webdavPassInput.value = decryptPass(saved.pass);
        if (saved.url && saved.user && saved.pass) { if(webdavConfigPanel) webdavConfigPanel.classList.remove('show'); } else { if(webdavConfigPanel) webdavConfigPanel.classList.add('show'); }
        initAutoBackupUI();
    }

    if(toggleConfigBtn) {
        toggleConfigBtn.addEventListener('click', () => { if(webdavConfigPanel) webdavConfigPanel.classList.toggle('show'); });
    }

    function initAutoBackupUI() {
        if(!autoBackupToggle) return;
        const config = JSON.parse(localStorage.getItem('sideos_auto_backup_config')) || { enabled: false, interval: 6, last: 0 };
        autoBackupToggle.checked = config.enabled;
        
        if (autoBackupInterval) autoBackupInterval.value = config.interval < 6 ? 6 : config.interval;
        if (lastAutoBackupTime) {
            if (config.last > 0) {
                const date = new Date(config.last);
                lastAutoBackupTime.textContent = "上次备份时间：" + date.toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
            } else { lastAutoBackupTime.textContent = '上次备份时间：暂无记录'; }
        }

        autoBackupToggle.addEventListener('change', () => {
            config.enabled = autoBackupToggle.checked; localStorage.setItem('sideos_auto_backup_config', JSON.stringify(config));
            if(config.enabled) checkAutoBackup();
        });

        if(autoBackupInterval) {
            autoBackupInterval.addEventListener('change', () => {
                let val = parseInt(autoBackupInterval.value); if(val < 6) { val = 6; autoBackupInterval.value = 6; }
                config.interval = val; localStorage.setItem('sideos_auto_backup_config', JSON.stringify(config));
            });
        }
        if (autoBackupCheckInterval) clearInterval(autoBackupCheckInterval);
        autoBackupCheckInterval = setInterval(checkAutoBackup, 60000); setTimeout(checkAutoBackup, 3000);
    }

    async function checkAutoBackup() {
        const config = JSON.parse(localStorage.getItem('sideos_auto_backup_config'));
        if (!config || !config.enabled) return;
        const now = Date.now(); const intervalMs = config.interval * 60 * 60 * 1000;
        if (config.last === 0 || (now - config.last > intervalMs)) {
            if(lastAutoBackupTime) lastAutoBackupTime.textContent = "备份中...";
            const success = await executeWebDAVUpload(true); 
            if (success) {
                config.last = Date.now(); localStorage.setItem('sideos_auto_backup_config', JSON.stringify(config));
                if(lastAutoBackupTime) {
                    const date = new Date(config.last);
                    lastAutoBackupTime.textContent = date.toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
                }
            } else { if(lastAutoBackupTime) lastAutoBackupTime.textContent = "备份失败(重试中)"; }
        }
    }

    if(webdavSaveBtn) {
        webdavSaveBtn.addEventListener('click', () => {
            let url = webdavUrlInput.value.trim(); const user = webdavUserInput.value.trim(); const pass = webdavPassInput.value.trim();
            if (!url || !user || !pass) { showStatus("❌ 请填写所有 WebDAV 信息"); return; }
            if (url.includes('jianguoyun.com') && !url.includes('/dav')) { url = url.replace(/\/$/, '') + '/dav/'; webdavUrlInput.value = url; }
            if (!url.endsWith('/')) url += '/';
            const encryptedPass = encryptPass(pass);
            if (webdavRemember.checked) { localStorage.setItem('sideos_webdav_config', JSON.stringify({ url, user, pass: encryptedPass })); } 
            else { sessionStorage.setItem('sideos_webdav_temp', JSON.stringify({ url, user, pass: encryptedPass })); localStorage.removeItem('sideos_webdav_config'); }
            if(webdavConfigPanel) webdavConfigPanel.classList.remove('show'); showStatus("✅ 配置已保存 (加密)");
        });
    }

    function getWebDAVConfig() { 
        let config = null; const local = localStorage.getItem('sideos_webdav_config'); const sess = sessionStorage.getItem('sideos_webdav_temp');
        if (local) config = JSON.parse(local); else if (sess) config = JSON.parse(sess);
        if (config && config.pass) { config.pass = decryptPass(config.pass); } return config;
    }
    
    function getEffectivePaths(baseUrl) {
        if (baseUrl.includes('jianguoyun.com') && baseUrl.endsWith('/dav/')) { return { folderUrl: baseUrl + 'SideOS_Backup/', isJianguoyunRoot: true }; }
        return { folderUrl: baseUrl, isJianguoyunRoot: false };
    }

    function getTimestampName(isAuto) {
        const now = new Date(); const pad = n => String(n).padStart(2,'0');
        const str = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        return `${isAuto ? 'SideOS_AutoBackup_' : 'SideOS_ManualBackup_'}${str}.json`;
    }

    function checkBackupRateLimit() {
        const now = Date.now(); const LIMIT_TIME = 3 * 60 * 1000; const LIMIT_COUNT = 3;
        let stamps = JSON.parse(localStorage.getItem('sideos_backup_rate_limit') || '[]');
        stamps = stamps.filter(t => now - t < LIMIT_TIME);
        if (stamps.length >= LIMIT_COUNT) return false;
        stamps.push(now); localStorage.setItem('sideos_backup_rate_limit', JSON.stringify(stamps));
        return true;
    }

    async function executeWebDAVUpload(isAuto = false) {
        if (!checkBackupRateLimit()) { if(!isAuto) showStatus("⚠️ 备份太频繁，请3分钟后再试"); return false; }
        const cfg = getWebDAVConfig(); if (!cfg) { if(!isAuto) showStatus("❌ 配置丢失"); return false; }
        if(!isAuto) showStatus("正在打包上传...", 0);
        
        const data = {}; for(let i=0; i<localStorage.length; i++){ const k = localStorage.key(i); if(k.startsWith('sideos_')) data[k] = localStorage.getItem(k); }
        const fileContent = JSON.stringify(data, null, 2);
        const auth = btoa(cfg.user + ':' + cfg.pass); const headers = { 'Authorization': 'Basic ' + auth };
        const paths = getEffectivePaths(cfg.url); const fileName = getTimestampName(isAuto); const targetUrl = paths.folderUrl + fileName;

        try {
            if (paths.isJianguoyunRoot) { try { await fetch(paths.folderUrl, { method: 'MKCOL', headers: headers }); } catch(e) {} }
            const res = await fetch(targetUrl, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: fileContent });
            if (res.ok || res.status === 201 || res.status === 204) { 
                if(!isAuto) showStatus("✅ 备份成功：" + fileName.split('_')[2]); else console.log("Auto backup success"); return true;
            } else { throw new Error(`Status: ${res.status}`); }
        } catch (e) {
            console.error(e); if(!isAuto) { let errMsg = e.message; if (errMsg.includes("404")) errMsg = "路径错误(404)"; else if (errMsg.includes("401")) errMsg = "验证失败(401)"; showStatus("❌ 上传失败: " + errMsg); } return false;
        }
    }

    if(uploadBtn) uploadBtn.addEventListener('click', () => executeWebDAVUpload(false));

    async function fetchBackupList() {
        const cfg = getWebDAVConfig(); if (!cfg) throw new Error("No Config");
        const auth = btoa(cfg.user + ':' + cfg.pass); const paths = getEffectivePaths(cfg.url);
        const res = await fetch(paths.folderUrl, { method: 'PROPFIND', headers: { 'Authorization': 'Basic ' + auth, 'Depth': '1' } });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const xmlText = await res.text(); const parser = new DOMParser(); const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const responses = xmlDoc.getElementsByTagName("d:response"); let nodeList = responses.length ? responses : xmlDoc.getElementsByTagName("D:response");

        const files = [];
        for (let i = 0; i < nodeList.length; i++) {
            const hrefEl = nodeList[i].getElementsByTagName("d:href")[0] || nodeList[i].getElementsByTagName("D:href")[0];
            const propStat = nodeList[i].getElementsByTagName("d:propstat")[0] || nodeList[i].getElementsByTagName("D:propstat")[0];
            if (hrefEl && propStat) {
                const href = hrefEl.textContent; if(href.endsWith('/')) continue;
                const lastModEl = propStat.getElementsByTagName("d:getlastmodified")[0] || propStat.getElementsByTagName("D:getlastmodified")[0];
                const lastMod = lastModEl ? lastModEl.textContent : "";
                const lenEl = propStat.getElementsByTagName("d:getcontentlength")[0] || propStat.getElementsByTagName("D:getcontentlength")[0];
                const size = lenEl ? parseInt(lenEl.textContent) : 0;
                const decodedName = decodeURIComponent(href.split('/').pop());
                if (decodedName.endsWith('.json') && decodedName.includes('SideOS')) {
                    files.push({ name: decodedName, url: cfg.url.replace('/dav/', '') + href, fullHref: href, date: new Date(lastMod), size: size });
                }
            }
        }
        files.sort((a, b) => b.date - a.date); return files;
    }

    if(downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            const cfg = getWebDAVConfig(); if (!cfg) return showStatus("❌ 配置丢失，请重新保存");
            showStatus("正在获取备份列表...", 0);
            try {
                const files = await fetchBackupList();
                if (files.length === 0) { showStatus("⚠️ 未找到备份文件"); } else { showStatus(""); openModal('cloud_file_list', files); }
            } catch (e) {
                console.error(e); let errMsg = e.message; if (errMsg.includes("404")) errMsg = "未找到备份目录(404)"; else if (errMsg.includes("401")) errMsg = "验证失败(401)"; showStatus("❌ 获取列表失败: " + errMsg);
            }
        });
    }

    async function restoreFromUrl(fileUrl) {
        const cfg = getWebDAVConfig(); const auth = btoa(cfg.user + ':' + cfg.pass);
        let fetchUrl = fileUrl.startsWith('http') ? fileUrl : new URL(cfg.url).origin + fileUrl;
        try {
            const res = await fetch(fetchUrl, { method: 'GET', headers: { 'Authorization': 'Basic ' + auth, 'Cache-Control': 'no-cache' } });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            const backupData = await res.json(); pendingCloudData = backupData; openModal('cloud_restore_confirm');
        } catch (e) { alert("下载文件失败：" + e.message); }
    }

    async function deleteCloudFile(fullHref) {
        const cfg = getWebDAVConfig(); const auth = btoa(cfg.user + ':' + cfg.pass); const targetUrl = new URL(cfg.url).origin + fullHref;
        try {
            const res = await fetch(targetUrl, { method: 'DELETE', headers: { 'Authorization': 'Basic ' + auth } });
            if (res.ok || res.status === 204) { return true; } else { throw new Error(`Status: ${res.status}`); }
        } catch (e) { alert("删除失败: " + e.message); return false; }
    }

    // === Custom Theme Logic ===
    function applyTheme(theme) {
        document.body.classList.remove('light-mode', 'cyber-mode', 'midnight-mode', 'retro-mode', 'violet-mode', 'custom-mode');
        document.body.style.removeProperty('--accent');
        document.body.style.removeProperty('--bg-color');
        document.body.style.removeProperty('--panel-bg');
        document.body.style.removeProperty('--text-color');
        
        if(customThemePanel) customThemePanel.style.display = (theme === 'custom') ? 'block' : 'none';

        if (theme === 'system') {
            const sysDark = window.matchMedia('(prefers-color-scheme: dark)');
            let eff = sysDark.matches ? 'dark' : 'light';
            if (eff !== 'dark') document.body.classList.add(eff + '-mode');
        } else if (theme === 'custom') {
            document.body.classList.add('custom-mode');
            const config = JSON.parse(localStorage.getItem('sideos_custom_theme_config')) || { accent: '#0a84ff', bg: '#121212', panel: '#1e1e1e', text: '#ffffff' };
            document.body.style.setProperty('--accent', config.accent);
            document.body.style.setProperty('--bg-color', config.bg);
            document.body.style.setProperty('--panel-bg', config.panel);
            document.body.style.setProperty('--text-color', config.text);
        } else {
            if (theme !== 'dark') document.body.classList.add(theme + '-mode');
        }
    }

    // === Custom Wallpaper Logic ===
    function applyWallpaper(type) {
        const uploadBtn = document.getElementById('upload-wallpaper-btn');
        if (uploadBtn) uploadBtn.style.display = (type === 'custom') ? 'block' : 'none';

        document.body.classList.remove('pure-white-mode');
        
        const bgs = { 
            aurora: "linear-gradient(180deg, #020024 0%, #090979 35%, #00d4ff 100%)", 
            sunset: "linear-gradient(180deg, #4b1d46 0%, #7c2e42 30%, #f69d3c 100%)", 
            ocean: "linear-gradient(180deg, #0f172a 0%, #1e293b 40%, #0e7490 100%)", 
            dune: "linear-gradient(180deg, #451a03 0%, #78350f 40%, #d97706 100%)", 
            abstract: "radial-gradient(circle at 10% 20%, rgb(90, 92, 106) 0%, rgb(32, 45, 58) 81.3%)", 
            black: "#000000", 
            "pure-white": "#ffffff" 
        };

        if (type === 'system') {
            const sysDark = window.matchMedia('(prefers-color-scheme: dark)');
            let eff = sysDark.matches ? 'aurora' : 'pure-white';
            desktopView.style.background = bgs[eff];
            desktopView.style.backgroundSize = "cover";
            if(eff === 'pure-white') document.body.classList.add('pure-white-mode');
        } else if (type === 'custom') {
            const customData = localStorage.getItem('sideos_custom_wallpaper_data');
            if (customData) {
                desktopView.style.background = `url(${customData}) 30% center / cover no-repeat`;
            } else {
                desktopView.style.background = "#222";
            }
        } else {
            desktopView.style.background = bgs[type] || bgs.aurora;
            if (type === 'pure-white') document.body.classList.add('pure-white-mode');
            else if (type !== 'black') desktopView.style.backgroundSize = "cover";
        }
    }

    // === Settings Init ===
    function initSettings() {
        showWidgetSelect.value = localStorage.getItem('sideos_show_widget') || 'show'; widgetContainer.style.display = showWidgetSelect.value === 'show' ? 'flex' : 'none';
        showWidgetSelect.addEventListener('change', () => { localStorage.setItem('sideos_show_widget', showWidgetSelect.value); widgetContainer.style.display = showWidgetSelect.value === 'show' ? 'flex' : 'none'; });
        weatherCityInput.value = localStorage.getItem('sideos_weather_city') || '';
        weatherCityInput.addEventListener('change', () => { localStorage.setItem('sideos_weather_city', weatherCityInput.value.trim()); updateWeather(); });
        initDockSettings();
        startupBehaviorSelect.value = localStorage.getItem('sideos_startup_behavior') || 'restore';
        startupBehaviorSelect.addEventListener('change', () => { localStorage.setItem('sideos_startup_behavior', startupBehaviorSelect.value); if(startupBehaviorSelect.value==='restore') saveSession(); else localStorage.removeItem('sideos_session'); });
        defaultModeSelect.value = localStorage.getItem('sideos_default_mode') || 'pc'; switchUA(defaultModeSelect.value); updateModeBtnUI(defaultModeSelect.value);
        defaultModeSelect.addEventListener('change', () => { localStorage.setItem('sideos_default_mode', defaultModeSelect.value); updateModeBtnUI(defaultModeSelect.value); });
        openModeSelect.value = localStorage.getItem('sideos_open_mode') || 'side-panel'; 
        openModeSelect.addEventListener('change', () => localStorage.setItem('sideos_open_mode', openModeSelect.value));
        independentModeSelect.value = localStorage.getItem('sideos_enable_independent_mode') || 'enable';
        independentModeSelect.addEventListener('change', () => localStorage.setItem('sideos_enable_independent_mode', independentModeSelect.value));
        
        // [New] 独立界面模式开关监听
        const independentStartupSelect = document.getElementById('independent-startup-mode-select');
        independentStartupSelect.value = localStorage.getItem('sideos_enable_independent_startup') || 'enable';
        independentStartupSelect.addEventListener('change', () => localStorage.setItem('sideos_enable_independent_startup', independentStartupSelect.value));
        
        const currentTabStyle = localStorage.getItem('sideos_tab_style') || 'standard'; tabStyleSelect.value = currentTabStyle;
        if(currentTabStyle === 'icon-only') browserTabsBar.classList.add('tab-style-icon-only'); else browserTabsBar.classList.remove('tab-style-icon-only');
        tabStyleSelect.addEventListener('change', () => { const val = tabStyleSelect.value; localStorage.setItem('sideos_tab_style', val); if(val === 'icon-only') browserTabsBar.classList.add('tab-style-icon-only'); else browserTabsBar.classList.remove('tab-style-icon-only'); });
        renderEngineOptions(); setEngine(localStorage.getItem('sideos_engine') || 'baidu');
        engineSelect.addEventListener('change', () => {
            if (engineSelect.value === 'add_custom_trigger') { openModal('add_engine'); engineSelect.value = localStorage.getItem('sideos_engine') || 'baidu'; } 
            else if (engineSelect.value === 'del_custom_trigger') { openModal('manage_engines'); engineSelect.value = localStorage.getItem('sideos_engine') || 'baidu'; } 
            else setEngine(engineSelect.value); 
        });

        const sysDark = window.matchMedia('(prefers-color-scheme: dark)');
        sysDark.addEventListener('change', () => { if (themeSelect.value === 'system') applyTheme('system'); if (wallpaperSelect.value === 'system') applyWallpaper('system'); });
        
        const th = localStorage.getItem('sideos_theme') || 'system'; themeSelect.value = th; applyTheme(th);
        themeSelect.addEventListener('change', () => { localStorage.setItem('sideos_theme', themeSelect.value); applyTheme(themeSelect.value); });

        const wp = localStorage.getItem('sideos_wallpaper') || 'system'; wallpaperSelect.value = wp; applyWallpaper(wp);
        wallpaperSelect.addEventListener('change', () => { localStorage.setItem('sideos_wallpaper', wallpaperSelect.value); applyWallpaper(wallpaperSelect.value); });
        
        if (uploadWallpaperBtn && customWallpaperUpload) {
            uploadWallpaperBtn.addEventListener('click', () => customWallpaperUpload.click());
            customWallpaperUpload.addEventListener('change', (e) => {
                const file = e.target.files[0]; if (!file) return;
                if (file.size > 4 * 1024 * 1024) { openModal('alert', "图片过大，请选择 4MB 以内的图片"); return; }
                const reader = new FileReader();
                reader.onload = function(evt) {
                    try {
                        localStorage.setItem('sideos_custom_wallpaper_data', evt.target.result);
                        wallpaperSelect.value = 'custom'; 
                        localStorage.setItem('sideos_wallpaper', 'custom'); 
                        applyWallpaper('custom');
                        openModal('alert', "壁纸设置成功！");
                    } catch (err) { openModal('alert', "存储空间不足，请尝试更小的图片"); }
                };
                reader.readAsDataURL(file);
            });
        }

        const customInputs = { accent: customColorAccent, bg: customColorBg, panel: customColorPanel, text: customColorText };
        const savedThemeConfig = JSON.parse(localStorage.getItem('sideos_custom_theme_config'));
        if (savedThemeConfig) {
            if(customInputs.accent) customInputs.accent.value = savedThemeConfig.accent;
            if(customInputs.bg) customInputs.bg.value = savedThemeConfig.bg;
            if(customInputs.panel) customInputs.panel.value = savedThemeConfig.panel;
            if(customInputs.text) customInputs.text.value = savedThemeConfig.text;
        }
        function saveCustomTheme() {
            const config = { accent: customInputs.accent.value, bg: customInputs.bg.value, panel: customInputs.panel.value, text: customInputs.text.value };
            localStorage.setItem('sideos_custom_theme_config', JSON.stringify(config)); applyTheme('custom');
        }
        Object.values(customInputs).forEach(input => { if(input) input.addEventListener('input', saveCustomTheme); });
        if (resetCustomThemeBtn) {
            resetCustomThemeBtn.addEventListener('click', () => {
                customInputs.accent.value = '#0a84ff'; customInputs.bg.value = '#121212'; customInputs.panel.value = '#1e1e1e'; customInputs.text.value = '#ffffff';
                saveCustomTheme();
            });
        }

        helpShortcutKey.textContent = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌥ S' : 'Alt+S';

        // [新增] 划词工具栏设置逻辑
        const toolbarModeSelect = document.getElementById('selection-toolbar-mode-select');
        const toolbarAiRow = document.getElementById('selection-toolbar-ai-config-row');
        const currentToolbarAiName = document.getElementById('current-toolbar-ai-name');

        const updateToolbarUI = () => {
            const val = localStorage.getItem('sideos_selection_toolbar_mode') || 'disable';
            toolbarModeSelect.value = val;
            toolbarAiRow.style.display = (val === 'copy_open' || val === 'auto_search') ? 'flex' : 'none';
            
            // 核心：将配置同步到 storage，以便 content.js (网页端) 能读取到
            chrome.storage.local.set({ 'sideos_selection_toolbar_mode': val });

            const url = localStorage.getItem('sideos_selection_toolbar_url') || 'https://chatgpt.com/';
            const allAis = [...PRESET_AIS, ...JSON.parse(localStorage.getItem('sideos_custom_ais')||'[]')];
            const match = allAis.find(ai => ai.url === url);
            currentToolbarAiName.textContent = match ? match.name : "自定义链接";
        };

        if (toolbarModeSelect) {
            toolbarModeSelect.addEventListener('change', () => {
                localStorage.setItem('sideos_selection_toolbar_mode', toolbarModeSelect.value);
                updateToolbarUI();
            });
            toolbarAiRow.addEventListener('click', () => {
                // 传入 'toolbar' 标记，告诉弹窗我们在设置工具栏
                openModal('select_ai_service', 'toolbar'); 
            });
            updateToolbarUI();
        }
        const contextModeSelect = document.getElementById('context-menu-mode-select');
        const contextAiRow = document.getElementById('context-ai-config-row');
        const currentAiNameDisplay = document.getElementById('current-ai-name');

        if (contextModeSelect && contextAiRow) {
            contextModeSelect.value = localStorage.getItem('sideos_context_mode') || 'search';
            const updateAiNameDisplay = () => {
                const currentUrl = localStorage.getItem('sideos_context_url') || 'https://chatgpt.com/';
                const presets = PRESET_AIS;
                const customs = JSON.parse(localStorage.getItem('sideos_custom_ais') || '[]');
                const allAis = [...customs, ...presets];
                const match = allAis.find(ai => ai.url === currentUrl);
                if (match) { currentAiNameDisplay.textContent = match.name; } 
                else { try { currentAiNameDisplay.textContent = new URL(currentUrl).hostname.replace('www.', ''); } catch(e) { currentAiNameDisplay.textContent = "自定义链接"; } }
            };
            updateAiNameDisplay();
            const updateContextUI = () => {
                if (contextModeSelect.value === 'copy_open' || contextModeSelect.value === 'auto_search') { contextAiRow.style.display = 'flex'; } else { contextAiRow.style.display = 'none'; }
            };
            updateContextUI();
            contextModeSelect.addEventListener('change', () => { localStorage.setItem('sideos_context_mode', contextModeSelect.value); updateContextUI(); });
            contextAiRow.addEventListener('click', () => { openModal('select_ai_service'); });
        }

        
        renderCategories(); setTimeout(recalculateGrid, 100); if (startupBehaviorSelect.value === 'restore') restoreSession();
        // [新增] 启动时检查是否有待处理的划词搜索任务 (针对未打开侧边栏的情况)
        chrome.storage.local.get(['sideos_pending_search'], (res) => {
            if (res.sideos_pending_search) {
                const text = res.sideos_pending_search;
                // 立即清除，防止下次误触发
                chrome.storage.local.remove('sideos_pending_search');
                
                // 延迟一点点，确保 DOM 准备好
                setTimeout(() => {
                    // 模拟发送消息给自己，复用已有的搜索逻辑
                    const msg = { action: 'performSearchFromMenu', text: text };
                    // 直接调用 onMessage 逻辑不太方便，我们直接复用 performSearchFromMenu 的处理代码
                    // 为了代码复用，最简单的方法是手动触发一次消息逻辑
                    // 或者直接调用搜索函数：
                    
                    // 读取搜索模式配置
                    const mode = localStorage.getItem('sideos_selection_toolbar_mode') || 'disable';
                    // 如果用户设置了工具栏是“复制并跳转”，则走 AI 逻辑，否则走搜索
                    // 注意：这里我们读取的是 toolbar 的配置，但因为是冷启动，我们简单处理，优先响应搜索
                    
                    const engines = getEngines(); 
                    const currentKey = localStorage.getItem('sideos_engine') || 'baidu'; 
                    const eng = engines[currentKey];
                    let searchUrl = eng ? eng.url + encodeURIComponent(text) : "https://www.baidu.com/s?wd=" + encodeURIComponent(text);
                    
                    loadUrl(searchUrl, text, null, false);
                }, 300);
            }
        });
        initTabsUI(); enableMomentumScroll(categoryScrollContainer); enableMomentumScroll(browserTabsBar); initWebDAV();
    }

    function initDockSettings() {
        const btns = {'nav-prev-tab': navPrevTab, 'nav-next-tab': navNextTab, 'mode-switch-btn': modeSwitchBtn, 'nav-home': navHome, 'nav-refresh': navRefresh, 'nav-open-new': navOpenNew};
        const settings = JSON.parse(localStorage.getItem('sideos_dock_settings')) || {'nav-prev-tab': true, 'nav-next-tab': true, 'mode-switch-btn': true, 'nav-home': true, 'nav-refresh': true, 'nav-open-new': true};
        const apply = () => { for (const [id, vis] of Object.entries(settings)) if (btns[id]) btns[id].style.display = vis ? 'flex' : 'none'; };
        dockSettingsContainer.querySelectorAll('input').forEach(cb => { cb.checked = settings[cb.dataset.target] !== false; cb.addEventListener('change', () => { settings[cb.dataset.target] = cb.checked; localStorage.setItem('sideos_dock_settings', JSON.stringify(settings)); apply(); }); }); apply();
    }

    function switchUA(type, callback) { 
        chrome.runtime.sendMessage({
            action: type === 'mobile' ? 'enableMobile' : 'disableMobile'
        }, (response) => { 
            // 只有当传入了明确的回调函数时（比如手动点击了切换按钮），才执行刷新
            if (callback && typeof callback === 'function') {
                callback();
            }
        }); 
    }
    function updateModeBtnUI(type) { const path = type === 'mobile' ? ICON_MOBILE : ICON_PC; const text = type === 'mobile' ? '手机' : '电脑'; modeSwitchIcon.querySelector('path').setAttribute('d', path); modeSwitchText.textContent = text; }
    
    // === 底部按钮手动切换逻辑 (更新当前标签页的状态) ===
    // [修改] 底部模式切换按钮：只有在这里手动点击时，才需要强制刷新当前网页
    modeSwitchBtn.addEventListener('click', () => { 
        const currentUiText = modeSwitchText.textContent;
        const currentMode = currentUiText === '手机' ? 'mobile' : 'pc'; 
        const newMode = currentMode === 'mobile' ? 'pc' : 'mobile'; 
        
        // 传入回调函数，仅刷新“当前正在看”的这一个标签，不影响后台其他标签
        switchUA(newMode, () => {
            if (currentActiveId && activeTabs[currentActiveId]) {
                 // 刷新当前页以应用新 User-Agent
                 if (activeTabs[currentActiveId].frame) {
                    activeTabs[currentActiveId].frame.src = activeTabs[currentActiveId].frame.src;
                 }
            }
        }); 
        
        updateModeBtnUI(newMode); 
        
        // 更新记录
        if (currentActiveId && activeTabs[currentActiveId]) {
            activeTabs[currentActiveId].mode = newMode;
            saveSession(); 
        }
    });

    backupExportBtn.addEventListener('click', () => { const d={}; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('sideos_'))d[k]=localStorage.getItem(k);} const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=`SideOS_Backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(u); });
    backupImportBtn.addEventListener('click', () => backupFileInput.click()); backupFileInput.addEventListener('change', (e) => { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=(ev)=>{ try{const d=JSON.parse(ev.target.result); let c=0; Object.keys(d).forEach(k=>{if(k.startsWith('sideos_')){localStorage.setItem(k,d[k]);c++;}}); alert(`成功导入 ${c} 项配置！`); location.reload(); }catch(err){alert("导入失败");}}; r.readAsText(f); backupFileInput.value=''; });

    const defaultApps = [ {name: "抖音", url: "https://www.douyin.com/", icon: "https://lf1-cdn-tos.bytegoofy.com/goofy/ies/douyin_web/public/favicon.ico", category: "entertainment"}, {name: "Bilibili", url: "https://www.bilibili.com/", icon: "https://www.bilibili.com/favicon.ico", category: "entertainment"}, {name: "Google", url: "https://www.google.com/", icon: "https://www.google.com/favicon.ico", category: "tools"}, {name: "Gemini", url: "https://gemini.google.com/", icon: "", category: "tools"}, {name: "YouTube", url: "https://www.youtube.com/", icon: "https://www.youtube.com/favicon.ico", category: "entertainment"}, {name: "X", url: "https://x.com/", icon: "https://abs.twimg.com/favicons/twitter.2.ico", category: "reading"}, {name: "知乎", url: "https://www.zhihu.com/", icon: "https://static.zhihu.com/heifetz/favicon.ico", category: "reading"}, {name: "ChatGPT", url: "https://chatgpt.com/", icon: "", category: "tools"}, {name: "Grok", url: "https://grok.com/", icon: "https://grok.com/favicon.ico", category: "tools"}, {name: "GitHub", url: "https://github.com/", icon: "https://github.com/favicon.ico", category: "dev"}, {name: "Gmail", url: "https://mail.google.com/", icon: "https://mail.google.com/favicon.ico", category: "work"}, {name: "DeepL", url: "https://www.deepl.com/", icon: "https://www.deepl.com/favicon.ico", category: "tools"}, {name: "Spotify", url: "http://open.spotify.com/", icon: "", category: "entertainment"}, {name: "Notion", url: "https://www.notion.so/", icon: "https://www.notion.so/images/favicon.ico", category: "work"}, {name: "Instagram", url: "https://www.instagram.com/", icon: "https://www.instagram.com/favicon.ico", category: "entertainment"} ];
    function getApps() { let apps = JSON.parse(localStorage.getItem('sideos_apps_v21')) || defaultApps; let changed = false; apps.forEach(app => { if (!app.id) { app.id = 'app_'+Date.now()+Math.random().toString(36).substr(2,9); changed = true; } if (!app.category) { app.category = 'default'; changed = true; } }); if (changed) saveApps(apps); return apps; }
    function saveApps(apps) { localStorage.setItem('sideos_apps_v21', JSON.stringify(apps)); renderApps(); }

    function renderCategories() {
        const cats = getCategories(); categoryFixedBtn.className = `category-pill ${currentCategory === 'all' ? 'active' : ''}`; categoryFixedBtn.onclick = () => switchCategory('all');
        categoryScrollContainer.innerHTML = ''; cats.forEach(cat => {
            const el = document.createElement('div'); el.className = `category-pill ${currentCategory === cat.id ? 'active' : ''}`; el.textContent = cat.name.length > 3 ? cat.name.substring(0, 3) : cat.name; el.dataset.id = cat.id;
            const badge = document.createElement('div'); badge.className = 'category-delete-badge'; badge.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'; badge.addEventListener('click', (e) => { e.stopPropagation(); openModal('delete_category', cat.id); }); el.appendChild(badge);
            el.addEventListener('click', (e) => { if (isEditing && !didTriggerLongPress) openModal('edit_category', cat.id); else if (!isEditing) switchCategory(cat.id); didTriggerLongPress = false; });
            el.addEventListener('pointerdown', (e) => handleCategoryPointerDown(e)); categoryScrollContainer.appendChild(el);
        });
    }

    function enableMomentumScroll(element) {
        let isDown = false, startX, scrollLeft, velX = 0, momentumID;
        function cancelMomentum() { cancelAnimationFrame(momentumID); velX = 0; }
        function beginMomentum() { if (Math.abs(velX) < 0.5) return; function loop() { element.scrollLeft += velX; velX *= 0.95; if (Math.abs(velX) > 0.5) momentumID = requestAnimationFrame(loop); } loop(); }
        element.addEventListener('mousedown', (e) => { isDown = true; element.classList.add('active'); startX = e.pageX - element.offsetLeft; scrollLeft = element.scrollLeft; cancelMomentum(); });
        element.addEventListener('mouseleave', () => { isDown = false; element.classList.remove('active'); beginMomentum(); });
        element.addEventListener('mouseup', () => { isDown = false; element.classList.remove('active'); beginMomentum(); });
        element.addEventListener('mousemove', (e) => { if (!isDown) return; e.preventDefault(); const x = e.pageX - element.offsetLeft; const walk = (x - startX) * 1.5; const prevScroll = element.scrollLeft; element.scrollLeft = scrollLeft - walk; velX = element.scrollLeft - prevScroll; });
    }

    function handleCategoryPointerDown(e) {
        if (e.button !== 0) return; const catId = e.target.closest('.category-pill').dataset.id; if(catId === 'all') return; 
        didTriggerLongPress = false; longPressTimer = setTimeout(() => { 
            if (!isEditing) { isEditing = true; didTriggerLongPress = true; document.body.classList.add('is-editing'); headerSettingsBtn.style.display = 'none'; headerDoneBtn.style.display = 'flex'; if (navigator.vibrate) navigator.vibrate(50); }
            startCategoryDrag(e, catId);
        }, 500);
        const cancel = () => clearTimeout(longPressTimer); e.target.addEventListener('pointerup', cancel, {once:true}); e.target.addEventListener('pointerleave', cancel, {once:true});
    }

    function startCategoryDrag(e, id) {
        isDragging = true; dragCategorySrcId = id; dragSrcId = null; dragGhost.innerHTML = '';
        const pill = document.querySelector(`.category-pill[data-id="${id}"]`);
        if(pill) {
            const clone = pill.cloneNode(true); clone.style.margin = 0; const badge = clone.querySelector('.category-delete-badge'); if(badge) badge.style.display = 'none';
            clone.style.background = "var(--accent)"; clone.style.color = "#fff"; clone.style.opacity = "1";
            dragGhost.appendChild(clone); dragGhost.style.width = (pill.offsetWidth + 10) + 'px'; dragGhost.style.height = (pill.offsetHeight + 4) + 'px'; dragGhost.style.borderRadius = '16px'; dragGhost.style.border = 'none'; dragGhost.style.background = 'transparent';
        }
        dragGhost.style.display = 'flex'; updateGhostPos(e); window.addEventListener('pointermove', handlePointerMove); window.addEventListener('pointerup', handlePointerUp);
    }

    categoryAddBtn.addEventListener('click', () => openModal('add_category'));
    
    function updateModalCategoryOptions() { 
        appCategoryInput.innerHTML = ''; const cats = getCategories(); const defaultCat = cats.find(c => c.id === 'default') || cats[0];
        if (defaultCat) { const opt = document.createElement('option'); opt.value = defaultCat.id; opt.textContent = ` ${defaultCat.name}`; appCategoryInput.appendChild(opt); }
        cats.forEach(c => { if(c.id !== 'default' && c.id !== defaultCat.id) { const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.name; appCategoryInput.appendChild(opt); } }); 
    }

    function renderApps() {
        const allApps = getApps(); const appsToRender = currentCategory === 'all' ? allApps : allApps.filter(a => a.category === currentCategory);
        appPageContainer.innerHTML = ''; paginationDots.innerHTML = '';
        const safePageSize = APPS_PER_PAGE > 0 ? APPS_PER_PAGE : 20; const totalPages = Math.ceil(appsToRender.length / safePageSize) || 1;
        for (let i = 0; i < totalPages; i++) {
            const pageEl = document.createElement('div'); pageEl.className = 'app-page';
            const pageApps = appsToRender.slice(i * safePageSize, (i + 1) * safePageSize);
            pageApps.forEach((app) => {
                const el = document.createElement('div'); el.className = 'app-item'; el.dataset.id = app.id; el.title = app.name;
                if (isDragging && app.id === dragSrcId) el.classList.add('is-dragging-source');
                const squircle = document.createElement('div'); squircle.className = 'icon-squircle'; squircle.style.background = app.color || 'rgba(255,255,255,0.2)';
                let iconSource = app.icon; if (!iconSource && app.url) iconSource = getFaviconUrl(app.url);
                squircle.appendChild(createSafeIcon(iconSource, app.name, squircle));
                el.innerHTML = `<div class="delete-badge"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></div>`;
                el.appendChild(squircle);
                const nameSpan = document.createElement('span'); nameSpan.className = 'app-name'; nameSpan.textContent = app.name; el.appendChild(nameSpan);
                el.addEventListener('pointerdown', (e) => handlePointerDown(e, app.id, app.icon));
                el.addEventListener('click', (e) => {
                    if(isDragging) return; if(e.target.closest('.delete-badge')) { e.stopPropagation(); openModal('delete', app.id); return; } if(isEditing) { openModal('edit', app.id); return; }
                    
                    // === Independent Startup Mode Logic with Tab Binding ===
                    const isIndependentStartupEnabled = localStorage.getItem('sideos_enable_independent_startup') !== 'disable';
                    const globalDefaultMode = localStorage.getItem('sideos_default_mode') || 'pc';
                    let targetMode = globalDefaultMode;
                    
                    if (isIndependentStartupEnabled && app.startupMode && app.startupMode !== 'default') {
                        targetMode = app.startupMode;
                    }

                    const currentUiText = modeSwitchText.textContent;
                    const currentMode = currentUiText === '手机' ? 'mobile' : 'pc';

                    if (targetMode !== currentMode) {
                        switchUA(targetMode);
                        updateModeBtnUI(targetMode);
                    }
                    // ============================================

                    const isIndependentEnabled = localStorage.getItem('sideos_enable_independent_mode') !== 'disable';
                    let effectiveMode = openModeSelect.value; if (isIndependentEnabled) { const appMode = app.openMode || 'default'; if (appMode !== 'default') effectiveMode = appMode; }
                    
                    if (effectiveMode === 'new-tab') {
                        window.open(app.url, '_blank'); 
                    } else { 
                        // 传递计算出的 targetMode
                        loadUrl(app.url, app.name, app.icon, true, targetMode);
                    }
                });
                pageEl.appendChild(el);
            });
            appPageContainer.appendChild(pageEl);
            const dot = document.createElement('div'); dot.className = 'dot'; dot.textContent = i + 1; dot.dataset.index = i; if(i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => { const width = appPageContainer.offsetWidth; appPageContainer.scrollTo({ left: width * i, behavior: 'smooth' }); }); paginationDots.appendChild(dot);
        }
    }

    function recalculateGrid() {
        const containerW = appPageContainer.clientWidth; const containerH = appPageContainer.clientHeight; if (containerW === 0 || containerH === 0) return;
        const itemMinW = 75; const itemMinH = 90; const cols = Math.max(3, Math.floor((containerW - 20) / itemMinW)); const rows = Math.max(3, Math.floor(containerH / itemMinH));      
        appPageContainer.style.setProperty('--cols', cols); appPageContainer.style.setProperty('--rows', rows);
        const newTotal = cols * rows; const isEmpty = appPageContainer.children.length === 0; if ((newTotal !== APPS_PER_PAGE && newTotal > 0) || (newTotal > 0 && isEmpty)) { APPS_PER_PAGE = newTotal; renderApps(); }
    }
    let resizeTimeout; window.addEventListener('resize', () => { clearTimeout(resizeTimeout); resizeTimeout = setTimeout(recalculateGrid, 150); });
    appPageContainer.addEventListener('scroll', () => { const scrollLeft = appPageContainer.scrollLeft; const width = appPageContainer.offsetWidth; const pageIndex = Math.round(scrollLeft / width); document.querySelectorAll('.dot').forEach((dot, idx) => { if(idx === pageIndex) dot.classList.add('active'); else dot.classList.remove('active'); }); });
    appPageContainer.addEventListener('wheel', (e) => { if (e.deltaY !== 0) { e.preventDefault(); appPageContainer.scrollBy({ left: e.deltaY, behavior: 'auto' }); } });
    function showEngineMenu(x, y) { quickEngineMenu.style.left = x + 'px'; quickEngineMenu.style.top = y + 'px'; quickEngineMenu.style.display = 'flex'; }
    homeSearchIconBtn.addEventListener('click', (e) => { e.stopPropagation(); showEngineMenu(20, 65); });
    navEngineIcon.addEventListener('click', (e) => { e.stopPropagation(); showEngineMenu(10, 50); });
    document.addEventListener('click', (e) => { if (!quickEngineMenu.contains(e.target) && e.target !== homeSearchIconBtn && e.target !== navEngineIcon) quickEngineMenu.style.display = 'none'; });
    // [新增] 启动时的统一任务检查器
    function checkPendingAction() {
        chrome.storage.local.get(['sideos_pending_action'], (res) => {
            const action = res.sideos_pending_action;
            if (action && action.text) {
                // 立即清除信箱，防止刷新重复触发
                chrome.storage.local.remove('sideos_pending_action');
                
                // 延迟执行，确保 DOM 和配置已加载
                setTimeout(() => {
                    const text = action.text;
                    let mode = 'search'; // 默认模式
                    
                    // 🎯 核心修复：根据来源读取不同的设置
                    if (action.type === 'toolbar') {
                        // 如果来自划词工具栏，读取工具栏的设置
                        mode = localStorage.getItem('sideos_selection_toolbar_mode') || 'disable';
                    } else if (action.type === 'context') {
                        // 如果来自右键菜单，读取右键菜单的设置
                        mode = localStorage.getItem('sideos_context_mode') || 'search';
                    }

                    console.log(`处理挂起任务: 来源=${action.type}, 模式=${mode}, 内容=${text}`);

                    // === 执行逻辑 (复用现有代码) ===
                    if (mode === 'copy_open') {
                        // 1. AI 模式逻辑
                        const robustCopy = (t) => { navigator.clipboard.writeText(t).catch(()=>{}); };
                        robustCopy(text); // 再次尝试复制以防万一
                        
                        // 读取对应的 AI URL
                        let targetUrl = '';
                        if (action.type === 'toolbar') {
                             targetUrl = localStorage.getItem('sideos_selection_toolbar_url') || 'https://chatgpt.com/';
                        } else {
                             targetUrl = localStorage.getItem('sideos_context_url') || 'https://chatgpt.com/';
                        }
                        
                        // 查找 AI 名称
                        let targetName = "AI Assistant";
                        const presets = PRESET_AIS;
                        const customs = JSON.parse(localStorage.getItem('sideos_custom_ais') || '[]');
                        const match = [...customs, ...presets].find(ai => ai.url === targetUrl);
                        if(match) targetName = match.name;
                        
                        loadUrl(targetUrl, targetName, null, true);
                        
                    } else {
                        // 2. 默认搜索逻辑
                        // 如果工具栏设为 disable 但依然触发了(罕见)，则默认搜索
                        const engines = getEngines(); 
                        const currentKey = localStorage.getItem('sideos_engine') || 'baidu'; 
                        const eng = engines[currentKey];
                        let searchUrl = eng ? eng.url + encodeURIComponent(text) : "https://www.baidu.com/s?wd=" + encodeURIComponent(text);
                        loadUrl(searchUrl, text, null, false);
                    }
                }, 200);
            }
        });
    }

    // 启动时立即检查
    checkPendingAction();
    function executeSearch(val) { const query = val.trim(); if(!query) return; const engines = getEngines(); const currentEng = engines[engineSelect.value]; let targetUrl = ""; if (query.startsWith('http') || query.includes('.') && !query.includes(' ')) targetUrl = query.startsWith('http') ? query : 'https://' + query; else targetUrl = currentEng.url + encodeURIComponent(query); if (openModeSelect.value === 'new-tab') window.open(targetUrl, '_blank'); else loadUrl(targetUrl, "Search", null); }
    const handleKeySearch = (e, val) => { if (e.key === 'Enter') executeSearch(val); };
    urlInput.addEventListener('keypress', (e) => handleKeySearch(e, urlInput.value)); homeSearchInput.addEventListener('keypress', (e) => handleKeySearch(e, homeSearchInput.value));
    homeSearchGo.addEventListener('click', () => executeSearch(homeSearchInput.value)); browserSearchGo.addEventListener('click', () => executeSearch(urlInput.value));
    triggerUploadBtn.addEventListener('click', () => appIconFile.click());
    appIconFile.addEventListener('change', (e) => { const file = e.target.files[0]; if(file) { const reader = new FileReader(); reader.onload = function(evt) { currentUploadedIcon = evt.target.result; appIconInput.value = "[已选择本地图片]"; appIconInput.disabled = true; }; reader.readAsDataURL(file); } });
    
    function handlePointerDown(e, id, iconContent) { if (e.button !== 0) return; longPressTimer = setTimeout(() => { startDrag(e, id, iconContent); }, 500); const cancel = () => clearTimeout(longPressTimer); e.target.addEventListener('pointerup', cancel, {once:true}); e.target.addEventListener('pointercancel', cancel, {once:true}); e.target.addEventListener('pointerleave', cancel, {once:true}); }
    
    function startDrag(e, id, iconContent) { 
        if (!isEditing) { isEditing = true; document.body.classList.add('is-editing'); headerSettingsBtn.style.display = 'none'; headerDoneBtn.style.display = 'flex'; if (navigator.vibrate) navigator.vibrate(50); } 
        isDragging = true; dragSrcId = id; dragCategorySrcId = null; dragTargetCategoryId = null; 
        const safeIcon = createSafeIcon(iconContent); dragGhost.innerHTML = ''; dragGhost.appendChild(safeIcon); 
        if (iconContent && (iconContent.startsWith('http') || iconContent.startsWith('data:'))) { dragGhost.style.background = "transparent"; dragGhost.style.border = "none"; } else { dragGhost.style.background = "rgba(255,255,255,0.15)"; dragGhost.style.border = "2px solid var(--accent)"; } 
        dragGhost.style.width = '56px'; dragGhost.style.height = '56px'; dragGhost.style.borderRadius = '14px';
        dragGhost.style.display = 'flex'; updateGhostPos(e); renderApps(); window.addEventListener('pointermove', handlePointerMove); window.addEventListener('pointerup', handlePointerUp); 
    }

    function handlePointerMove(e) { 
        if (!isDragging) return; e.preventDefault(); updateGhostPos(e); 
        dragGhost.style.display = 'none'; const elemBelow = document.elementFromPoint(e.clientX, e.clientY); dragGhost.style.display = 'flex'; 
        if (dragCategorySrcId) {
            const catPill = elemBelow?.closest('.category-pill');
            if (catPill && catPill.dataset.id && catPill.dataset.id !== 'all' && catPill.dataset.id !== dragCategorySrcId) {
                const targetId = catPill.dataset.id; const cats = getCategories(); const srcIdx = cats.findIndex(c => c.id === dragCategorySrcId); const tgtIdx = cats.findIndex(c => c.id === targetId);
                if (srcIdx !== -1 && tgtIdx !== -1) { const item = cats.splice(srcIdx, 1)[0]; cats.splice(tgtIdx, 0, item); saveCategories(cats); }
            }
            return;
        }
        const catPill = elemBelow?.closest('.category-pill'); document.querySelectorAll('.category-pill').forEach(el => el.classList.remove('drag-hover'));
        if (catPill && catPill.dataset.id !== 'all' && catPill.dataset.id !== currentCategory) { catPill.classList.add('drag-hover'); dragTargetCategoryId = catPill.dataset.id; } else { dragTargetCategoryId = null; }
        const dotBelow = elemBelow?.closest('.dot'); if (dotBelow && dotBelow.dataset.index) { const targetPageIndex = parseInt(dotBelow.dataset.index); const currentScroll = appPageContainer.scrollLeft; const containerWidth = appPageContainer.offsetWidth; const targetScroll = targetPageIndex * containerWidth; if (Math.abs(currentScroll - targetScroll) > 5) { appPageContainer.scrollTo({ left: targetScroll, behavior: 'smooth' }); autoScrollSpeed = 0; return; } } const rect = appPageContainer.getBoundingClientRect(); const threshold = 60; if (e.clientX > rect.right - threshold) { autoScrollSpeed = 8; startAutoScroll(); } else if (e.clientX < rect.left + threshold) { autoScrollSpeed = -8; startAutoScroll(); } else { autoScrollSpeed = 0; } const appItem = elemBelow?.closest('.app-item'); if (appItem && appItem.dataset.id) { const targetId = appItem.dataset.id; if (targetId !== dragSrcId) { const apps = getApps(); const srcIdx = apps.findIndex(a => a.id === dragSrcId); const tgtIdx = apps.findIndex(a => a.id === targetId); if (srcIdx !== -1 && tgtIdx !== -1) { const item = apps.splice(srcIdx, 1)[0]; apps.splice(tgtIdx, 0, item); localStorage.setItem('sideos_apps_v21', JSON.stringify(apps)); renderApps(); } } } 
    }

    function handlePointerUp(e) { 
        if (longPressTimer) clearTimeout(longPressTimer); autoScrollSpeed = 0; 
        if (isDragging) { 
            if (dragCategorySrcId) { isDragging = false; dragCategorySrcId = null; dragGhost.style.display = 'none'; renderCategories(); }
            else {
                if (dragTargetCategoryId) { const apps = getApps(); const appIdx = apps.findIndex(a => a.id === dragSrcId); if (appIdx !== -1) { apps[appIdx].category = dragTargetCategoryId; saveApps(apps); if (navigator.vibrate) navigator.vibrate(50); } }
                isDragging = false; dragSrcId = null; dragTargetCategoryId = null; document.querySelectorAll('.category-pill').forEach(el => el.classList.remove('drag-hover')); dragGhost.style.display = 'none'; renderApps(); 
            }
            window.removeEventListener('pointermove', handlePointerMove); window.removeEventListener('pointerup', handlePointerUp); 
        } 
    }
    function startAutoScroll() { if (autoScrollFrame) return; function step() { if (autoScrollSpeed !== 0) { appPageContainer.scrollBy({ left: autoScrollSpeed, behavior: 'auto' }); autoScrollFrame = requestAnimationFrame(step); } else { autoScrollFrame = null; } } autoScrollFrame = requestAnimationFrame(step); }
    function updateGhostPos(e) { const w = parseInt(dragGhost.style.width) || 56; const h = parseInt(dragGhost.style.height) || 56; dragGhost.style.left = (e.clientX - w/2) + 'px'; dragGhost.style.top = (e.clientY - h/2) + 'px'; }
    function exitEditMode() { isEditing = false; document.body.classList.remove('is-editing'); headerSettingsBtn.style.display = 'flex'; headerDoneBtn.style.display = 'none'; }
    headerDoneBtn.addEventListener('click', exitEditMode); desktopView.addEventListener('click', (e) => { if (isEditing && !isDragging && (e.target === desktopView || e.target === appPageContainer)) exitEditMode(); });

    function openModal(action, id = null) {
        currentModalAction = action; currentTargetId = id; currentUploadedIcon = null; appIconInput.disabled = false; appIconFile.value = ''; 
        
        modalOverlay.style.display = 'flex'; requestAnimationFrame(() => modalOverlay.classList.add('show')); 
        modalConfirm.className = 'modal-btn btn-primary'; modalConfirm.style.display = 'block'; modalConfirm.disabled = false; modalCancel.textContent = "取消"; modalCancel.style.display = 'block';
        modalForm.style.display = 'none'; if (qrContainer) qrContainer.style.display = 'none'; modalMsg.style.display = 'none'; 
        const oldList = document.getElementById('temp-engine-list'); if (oldList) oldList.remove();
        Array.from(modalForm.children).forEach(c => c.style.display = 'none');

        if (action === 'add' || action === 'edit') { 
            modalForm.style.display = 'flex'; updateModalCategoryOptions(); appNameInput.style.display = 'block'; appUrlInput.style.display = 'block'; 
            appOpenModeInput.parentElement.style.display = 'flex'; 
            appStartupModeInput.parentElement.style.display = 'flex'; // 显示界面模式
            appCategoryInput.parentElement.style.display = 'flex'; document.querySelector('.icon-input-wrapper').style.display = 'flex';
        }
        if (action === 'add') { modalTitle.textContent = "添加新应用"; appNameInput.value = ''; appUrlInput.value = ''; appOpenModeInput.value = 'default'; 
            appStartupModeInput.value = 'default';
            appCategoryInput.value = currentCategory === 'all' ? 'default' : currentCategory; appIconInput.value = ''; modalConfirm.textContent = "添加"; 
        } else if (action === 'edit') { 
            modalTitle.textContent = "编辑应用属性"; const apps = getApps(); const app = apps.find(a => a.id === id); if (!app) return closeModal();
            appNameInput.value = app.name; appUrlInput.value = app.url; appOpenModeInput.value = app.openMode || 'default'; 
            appStartupModeInput.value = app.startupMode || 'default'; 
            appCategoryInput.value = app.category || 'default'; appIconInput.value = app.icon.startsWith('data:') ? '[本地图片]' : app.icon; if(app.icon.startsWith('data:')) { currentUploadedIcon = app.icon; appIconInput.disabled = true; } modalConfirm.textContent = "保存"; 
        } else if (action === 'delete') { 
            const apps = getApps();
            const app = apps.find(a => a.id === id);
            
            // 安全校验：如果找不到对象，直接关闭
            if (!app) return closeModal();

            modalTitle.textContent = "删除应用"; 
            modalMsg.style.display = 'block'; 
            
            // [安全升级] 先设置静态HTML结构，再通过textContent安全插入动态名称
            modalMsg.innerHTML = '确定要删除 "<strong></strong>" 吗？'; 
            modalMsg.querySelector('strong').textContent = app.name;

            modalConfirm.className = 'modal-btn btn-danger'; 
            modalConfirm.textContent = "确认删除";
            
        } else if (action === 'alert') { 
             // ... (保持 alert 逻辑不变，或者确认下方 action 为 delete_category)
             modalTitle.textContent = "提示"; modalMsg.style.display = 'block'; modalMsg.textContent = id; modalConfirm.className = 'modal-btn btn-primary'; modalConfirm.textContent = "确定"; modalCancel.style.display = 'none'; 
        
        } else if (action === 'delete_category') {
            const cats = getCategories(); 
            const cat = cats.find(c => c.id === id); 
            
            if (!cat) return closeModal();

            modalTitle.textContent = "删除分类"; 
            modalMsg.style.display = 'block'; 
            
            // [安全升级] 分离结构与内容，防止 XSS 攻击
            modalMsg.innerHTML = '确定要删除 "<strong></strong>" 吗？<br><span style="font-size:12px;opacity:0.7">该分类下的应用将移动到"默认"分类</span>';
            modalMsg.querySelector('strong').textContent = cat.name;

            modalConfirm.className = 'modal-btn btn-danger'; 
            modalConfirm.textContent = "确认删除"; 
        } else if (action === 'alert') { modalTitle.textContent = "提示"; modalMsg.style.display = 'block'; modalMsg.textContent = id; modalConfirm.className = 'modal-btn btn-primary'; modalConfirm.textContent = "确定"; modalCancel.style.display = 'none'; 
        } else if (action === 'qr') { modalTitle.textContent = "扫码同步"; if (qrContainer) qrContainer.style.display = 'flex'; modalConfirm.style.display = 'none'; 
        } else if (action === 'add_category') { modalTitle.textContent = "添加新分类"; modalForm.style.display = 'flex'; appNameInput.style.display = 'block'; appNameInput.placeholder = "分类名称"; appNameInput.value = ""; modalConfirm.textContent = "创建";
        } else if (action === 'edit_category') { modalTitle.textContent = "编辑分类"; modalForm.style.display = 'flex'; appNameInput.style.display = 'block'; const cats = getCategories(); const cat = cats.find(c => c.id === id); appNameInput.placeholder = "分类名称"; appNameInput.value = cat ? cat.name : ""; modalConfirm.textContent = "保存";
        }else if (action === 'add_engine') { modalTitle.textContent = "添加搜索引擎"; modalForm.style.display = 'flex'; appNameInput.style.display = 'block'; appNameInput.value = ''; appNameInput.placeholder = "引擎名称 (如: Google)"; appUrlInput.style.display = 'block'; appUrlInput.value = ''; appUrlInput.placeholder = "搜索 URL (如: https://.../s?q=)"; modalConfirm.textContent = "添加引擎";
        } else if (action === 'manage_engines') {
            modalTitle.textContent = "管理自定义引擎"; modalForm.style.display = 'flex'; modalConfirm.style.display = 'none'; modalCancel.textContent = "完成";
            const listContainer = document.createElement('div'); listContainer.id = 'temp-engine-list'; listContainer.className = 'engine-manage-list'; 
            const engines = getEngines(); let hasItems = false;
            Object.keys(engines).forEach(key => {
                if (key.startsWith('custom_')) { hasItems = true; const eng = engines[key]; const row = document.createElement('div'); row.className = 'engine-item-row';
                    const nameDiv = document.createElement('div'); nameDiv.className = 'engine-item-name'; const iconUrl = getFaviconUrl(eng.url); const icon = createSafeIcon(iconUrl, eng.name); icon.style.width = '16px'; icon.style.height = '16px'; if(icon.querySelector('.icon-text-fallback')) icon.querySelector('.icon-text-fallback').style.fontSize = "10px"; nameDiv.appendChild(icon); nameDiv.appendChild(document.createTextNode(eng.name));
                    const delBtn = document.createElement('div'); delBtn.className = 'engine-delete-btn'; delBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
                    delBtn.onclick = () => { delete engines[key]; saveEngines(engines); if (localStorage.getItem('sideos_engine') === key) setEngine('baidu'); row.remove(); renderEngineOptions(); if (document.querySelectorAll('#temp-engine-list .engine-item-row').length === 0) closeModal(); }; row.appendChild(nameDiv); row.appendChild(delBtn); listContainer.appendChild(row);
                }
            });
            if(!hasItems) { listContainer.innerHTML = '<div class="empty-tip">暂无自定义引擎</div>'; } modalForm.appendChild(listContainer);
        }
        else if (action === 'cloud_file_list') {
            const files = id; modalTitle.textContent = "选择备份版本"; modalForm.style.display = 'flex'; modalConfirm.style.display = 'none'; modalCancel.textContent = "关闭";
            const searchBox = document.createElement('input'); searchBox.type = 'text'; searchBox.placeholder = '🔍 搜索日期 (如: 2026-01)'; searchBox.style.width = '100%'; searchBox.style.marginBottom = '8px'; searchBox.style.padding = '6px'; searchBox.style.borderRadius = '8px'; searchBox.style.border = '1px solid rgba(128,128,128,0.2)'; searchBox.style.background = 'rgba(128,128,128,0.1)'; searchBox.style.color = 'var(--text-color)'; searchBox.style.fontSize = '12px'; modalForm.appendChild(searchBox);
            const listContainer = document.createElement('div'); listContainer.id = 'temp-engine-list'; listContainer.className = 'engine-manage-list'; listContainer.style.minHeight = "250px"; listContainer.style.maxHeight = "400px"; listContainer.style.flex = "1"; modalForm.appendChild(listContainer);
            const processedFiles = files.map(f => { let dispName = f.name.replace('SideOS_ManualBackup_', 'Manual_').replace('SideOS_AutoBackup_', 'Auto_').replace('SideOS_Backup_', '').replace('.json', '').replace(/_/g, ' '); return { ...f, dispName: dispName, searchStr: dispName.toLowerCase() }; });
            function renderList(filesToRender) {
                listContainer.innerHTML = ''; const now = Date.now(); const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
                if(filesToRender.length === 0) { listContainer.innerHTML = '<div class="empty-tip">未找到匹配备份</div>'; return; }
                filesToRender.forEach(fileObj => {
                    const row = document.createElement('div'); row.className = 'engine-item-row'; row.style.cursor = 'pointer'; row.style.justifyContent = 'space-between';
                    const textGroup = document.createElement('div'); textGroup.style.display = 'flex'; textGroup.style.flexDirection = 'column'; textGroup.style.gap = '2px';
                    const dateStr = fileObj.date.toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }); const sizeKB = (fileObj.size / 1024).toFixed(1) + ' KB';
                    const nameDiv = document.createElement('div'); nameDiv.style.fontWeight = 'bold'; nameDiv.textContent = fileObj.dispName;
                    const infoDiv = document.createElement('div'); infoDiv.style.fontSize = '11px'; infoDiv.style.opacity = '0.7'; infoDiv.textContent = `${dateStr} • ${sizeKB}`;
                    textGroup.appendChild(nameDiv); textGroup.appendChild(infoDiv);
                    const actionBtn = document.createElement('div'); actionBtn.style.width = '24px'; actionBtn.style.height = '24px'; actionBtn.style.borderRadius = '50%'; actionBtn.style.display = 'flex'; actionBtn.style.alignItems = 'center'; actionBtn.style.justifyContent = 'center'; actionBtn.style.transition = '0.2s';
                    const fileAge = now - fileObj.date.getTime();
                    if (fileAge < SEVEN_DAYS) { actionBtn.innerHTML = '🔒'; actionBtn.title = "7日内备份不可删除"; actionBtn.style.opacity = '0.5'; actionBtn.style.cursor = 'not-allowed'; }
                    else {
                        actionBtn.innerHTML = '🗑️'; actionBtn.title = "删除此备份"; actionBtn.style.cursor = 'pointer';
                        actionBtn.addEventListener('click', async (e) => { e.stopPropagation(); if(confirm(`⚠️ 确定要永久删除备份 "${fileObj.dispName}" 吗？`)) { const success = await deleteCloudFile(fileObj.fullHref); if(success) { const idx = processedFiles.findIndex(f => f.fullHref === fileObj.fullHref); if(idx > -1) processedFiles.splice(idx, 1); searchBox.dispatchEvent(new Event('input')); } } });
                        actionBtn.addEventListener('mouseenter', () => actionBtn.style.background = 'rgba(255,59,48,0.2)'); actionBtn.addEventListener('mouseleave', () => actionBtn.style.background = 'transparent');
                    }
                    row.appendChild(textGroup); row.appendChild(actionBtn);
                    textGroup.addEventListener('click', () => { restoreFromUrl(fileObj.fullHref); });
                    row.addEventListener('mouseenter', () => row.style.background = 'var(--accent)'); row.addEventListener('mouseleave', () => row.style.background = 'rgba(128,128,128,0.1)');
                    listContainer.appendChild(row);
                });
            }
            renderList(processedFiles);
            searchBox.addEventListener('input', (e) => { const term = e.target.value.toLowerCase().trim(); const filtered = processedFiles.filter(f => f.searchStr.includes(term)); renderList(filtered); });
        }
        else if (action === 'cloud_restore_confirm') { modalTitle.textContent = "恢复云端备份"; modalMsg.style.display = 'block'; modalMsg.innerHTML = `确定要恢复云端数据吗？<br><span style="font-size:12px;opacity:0.7;color:#ff3b30;">⚠️ 当前本地所有配置将被覆盖</span>`; modalConfirm.className = 'modal-btn btn-primary'; modalConfirm.textContent = "确认恢复"; }
        else if (action === 'cloud_restore_success') { const count = id; modalTitle.textContent = "恢复成功"; modalMsg.style.display = 'block'; modalMsg.innerHTML = `✅ 已成功导入 <strong>${count}</strong> 项配置。<br><span style="font-size:12px;opacity:0.7;">点击下方按钮刷新以应用更改。</span>`; modalConfirm.className = 'modal-btn btn-primary'; modalConfirm.textContent = "立即刷新"; modalCancel.style.display = 'none'; }
        
        else if (action === 'select_ai_service') {
            // [修复] 优先使用传入的 id 更新类型；如果没有传入(比如从删除界面返回)，则保持上一次的类型
            if (id) aiConfigTarget = id;
            
            modalTitle.textContent = aiConfigTarget === 'toolbar' ? "选择工具栏 AI" : "选择右键 AI";
            modalForm.style.display = 'flex'; modalConfirm.style.display = 'none'; modalCancel.textContent = "关闭";
            const listContainer = document.createElement('div'); listContainer.className = 'engine-manage-list'; listContainer.style.maxHeight = "300px"; listContainer.style.flex = "1"; modalForm.appendChild(listContainer);
            
            const presets = PRESET_AIS; const customs = JSON.parse(localStorage.getItem('sideos_custom_ais') || '[]'); 
            
            // 根据类型读取对应的当前 URL
            const currentUrl = aiConfigTarget === 'toolbar' 
                ? (localStorage.getItem('sideos_selection_toolbar_url') || 'https://chatgpt.com/')
                : (localStorage.getItem('sideos_context_url') || 'https://chatgpt.com/');

            const renderAiList = () => {
                listContainer.innerHTML = '';
                const addBtn = document.createElement('div'); addBtn.className = 'engine-item-row'; addBtn.style.justifyContent = 'center'; addBtn.style.color = 'var(--accent)'; addBtn.style.cursor = 'pointer'; addBtn.style.fontWeight = '500'; addBtn.innerHTML = '<span>➕ 添加自定义网址...</span>';
                addBtn.onclick = () => { openModal('add_custom_ai'); }; listContainer.appendChild(addBtn);
                
                const allAis = [...customs, ...presets]; 
                allAis.forEach((ai, index) => {
                    const isCustom = index < customs.length; 
                    const row = document.createElement('div'); row.className = 'engine-item-row'; row.style.cursor = 'pointer';
                    if (ai.url === currentUrl) { row.style.background = 'var(--accent)'; row.style.color = 'white'; }
                    
                    const leftDiv = document.createElement('div'); leftDiv.style.display = 'flex'; leftDiv.style.alignItems = 'center'; leftDiv.style.gap = '10px'; leftDiv.style.flex = '1';
                    const iconUrl = getFaviconUrl(ai.url); const iconEl = createSafeIcon(iconUrl, ai.name); iconEl.style.width = '20px'; iconEl.style.height = '20px'; if(iconEl.querySelector('.icon-text-fallback')) iconEl.querySelector('.icon-text-fallback').style.fontSize = "12px";
                    const nameSpan = document.createElement('span'); nameSpan.textContent = ai.name; nameSpan.style.fontSize = '14px'; leftDiv.appendChild(iconEl); leftDiv.appendChild(nameSpan);
                    
                    const rightDiv = document.createElement('div');
                    if (isCustom) {
                        const delBtn = document.createElement('div'); delBtn.className = 'engine-delete-btn'; delBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'; delBtn.style.background = 'rgba(255,255,255,0.2)'; 
                        delBtn.onclick = (e) => { e.stopPropagation(); openModal('delete_custom_ai', index); };
                        rightDiv.appendChild(delBtn);
                    } else if (ai.url === currentUrl) { rightDiv.innerHTML = '✓'; }
                    
                    row.appendChild(leftDiv); row.appendChild(rightDiv);
                    row.onclick = () => { 
                        // [关键修复] 直接获取 DOM 元素，解决作用域报错问题
                        if (aiConfigTarget === 'toolbar') {
                            localStorage.setItem('sideos_selection_toolbar_url', ai.url);
                            const tbName = document.getElementById('current-toolbar-ai-name');
                            if(tbName) tbName.textContent = ai.name;
                        } else {
                            localStorage.setItem('sideos_context_url', ai.url);
                            const ctxName = document.getElementById('current-ai-name');
                            if (ctxName) ctxName.textContent = ai.name; 
                        }
                        closeModal(); 
                    };
                    listContainer.appendChild(row);
                });
            };
            renderAiList();
        }
        else if (action === 'add_custom_ai') {
            modalTitle.textContent = "添加 AI 网址"; modalForm.style.display = 'flex';
            appNameInput.style.display = 'block'; appNameInput.value = ''; appNameInput.placeholder = "名称 (例如: My AI)";
            appUrlInput.style.display = 'block'; appUrlInput.value = ''; appUrlInput.placeholder = "网址 (https://...)";
            modalConfirm.textContent = "添加";
        }
        else if (action === 'delete_custom_ai') {
            const customs = JSON.parse(localStorage.getItem('sideos_custom_ais') || '[]');
            const targetAi = customs[id];
            if(!targetAi) return openModal('select_ai_service'); 
            modalTitle.textContent = "删除 AI"; modalMsg.style.display = 'block'; modalMsg.innerHTML = `确定要删除 "<strong>${targetAi.name}</strong>" 吗？`; modalConfirm.className = 'modal-btn btn-danger'; modalConfirm.textContent = "确认删除";
        }
    }
    
    function closeModal() { modalOverlay.classList.remove('show'); setTimeout(() => { modalOverlay.style.display = 'none'; document.querySelector('.icon-input-wrapper').style.display = 'flex'; }, 200); }
    modalCancel.addEventListener('click', closeModal); modalOverlay.addEventListener('click', (e) => { if(e.target === modalOverlay) closeModal(); });
    function deleteCategory(id) { let cats = getCategories(); cats = cats.filter(c => c.id !== id); saveCategories(cats); let apps = getApps(); let changed = false; apps.forEach(a => { if(a.category === id) { a.category = 'default'; changed = true; } }); if(changed) saveApps(apps); switchCategory('all'); }

    modalConfirm.addEventListener('click', () => {
        let apps = getApps();
        if (currentModalAction === 'delete') { if (currentTargetId !== null) { apps = apps.filter(a => a.id !== currentTargetId); saveApps(apps); } 
        } else if (currentModalAction === 'delete_category') { deleteCategory(currentTargetId);
        } else if (currentModalAction === 'add_category') { const name = appNameInput.value.trim(); if (name) { const cats = getCategories(); cats.push({ id: 'cat_' + Date.now(), name: name }); saveCategories(cats); }
        } else if (currentModalAction === 'edit_category') { const name = appNameInput.value.trim(); if (name && currentTargetId) { const cats = getCategories(); const idx = cats.findIndex(c => c.id === currentTargetId); if (idx !== -1) { cats[idx].name = name; saveCategories(cats); } }
        } else if (currentModalAction === 'add_engine') { const name = appNameInput.value.trim(); let url = appUrlInput.value.trim(); if (name && url) { if(!url.includes('=')) url += '='; const engines = getEngines(); const newKey = 'custom_' + Date.now(); engines[newKey] = { name, url }; saveEngines(engines); renderEngineOptions(); setEngine(newKey); }
        } else if (currentModalAction === 'cloud_restore_confirm') {
            if (pendingCloudData) { let count = 0; Object.keys(pendingCloudData).forEach(k => { if(k.startsWith('sideos_')) { localStorage.setItem(k, pendingCloudData[k]); count++; } }); openModal('cloud_restore_success', count); return; }
        } else if (currentModalAction === 'cloud_restore_success') { location.reload(); return;
        } else if (currentModalAction === 'add_custom_ai') {
            const name = appNameInput.value.trim(); let url = appUrlInput.value.trim();
            if (name && url) {
                if (!url.startsWith('http')) url = 'https://' + url;
                const customs = JSON.parse(localStorage.getItem('sideos_custom_ais') || '[]');
                customs.push({ name, url }); localStorage.setItem('sideos_custom_ais', JSON.stringify(customs)); localStorage.setItem('sideos_context_url', url);
                const nameDisplay = document.getElementById('current-ai-name'); if (nameDisplay) nameDisplay.textContent = name;
                closeModal();
            }
            return; 
        } else if (currentModalAction === 'delete_custom_ai') {
            const customs = JSON.parse(localStorage.getItem('sideos_custom_ais') || '[]');
            if (customs[currentTargetId]) {
                const deletedUrl = customs[currentTargetId].url;
                customs.splice(currentTargetId, 1);
                localStorage.setItem('sideos_custom_ais', JSON.stringify(customs));
                if (localStorage.getItem('sideos_context_url') === deletedUrl) { localStorage.setItem('sideos_context_url', 'https://chatgpt.com/'); const nameDisplay = document.getElementById('current-ai-name'); if (nameDisplay) nameDisplay.textContent = "ChatGPT"; }
            }
            setTimeout(() => openModal('select_ai_service'), 100); return;
        } else if (currentModalAction === 'alert') {
        } else {
            const name = appNameInput.value.trim(); const url = appUrlInput.value.trim(); const openMode = appOpenModeInput.value; const category = appCategoryInput.value;
            // 获取界面模式值
            const startupMode = appStartupModeInput.value; 

            if (!name || !url) return;
            let finalUrl = url; if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) finalUrl = 'https://' + finalUrl;
            let iconToSave = ""; if (currentUploadedIcon) iconToSave = currentUploadedIcon; else if (appIconInput.value.trim() && appIconInput.value !== '[本地图片]' && appIconInput.value !== '[已选择本地图片]') iconToSave = appIconInput.value.trim(); else iconToSave = getFaviconUrl(finalUrl) || "🔗";
            
            if (currentModalAction === 'add') { 
                apps.push({ id: 'app_' + Date.now(), name, url: finalUrl, icon: iconToSave, color: "rgba(255,255,255,0.2)", openMode: openMode, category: category, startupMode: startupMode }); 
            } else if (currentModalAction === 'edit' && currentTargetId !== null) { 
                const idx = apps.findIndex(a => a.id === currentTargetId); 
                if (idx !== -1) { 
                    apps[idx].name = name; apps[idx].url = finalUrl; apps[idx].icon = iconToSave; apps[idx].openMode = openMode; apps[idx].category = category; 
                    apps[idx].startupMode = startupMode; 
                } 
            }
            saveApps(apps);
        }
        closeModal();
    });
    initSettings(); 

    function checkPendingAction() {
        chrome.storage.local.get(['sideos_pending_action'], (res) => {
            const action = res.sideos_pending_action;
            if (action && action.text) {
                // ✅ 立即销毁信件，防止重复读取
                chrome.storage.local.remove('sideos_pending_action');
                
                // 延迟执行，确保 UI 准备就绪
                setTimeout(() => {
                    const text = action.text;
                    let mode = 'search';
                    
                    // 读取配置
                    if (action.type === 'toolbar') {
                        mode = localStorage.getItem('sideos_selection_toolbar_mode') || 'disable';
                    } else if (action.type === 'context') {
                        mode = localStorage.getItem('sideos_context_mode') || 'search';
                    }

                    console.log(`执行任务: ${mode}, 内容: ${text}`);

                    if (mode === 'copy_open' || mode === 'auto_search') {
                        // AI 模式：复制并跳转
                        navigator.clipboard.writeText(text).catch(()=>{});
                        
                        // 如果是自动搜索，埋下暗号
                        if (mode === 'auto_search') {
                            chrome.storage.local.set({ 
                                'sideos_auto_search_payload': { text: text, timestamp: Date.now() } 
                            });
                        }
                        
                        // 获取目标 URL
                        let targetUrl = '';
                        if (action.type === 'toolbar') {
                             targetUrl = localStorage.getItem('sideos_selection_toolbar_url') || 'https://chatgpt.com/';
                        } else {
                             targetUrl = localStorage.getItem('sideos_context_url') || 'https://chatgpt.com/';
                        }
                        
                        // 获取 AI 名称
                        let targetName = "AI Assistant";
                        const presets = PRESET_AIS;
                        const customs = JSON.parse(localStorage.getItem('sideos_custom_ais') || '[]');
                        const match = [...customs, ...presets].find(ai => ai.url === targetUrl);
                        if(match) targetName = match.name;
                        
                        loadUrl(targetUrl, targetName, null, true);
                    } else {
                        // 搜索模式
                        const engines = getEngines(); 
                        const currentKey = localStorage.getItem('sideos_engine') || 'baidu'; 
                        const eng = engines[currentKey];
                        let searchUrl = eng ? eng.url + encodeURIComponent(text) : "https://www.baidu.com/s?wd=" + encodeURIComponent(text);
                        
                        if(desktopView) desktopView.style.display = 'none';
                        if(browserView) browserView.style.display = 'flex';
                        
                        loadUrl(searchUrl, text, null, false);
                    }
                }, 200);
            }
        });
    }

    // 2. [新增] 实时监听信箱 (针对侧边栏已经打开的情况)
    // 既然 content.js 不再发 Message 而是只写 Storage，我们需要监听 Storage 的变化
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.sideos_pending_action) {
            // 只有当有新值写入时才触发
            if (changes.sideos_pending_action.newValue) {
                checkPendingAction();
            }
        }
    });

    // 3. [启动核心] 串行初始化
    // 必须等待“大扫除”的回调回来后，才允许恢复界面
    chrome.storage.local.remove('sideos_auto_search_payload', function() {
        console.log("🧹 启动清理完成，开始初始化界面...");
        
        // A. 初始化所有设置与界面 (包含 restoreSession 恢复标签页)
        initSettings(); 
        
        // B. 检查是否有挂起的启动任务 (针对侧边栏刚被唤醒的情况)
        checkPendingAction();
    });

}); // 结束 DOMContentLoaded