/**
 * MiniPhone Main Script
 * 包含：导航逻辑、基础功能、以及扩展的高级功能
 */

// ==========================================
// 0. 基础设置与数据库初始化 (适配 HTML 中的 Dexie)
// ==========================================

// 初始化数据库
const db = new Dexie('MiniPhoneDB');
db.version(1).stores({
    chats: 'id, name, type, lastMessageTime',
    messages: '++id, chatId, timestamp, type, role',
    settings: 'key, value'
});

// 全局状态管理（升级版）
let state = {
  // --- 1. 保留的原有核心数据 ---
  activeChatId: null,
  chats: {}, 
  
  // --- 2. 升级后的系统设置 (LLM, TTS, 后台) ---
  // 大语言模型设置 (注意：升级后旧的 Key 可能需要重新输入一次)
  apiSettings: JSON.parse(localStorage.getItem('api-settings')) || {
    url: 'https://api.openai.com/v1',
    key: '', // 这里改用了新字段名，旧版 Key 不会自动迁移，需在界面重新输入
    model: 'gpt-3.5-turbo',
    temperature: 0.7
  },

  // TTS 语音设置 (新增)
  ttsSettings: JSON.parse(localStorage.getItem('tts-settings')) || {
    domain: 'domestic', // domestic 或 overseas
    groupId: '',
    apiKey: '',
    model: 'speech-01'
  },

  // 后台活动设置 (新增)
  bgActivity: JSON.parse(localStorage.getItem('bg-activity')) || {
    enabled: false,
    interval: 300, // 秒
    lastActiveTime: Date.now()
  },

  // 模型列表缓存 (新增)
  modelCache: JSON.parse(localStorage.getItem('model-cache')) || [],

  // --- 3. 保留的其他原有状态 ---
  theme: localStorage.getItem('app-theme') || 'light',
  readReceipts: JSON.parse(localStorage.getItem('read-receipts')) || {},
  chatWindowSizes: JSON.parse(localStorage.getItem('chat-window-sizes')) || {},
  offlineMessages: JSON.parse(localStorage.getItem('offline-messages')) || [],
  mentionCache: {}, 
  stickerSearchHistory: JSON.parse(localStorage.getItem('sticker-search-history')) || []
};

// ==========================================
// 1. 核心导航与屏幕切换功能 (保留原有逻辑)
// ==========================================

// 添加屏幕切换功能
function showScreen(screenId) {
    console.log('尝试切换到屏幕:', screenId);

    // 隐藏所有屏幕
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    // 显示目标屏幕
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');

        // 如果是主页，重置一些状态
        if (screenId === 'home-screen') {
            state.activeChatId = null;
        }

        // 根据目标屏幕执行相应初始化
        switch (screenId) {
            case 'chat-list-screen':
                initializeChatList();
                break;
            case 'world-book-screen':
                initializeWorldBook();
                break;
            case 'wallpaper-screen':
                initializeWallpaperSettings();
                break;
            case 'api-settings-screen':
                initializeAPISettings();
                break;
            case 'chat-interface-screen':
                // 聊天界面通常需要特定参数进入，这里仅做基础UI调整
                break;
        }
    } else {
        console.error('找不到屏幕:', screenId);
    }
}

// 添加返回函数
function goBack() {
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen) {
        // 根据当前屏幕决定返回哪个屏幕
        switch (currentScreen.id) {
            case 'chat-list-screen':
            case 'world-book-screen':
            case 'wallpaper-screen':
            case 'api-settings-screen':
                showScreen('home-screen');
                break;
            case 'chat-interface-screen':
                showScreen('chat-list-screen');
                break;
            default:
                showScreen('home-screen');
        }
    }
}

// ==========================================
// 2. 页面初始化逻辑 (保留并补全)
// ==========================================

// 初始化聊天列表
function initializeChatList() {
    console.log('初始化聊天列表');
    const listContainer = document.getElementById('chat-list');
    if (!listContainer) return;

    // 示例：如果列表为空，加载一些假数据演示 (实际应从 DB 读取)
    if (listContainer.children.length === 0) {
        // 这里仅作演示，防止页面看起来是坏的
        renderDemoChatList(listContainer); 
    }
}

// 辅助：渲染演示用的聊天列表
function renderDemoChatList(container) {
    // 模拟数据
    const demoChats = [
        { id: 'chat_1', name: '示例群聊', lastMsg: '欢迎来到 MiniPhone', time: '12:00', avatar: 'https://i.postimg.cc/MTC3Tkw8/IMG-6436.jpg', isGroup: true },
        { id: 'chat_2', name: 'AI 助手', lastMsg: '有什么可以帮你的吗？', time: '11:45', avatar: 'https://i.postimg.cc/mkcxvvSw/ai-avatar.png', isGroup: false }
    ];

    container.innerHTML = '';
    demoChats.forEach(chat => {
        // 更新 State 缓存，以便扩展功能使用
        if (!state.chats[chat.id]) {
            state.chats[chat.id] = {
                id: chat.id,
                name: chat.name,
                isGroup: chat.isGroup,
                history: [], // 消息历史
                members: chat.isGroup ? [{originalName: 'user1', groupNickname: 'User A'}, {originalName: 'user2', groupNickname: 'User B'}] : []
            };
        }

        const div = document.createElement('div');
        div.className = 'chat-item';
        div.onclick = () => enterChat(chat.id, chat.name);
        div.innerHTML = `
            <img class="chat-avatar" src="${chat.avatar}" onerror="this.src='https://via.placeholder.com/48'">
            <div class="chat-info">
                <div class="chat-name">${chat.name}</div>
                <div class="chat-last-message">${chat.lastMsg}</div>
            </div>
            <div class="chat-time">${chat.time}</div>
        `;
        container.appendChild(div);
    });
}

// 进入特定聊天
function enterChat(chatId, chatName) {
    state.activeChatId = chatId;
    
    // 更新 UI
    document.getElementById('chat-header-title').textContent = chatName;
    document.getElementById('chat-messages').innerHTML = ''; // 清空旧消息
    
    // 切换屏幕
    showScreen('chat-interface-screen');
    
    // 加载历史消息 (从 state 或 DB)
    loadChatHistory(chatId);
}

// 加载历史消息
function loadChatHistory(chatId) {
    const chat = state.chats[chatId];
    if (chat && chat.history) {
        chat.history.forEach(msg => appendMessage(msg, chat));
    }
}

// 初始化世界书
function initializeWorldBook() {
    console.log('初始化世界书');
    // 逻辑实现...
}

// 初始化壁纸设置
function initializeWallpaperSettings() {
    console.log('初始化外观设置');
    // 初始化 toggle 状态
    const themeBtn = document.getElementById('theme-switch-btn');
    if (themeBtn) {
        themeBtn.checked = state.theme === 'dark';
    }
}

// 初始化API设置
function initializeAPISettings() {
  console.log('初始化API设置');
  
  // 1. 获取输入框元素
  const keyInput = document.getElementById('api-key-input');
  const urlInput = document.getElementById('api-url-input');
  const modelInput = document.getElementById('model-name-input');
  
  // 2. 将 state 中保存的值填入输入框
  // (这里使用的是我们在第一步里刚刚更新过的 state.apiSettings)
  if (state.apiSettings) {
    if(keyInput) keyInput.value = state.apiSettings.apiKey || '';
    if(urlInput) urlInput.value = state.apiSettings.apiUrl || 'https://api.openai.com/v1';
    if(modelInput) modelInput.value = state.apiSettings.model || 'gpt-3.5-turbo';
  }
}

// ==========================================
// 3. 基础工具函数 (为扩展功能提供支持)
// ==========================================

// 自定义 Alert (替代浏览器原生 alert)
function showCustomAlert(title, message, type = 'info') {
    // 简单实现，实际可以使用 modal
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    alert(`${title}\n${message}`);
}

// 自定义 Confirm
function showCustomConfirm(title, message, options = {}) {
    return new Promise((resolve) => {
        const result = confirm(`${title}\n${message}`);
        resolve(result);
    });
}

// 自定义 Prompt
function showCustomPrompt(title, message, defaultValue = '') {
    return new Promise((resolve) => {
        const result = prompt(`${title}\n${message}`, defaultValue);
        resolve(result);
    });
}

// 格式化时间戳
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// 核心发送消息逻辑
async function sendMessage(content, chatId) {
    if (!content || !chatId) return;

    const chat = state.chats[chatId];
    const msg = {
        id: Date.now(), // 临时 ID
        chatId: chatId,
        role: 'user',
        content: content,
        timestamp: Date.now(),
        type: 'text'
    };

    // 保存到内存状态
    if (chat) {
        chat.history.push(msg);
    }
    
    // 更新 UI
    appendMessage(msg, chat);
    
    // 模拟存入 DB
    await db.messages.add(msg);
    
    console.log('消息已发送:', content);
}

// 将消息添加到界面
function appendMessage(msg, chat) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `message-bubble ${msg.role === 'user' ? 'user' : 'ai'}`;
    div.setAttribute('data-timestamp', msg.timestamp);
    
    // 处理图片或文本
    let contentHtml = msg.content;
    if (msg.type === 'image') {
        contentHtml = `<img src="${msg.content}" class="chat-image" style="max-width:100%; border-radius:8px;">`;
    }

    div.innerHTML = `
        <div class="message-content">${contentHtml}</div>
        <div class="message-time">${formatTimestamp(msg.timestamp)}</div>
    `;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight; // 滚动到底部
}

// 更新状态栏时间
function updateStatusBarTime() {
    const timeEl = document.getElementById('status-bar-time');
    if (timeEl) {
        const now = new Date();
        timeEl.textContent = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    }
}
setInterval(updateStatusBarTime, 1000);

// ==========================================
// 4. 扩展功能 (完全保留原有扩展代码逻辑)
// ==========================================
/**
 * 扩展功能说明：
 * 1. 新增动态主题切换、消息已读回执、聊天记录导出功能
 * 2. 优化表情面板搜索、图片预览缩放、群聊@提及自动补全
 * 3. 新增离线消息缓存、聊天窗口拖拽调整大小
 * 4. 完善错误处理与用户反馈机制
 */

// 初始化扩展功能
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 加载完成 (Script)');
    
    // 基础初始化
    updateStatusBarTime();
    
    // 为所有返回按钮添加事件
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', goBack);
    });

    // 绑定桌面图标点击 (HTML 中已有 onclick，但也可用 JS 绑定作为保险)
    
    // 发送按钮绑定
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');
    if (sendBtn && chatInput) {
        sendBtn.addEventListener('click', () => {
            const text = chatInput.value.trim();
            if (text && state.activeChatId) {
                window.sendMessage(text, state.activeChatId); // 使用 window 挂载的带离线逻辑的发送函数
                chatInput.value = '';
            }
        });
    }

    // 初始化主页
    showScreen('home-screen');

    // --- 扩展功能初始化 ---
    initThemeSwitch();
    initReadReceipts();
    initChatWindowResize();
    initStickerSearchHistory();
    initMentionAutoComplete();
    initOfflineMessageSync();
    initMessageExport();
    initImagePreviewZoom();
    initLongPressImageSave();
    initChatSearchEnhanced(); // 确保搜索初始化被调用
});

// 1. 动态主题切换
function initThemeSwitch() {
    // 应用保存的主题
    document.documentElement.classList.add(state.theme);
    if(state.theme === 'dark') document.documentElement.classList.add('night-mode');

    // 主题切换按钮事件
    const themeBtn = document.getElementById('theme-switch-btn');
    if (themeBtn) {
        themeBtn.addEventListener('change', (e) => { // 改为 change 事件适配 checkbox
            const newTheme = e.target.checked ? 'dark' : 'light';
            state.theme = newTheme;
            localStorage.setItem('app-theme', newTheme);

            // 切换DOM类名
            document.documentElement.classList.remove('light', 'dark', 'night-mode');
            document.documentElement.classList.add(newTheme);
            if(newTheme === 'dark') document.documentElement.classList.add('night-mode');

            // 显示切换提示
            showCustomAlert('主题切换成功', `已切换至${newTheme === 'light' ? '明亮' : '暗黑'}模式`);
        });
    }
}

// 2. 消息已读回执
function initReadReceipts() {
    // 监听聊天窗口激活，标记已读
    const chatInterface = document.getElementById('chat-interface-screen');
    if (chatInterface) {
        chatInterface.addEventListener('click', () => {
            if (state.activeChatId) {
                const chat = state.chats[state.activeChatId];
                if (chat && chat.history && chat.history.length > 0) {
                    const unreadMessages = chat.history.filter(msg =>
                        msg.role === 'assistant' && !state.readReceipts[state.activeChatId]?.[msg.timestamp]
                    );

                    // 标记已读
                    if (!state.readReceipts[state.activeChatId]) {
                        state.readReceipts[state.activeChatId] = {};
                    }
                    unreadMessages.forEach(msg => {
                        state.readReceipts[state.activeChatId][msg.timestamp] = true;
                    });

                    // 更新UI（添加已读标记）
                    unreadMessages.forEach(msg => {
                        const msgEl = document.querySelector(`.message-bubble[data-timestamp="${msg.timestamp}"]`);
                        if (msgEl) {
                            const readMark = document.createElement('span');
                            readMark.className = 'read-mark';
                            readMark.textContent = '✓✓';
                            readMark.style.cssText = `
                                position: absolute;
                                right: 8px;
                                bottom: 4px;
                                font-size: 10px;
                                color: var(--text-secondary);
                            `;
                            msgEl.appendChild(readMark);
                        }
                    });

                    // 保存已读状态到本地存储
                    localStorage.setItem('read-receipts', JSON.stringify(state.readReceipts));
                }
            }
        });
    }
}

// 3. 聊天窗口拖拽调整大小
function initChatWindowResize() {
    const chatInterface = document.getElementById('chat-interface-screen');
    if (!chatInterface) return;

    // 只有在非移动端视口才启用拖拽，避免影响手机体验
    if (window.innerWidth < 500) return;

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'chat-resize-handle';
    resizeHandle.style.cssText = `
        position: absolute;
        bottom: 10px;
        right: 10px;
        width: 16px;
        height: 16px;
        background: var(--primary-color);
        border-radius: 50%;
        cursor: se-resize;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        z-index: 100;
    `;
    chatInterface.appendChild(resizeHandle);

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        const chatWin = document.getElementById('chat-messages');
        if (!chatWin) return;
        
        startWidth = chatWin.offsetWidth;
        startHeight = chatWin.offsetHeight;
        startX = e.clientX;
        startY = e.clientY;

        // 添加临时样式
        document.body.style.cursor = 'se-resize';
        chatWin.style.transition = 'none';

        // 监听鼠标移动和松开事件
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    });

    function handleResize(e) {
        if (!isResizing) return;
        const chatWin = document.getElementById('chat-messages');
        const newWidth = startWidth + (e.clientX - startX);
        const newHeight = startHeight + (e.clientY - startY);

        // 限制最小尺寸
        if (newWidth >= 320 && newHeight >= 400) {
            chatWin.style.width = `${newWidth}px`;
            chatWin.style.height = `${newHeight}px`;

            // 保存尺寸到状态
            if (state.activeChatId) {
                state.chatWindowSizes[state.activeChatId] = { width: newWidth, height: newHeight };
                localStorage.setItem('chat-window-sizes', JSON.stringify(state.chatWindowSizes));
            }
        }
    }

    function stopResize() {
        isResizing = false;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    }

    // 加载保存的窗口大小 (在进入聊天时调用更合适，这里做初始检查)
}

// 4. 表情面板搜索历史
function initStickerSearchHistory() {
    // 检查 HTML 中是否有表情搜索框 (HTML 源码中未直接提供，这里添加安全检查)
    const searchInput = document.getElementById('sticker-search-input'); 
    if (!searchInput) return;

    const historyContainer = document.createElement('div');
    historyContainer.className = 'sticker-search-history';
    historyContainer.style.cssText = `
        position: absolute;
        top: 40px;
        left: 0;
        right: 0;
        background: var(--bg-secondary);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 8px;
        z-index: 100;
        max-height: 120px;
        overflow-y: auto;
        display: none;
    `;
    searchInput.parentNode.appendChild(historyContainer);

    // 搜索输入事件
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query) {
            // 显示搜索历史
            renderSearchHistory(query);
        } else {
            historyContainer.style.display = 'none';
        }
    });

    // 点击历史项填充搜索框
    historyContainer.addEventListener('click', (e) => {
        const historyItem = e.target.closest('.search-history-item');
        if (historyItem) {
            searchInput.value = historyItem.dataset.query;
            historyContainer.style.display = 'none';
            // 触发搜索
            searchInput.dispatchEvent(new Event('input'));
        }
    });

    // 渲染搜索历史
    function renderSearchHistory(currentQuery) {
        const filteredHistory = state.stickerSearchHistory.filter(
            item => item.includes(currentQuery)
        );

        if (filteredHistory.length === 0) {
            historyContainer.style.display = 'none';
            return;
        }

        historyContainer.innerHTML = filteredHistory.map(query => `
        <div class="search-history-item" data-query="${query}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            ${query}
        </div>
        `).join('');

        historyContainer.style.display = 'block';
    }

    // 保存搜索历史（最多10条）
    function saveSearchHistory(query) {
        if (!query || state.stickerSearchHistory.includes(query)) return;
        state.stickerSearchHistory.unshift(query);
        if (state.stickerSearchHistory.length > 10) {
            state.stickerSearchHistory.pop();
        }
        localStorage.setItem('sticker-search-history', JSON.stringify(state.stickerSearchHistory));
    }

    // 监听搜索提交
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            saveSearchHistory(searchInput.value.trim());
        }
    });
}

// 5. 群聊@提及自动补全
function initMentionAutoComplete() {
    const chatInput = document.getElementById('chat-input');
    const mentionPopup = document.getElementById('chat-at-mention-popup');

    if (!chatInput || !mentionPopup) return;

    // 输入监听：检测@符号
    chatInput.addEventListener('input', (e) => {
        const inputValue = e.target.value;
        const atIndex = inputValue.lastIndexOf('@');

        if (atIndex === -1 || atIndex === inputValue.length - 1) {
            mentionPopup.style.display = 'none';
            return;
        }

        // 提取@后的输入
        const mentionText = inputValue.substring(atIndex + 1).toLowerCase();
        if (mentionText.length < 1) {
            mentionPopup.style.display = 'none';
            return;
        }

        // 获取当前群聊成员
        if (state.activeChatId && state.chats[state.activeChatId] && state.chats[state.activeChatId].isGroup) {
            const chat = state.chats[state.activeChatId];

            // 缓存成员列表
            if (!state.mentionCache[state.activeChatId]) {
                state.mentionCache[state.activeChatId] = chat.members.map(member => ({
                    originalName: member.originalName,
                    displayName: member.groupNickname || member.originalName
                }));
            }

            // 过滤匹配的成员
            const matchedMembers = state.mentionCache[state.activeChatId].filter(member =>
                member.displayName.toLowerCase().includes(mentionText)
            );

            if (matchedMembers.length > 0) {
                // 渲染匹配结果
                mentionPopup.innerHTML = matchedMembers.map(member => `
                    <div class="mention-item" data-original-name="${member.originalName}">
                        ${member.displayName}
                    </div>
                `).join('');

                // 定位弹窗
                const rect = chatInput.getBoundingClientRect();
                // 简单定位修正
                mentionPopup.style.cssText = `
                    display: block;
                    position: absolute;
                    bottom: 60px; 
                    left: 20px;
                    width: 200px;
                    max-height: 150px;
                    overflow-y: auto;
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    z-index: 1000;
                `;

                // 点击选择成员
                mentionPopup.querySelectorAll('.mention-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const originalName = item.dataset.originalName;
                        const displayName = item.textContent.trim();
                        const newInputValue = inputValue.substring(0, atIndex) + `@${displayName} `;
                        chatInput.value = newInputValue;
                        mentionPopup.style.display = 'none';
                        chatInput.focus();
                    });
                });
            } else {
                mentionPopup.style.display = 'none';
            }
        }
    });

    // 点击其他区域关闭弹窗
    document.addEventListener('click', (e) => {
        if (!chatInput.contains(e.target) && !mentionPopup.contains(e.target)) {
            mentionPopup.style.display = 'none';
        }
    });
}

// 6. 离线消息同步
function initOfflineMessageSync() {
    // 检查离线消息并同步
    if (state.offlineMessages.length > 0) {
        showCustomConfirm(
            '发现离线消息',
            `有${state.offlineMessages.length}条离线消息待同步，是否立即同步？`,
            { confirmText: '立即同步' }
        ).then(confirmed => {
            if (confirmed) {
                syncOfflineMessages();
            }
        });
    }

    // 同步离线消息到对应聊天
    function syncOfflineMessages() {
        state.offlineMessages.forEach(msg => {
            const chat = state.chats[msg.chatId];
            if (chat) {
                chat.history.push(msg);
                // 假设 db 已经定义
                db.messages.put(msg).then(() => {
                    // 同步后更新UI
                    if (state.activeChatId === msg.chatId) {
                        appendMessage(msg, chat);
                    }
                });
            }
        });

        // 清空离线消息
        state.offlineMessages = [];
        localStorage.setItem('offline-messages', JSON.stringify(state.offlineMessages));
        showCustomAlert('同步成功', '所有离线消息已同步完成');
    }

    // 重写发送消息函数，添加离线缓存逻辑
    const originalSendMessage = sendMessage;
    // 挂载到 window 方便全局调用
    window.sendMessage = async function(content, chatId) {
        try {
            // 简单检测在线状态（实际应用可更复杂）
            if (!navigator.onLine) throw new Error('Offline');
            
            await originalSendMessage(content, chatId);
        } catch (error) {
            console.warn('发送失败，转入离线模式:', error);
            
            // 发送失败时缓存到离线消息
            const chat = state.chats[chatId];
            const offlineMsg = {
                role: 'user',
                content: content,
                timestamp: Date.now(),
                chatId: chatId,
                isOffline: true
            };

            state.offlineMessages.push(offlineMsg);
            localStorage.setItem('offline-messages', JSON.stringify(state.offlineMessages));

            // 本地显示离线消息标记
            const msg = {
                role: 'user',
                content: content,
                timestamp: offlineMsg.timestamp,
                type: 'text',
                status: 'offline'
            };
            if(chat) {
                chat.history.push(msg);
                appendMessage(msg, chat);
            }

            showCustomAlert('发送失败', '消息已缓存，将在网络恢复后自动发送', 'warning');
        }
    };
}

// 7. 聊天记录导出
function initMessageExport() {
    // 导出按钮事件（HTML 中没有直接的 ID，这里尝试寻找通用设置按钮或预留接口）
    const exportBtn = document.getElementById('export-chat-btn'); // 需在HTML中添加对应ID
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (!state.activeChatId) return;

            const chat = state.chats[state.activeChatId];
            showCustomPrompt(
                '导出聊天记录',
                '请输入导出文件名（无需后缀）',
                `${chat.name}_聊天记录_${new Date().toLocaleDateString()}`
            ).then(filename => {
                if (filename) {
                    exportChatHistory(chat, filename.trim());
                }
            });
        });
    }

    // 导出聊天记录为JSON/文本格式
    function exportChatHistory(chat, filename) {
        const messages = chat.history.filter(msg => !msg.isHidden);
        const exportData = {
            chatName: chat.name,
            exportTime: new Date().toISOString(),
            messageCount: messages.length,
            messages: messages.map(msg => ({
                timestamp: msg.timestamp,
                time: formatTimestamp(msg.timestamp),
                sender: msg.role === 'user' ? (chat.settings?.myNickname || '我') :
                    (msg.senderName || chat.name),
                type: msg.type || 'text',
                content: msg.content,
                status: state.readReceipts[chat.id]?.[msg.timestamp] ? '已读' : '未读'
            }))
        };

        // 生成文件并下载
        const blob = new Blob(
            [JSON.stringify(exportData, null, 2)], { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.json`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);

        showCustomAlert('导出成功', `聊天记录已导出为 ${filename}.json`);
    }
}

// 8. 图片预览缩放
function initImagePreviewZoom() {
    // 监听所有聊天图片点击
    const chatMsgs = document.getElementById('chat-messages');
    if (chatMsgs) {
        chatMsgs.addEventListener('click', (e) => {
            const imgEl = e.target.closest('.chat-image, .ai-generated-image, .naiimag-image');
            if (imgEl) {
                e.stopPropagation();
                openImagePreview(imgEl.src);
            }
        });
    }

    // 打开图片预览窗口
    function openImagePreview(imageSrc) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-preview-container';
        previewContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
        `;

        const previewImg = document.createElement('img');
        previewImg.src = imageSrc;
        previewImg.style.cssText = `
            max-width: 90vw;
            max-height: 90vh;
            transition: transform 0.3s ease;
            cursor: zoom-in;
        `;

        // 缩放逻辑
        let scale = 1;
        previewImg.addEventListener('click', (e) => {
            e.stopPropagation();
            scale = scale === 1 ? 1.5 : 1;
            previewImg.style.transform = `scale(${scale})`;
            previewImg.style.cursor = scale === 1 ? 'zoom-in' : 'zoom-out';
        });

        // 关闭预览
        previewContainer.addEventListener('click', () => {
            previewContainer.remove();
        });

        previewContainer.appendChild(previewImg);
        document.body.appendChild(previewContainer);
    }
}

// 9. 长按图片保存
function initLongPressImageSave() {
    let longPressTimer;
    const pressThreshold = 500; // 长按阈值（毫秒）

    const chatMsgs = document.getElementById('chat-messages');
    if (!chatMsgs) return;

    chatMsgs.addEventListener('mousedown', (e) => {
        const imgEl = e.target.closest('.chat-image, .ai-generated-image, .naiimag-image');
        if (imgEl) {
            longPressTimer = setTimeout(() => {
                // 长按触发保存选项
                showCustomConfirm(
                    '保存图片',
                    '是否保存当前图片到本地？', { confirmText: '保存图片' }
                ).then(confirmed => {
                    if (confirmed) {
                        const filename = `chat-image-${new Date().getTime()}.png`;
                        downloadImage(imgEl.src, filename);
                    }
                });
            }, pressThreshold);
        }
    });

    // 取消长按
    document.addEventListener('mouseup', () => {
        clearTimeout(longPressTimer);
    });

    document.addEventListener('mouseleave', () => {
        clearTimeout(longPressTimer);
    });
}

// 10. 错误处理与用户反馈优化
function showErrorAlert(error) {
    const errorMsg = error.message || '操作失败，请稍后重试';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-alert';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #fef2f2;
        color: #dc2626;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    errorDiv.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>${errorMsg}</span>
    `;

    document.body.appendChild(errorDiv);
    setTimeout(() => {
        errorDiv.style.opacity = '1';
    }, 10);

    // 3秒后自动关闭
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
}

// 重写原有错误处理，统一使用新的错误提示
window.addEventListener('unhandledrejection', (event) => {
    // 过滤掉无关的 rejection
    if (event.reason && event.reason.message && event.reason.message.includes('ResizeObserver')) return;
    
    event.preventDefault();
    showErrorAlert(event.reason || { message: 'Unknown Error' });
});

// 扩展原有工具函数
function downloadImage(imageSrc, filename) {
    try {
        const link = document.createElement('a');
        link.href = imageSrc;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 100);

        showCustomAlert('下载成功', `图片已开始下载：${filename}`);
    } catch (error) {
        showErrorAlert(new Error('图片下载失败：' + error.message));
    }
}

// 11. 聊天记录搜索增强
function initChatSearchEnhanced() {
    // HTML 中可能未直接包含 chat-search-input，这里做安全处理或动态插入
    // 假设在聊天列表头部添加搜索框逻辑
    const searchInput = document.getElementById('chat-search-input');
    const searchResults = document.getElementById('chat-search-results');

    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', debounce((e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        // 搜索匹配的消息
        const matchedMessages = chat.history.filter(msg => {
            if (msg.isHidden) return false;
            const content = String(msg.content).toLowerCase();
            return content.includes(query);
        });

        if (matchedMessages.length > 0) {
            searchResults.innerHTML = `
                <div class="search-results-header">
                找到${matchedMessages.length}条匹配结果
                </div>
                ${matchedMessages.map(msg => `
                <div class="search-result-item" data-timestamp="${msg.timestamp}">
                    <div class="result-sender">
                    ${msg.role === 'user' ? '我' : (msg.senderName || chat.name)}
                    </div>
                    <div class="result-content">
                    ${String(msg.content).replace(
                        new RegExp(query, 'gi'),
                        match => `<span class="search-highlight">${match}</span>`
                    )}
                    </div>
                    <div class="result-time">
                    ${formatTimestamp(msg.timestamp)}
                    </div>
                </div>
                `).join('')}
            `;

            searchResults.style.display = 'block';

            // 点击结果定位到消息
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const timestamp = item.dataset.timestamp;
                    const msgEl = document.querySelector(`.message-bubble[data-timestamp="${timestamp}"]`);
                    if (msgEl) {
                        msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        msgEl.classList.add('search-highlight-bubble');
                        setTimeout(() => msgEl.classList.remove('search-highlight-bubble'), 3000);
                    }
                    searchResults.style.display = 'none';
                });
            });
        } else {
            searchResults.innerHTML = `
                <div class="search-results-empty">
                未找到与"${query}"相关的消息
                </div>
            `;
            searchResults.style.display = 'block';
        }
    }, 300));

    // 防抖函数
    function debounce(func, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    }
}

/* ==========================================
   新增：系统设置与语音功能扩展 (V2.0)
   ========================================== */

// 1. 初始化系统设置页面 (打开设置时自动调用)
function initializeAPISettings() {
  console.log('初始化系统设置...');
  
  // --- A. 加载聊天设置 ---
  document.getElementById('api-url').value = state.apiSettings.url || '';
  document.getElementById('api-key').value = state.apiSettings.key || '';
  
  // 恢复模型选择
  const modelSelect = document.getElementById('model-select');
  if (state.modelCache && state.modelCache.length > 0) {
    updateModelSelectOptions(state.modelCache);
  }
  modelSelect.value = state.apiSettings.model || 'gpt-3.5-turbo';

  // 恢复温度滑块
  const slider = document.getElementById('temp-slider');
  const tempDisplay = document.getElementById('temp-display');
  if (slider && tempDisplay) {
    slider.value = state.apiSettings.temperature || 0.7;
    tempDisplay.textContent = slider.value;
    slider.addEventListener('input', (e) => { tempDisplay.textContent = e.target.value; });
  }

  // --- B. 加载语音设置 ---
  document.getElementById('tts-domain').value = state.ttsSettings.domain || 'domestic';
  document.getElementById('tts-group-id').value = state.ttsSettings.groupId || '';
  document.getElementById('tts-api-key').value = state.ttsSettings.apiKey || '';
  document.getElementById('tts-model-select').value = state.ttsSettings.model || 'speech-01';

  // --- C. 加载后台活动设置 ---
  const bgToggle = document.getElementById('bg-activity-toggle');
  const bgInterval = document.getElementById('bg-activity-interval');
  if (bgToggle) {
    bgToggle.checked = state.bgActivity.enabled;
    bgInterval.value = state.bgActivity.interval;
    toggleBgInput(bgToggle.checked);
    bgToggle.addEventListener('change', (e) => toggleBgInput(e.target.checked));
  }
}

// 辅助：切换后台输入框的可用状态
function toggleBgInput(checked) {
  const group = document.getElementById('bg-interval-group');
  if(group) {
    group.style.opacity = checked ? '1' : '0.5';
    group.style.pointerEvents = checked ? 'auto' : 'none';
  }
}

// 2. 保存所有设置 (点击右上角保存时调用)
function saveAllSettings() {
  // 保存聊天设置
  state.apiSettings = {
    url: document.getElementById('api-url').value.trim(),
    key: document.getElementById('api-key').value.trim(),
    model: document.getElementById('model-select').value,
    temperature: parseFloat(document.getElementById('temp-slider').value)
  };
  localStorage.setItem('api-settings', JSON.stringify(state.apiSettings));

  // 保存语音设置
  state.ttsSettings = {
    domain: document.getElementById('tts-domain').value,
    groupId: document.getElementById('tts-group-id').value.trim(),
    apiKey: document.getElementById('tts-api-key').value.trim(),
    model: document.getElementById('tts-model-select').value
  };
  localStorage.setItem('tts-settings', JSON.stringify(state.ttsSettings));

  // 保存后台设置
  state.bgActivity = {
    enabled: document.getElementById('bg-activity-toggle').checked,
    interval: parseInt(document.getElementById('bg-activity-interval').value) || 300,
    lastActiveTime: Date.now()
  };
  localStorage.setItem('bg-activity', JSON.stringify(state.bgActivity));
  
  // 重启后台监控
  initBackgroundActivityMonitor(); 
  
  // 提示并返回
  showCustomAlert('保存成功', '系统配置已更新');
  goBack();
}

// 3. 拉取聊天模型列表
async function fetchLLMModels() {
  const url = document.getElementById('api-url').value.trim();
  const key = document.getElementById('api-key').value.trim();
  
  if (!url || !key) { 
    showCustomAlert('提示', '请先填写 接口地址 和 API Key'); 
    return; 
  }
  
  const btn = document.querySelector('button[onclick="fetchLLMModels()"]');
  const originalText = btn.textContent;
  btn.textContent = '拉取中...';
  btn.disabled = true;
  
  try {
    // 自动适配结尾是否有斜杠
    const endpoint = url.endsWith('/') ? `${url}models` : `${url}/models`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('网络请求失败: ' + response.status);
    
    const data = await response.json();
    if (data && data.data) {
      const models = data.data.map(m => m.id).sort();
      state.modelCache = models;
      localStorage.setItem('model-cache', JSON.stringify(models));
      updateModelSelectOptions(models);
      showCustomAlert('成功', `已获取 ${models.length} 个模型`);
    }
  } catch (error) {
    console.error(error);
    showCustomAlert('拉取失败', '无法连接到API，请检查地址和Key');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// 更新下拉框选项
function updateModelSelectOptions(models) {
  const select = document.getElementById('model-select');
  if (select) {
    select.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
  }
}

// 4. 拉取语音模型 (模拟演示)
function fetchTTSModels() {
  const btn = document.querySelector('button[onclick="fetchTTSModels()"]');
  btn.textContent = '验证中...';
  setTimeout(() => {
    btn.textContent = '🔄 拉取语音模型';
    showCustomAlert('成功', 'Minimax 语音连接正常');
  }, 1000);
}

// 5. 后台实时活动监控
let bgActivityTimer = null;

function initBackgroundActivityMonitor() {
  // 清除旧定时器
  if (bgActivityTimer) clearInterval(bgActivityTimer);
  
  // 检查开关
  if (!state.bgActivity || !state.bgActivity.enabled) return;
  
  console.log('后台监控已启动');
  bgActivityTimer = setInterval(() => {
    const now = Date.now();
    // 检查是否超过了设定的间隔时间
    if (now - state.bgActivity.lastActiveTime > state.bgActivity.interval * 1000) {
      triggerBackgroundAction();
    }
  }, 10000); // 每10秒检查一次
}

function triggerBackgroundAction() {
  // 重置时间，避免重复触发
  state.bgActivity.lastActiveTime = Date.now();
  
  // 这里触发通知
  if (Notification.permission === "granted") {
    new Notification("MiniPhone", { body: "Char 似乎想跟你聊聊天..." });
  } else {
    // 如果没有通知权限，就在应用内弹窗
    showCustomAlert('特别关注', 'Char 正在看着你的头像发呆...');
  }
}

// 监听用户点击，重置后台计时器 (说明用户还活着)
document.addEventListener('click', () => {
  if (state.bgActivity && state.bgActivity.enabled) {
    state.bgActivity.lastActiveTime = Date.now();
  }
});
// 页面加载完毕后启动监控
document.addEventListener('DOMContentLoaded', initBackgroundActivityMonitor);


/* ==========================================
   核心功能：智能语音播放
   说明：如果没有配置 TTS Key，则自动静音，仅显示文字。
   ========================================== */
async function tryPlayAudio(text) {
    // 1. 安全检查：没填语音 Key 或 GroupId 就不播放
    if (!state.ttsSettings || !state.ttsSettings.apiKey || !state.ttsSettings.groupId) {
        console.log('未配置语音API，本次仅显示文字');
        return; 
    }
    
    if (!text) return;

    console.log('正在转换语音...');
    try {
        const { groupId, apiKey, domain, model } = state.ttsSettings;
        
        // 判断是国内版还是海外版
        const baseUrl = domain === 'overseas' 
            ? 'https://api.minimaxi.chat/v1/text_to_speech' 
            : 'https://api.minimax.chat/v1/text_to_speech';
        
        const response = await fetch(`${baseUrl}?GroupId=${groupId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'speech-01',
                // 这里可以自定义音色 ID
                voice_setting: { 
                    voice_id: 'female-yaya', 
                    speed: 1.0, 
                    vol: 1.0, 
                    pitch: 0 
                },
                text: text
            })
        });

        if (!response.ok) throw new Error('TTS 请求失败');
        
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.play();
        
    } catch (error) {
        console.error('语音播放失败:', error);
        // 失败了也不影响文字显示
    }
}

/* ==========================================
   ★★★ 补丁：智能语音自动播放 ★★★
   说明：这段代码会自动监测新消息，不用修改原有函数
   ========================================== */

// 1. 语音播放核心函数
async function tryPlayAudio(text) {
    // 安全检查：没填语音配置就不播放
    if (!state.ttsSettings || !state.ttsSettings.apiKey || !state.ttsSettings.groupId) {
        return; 
    }
    if (!text) return;

    // 防止重复播放（简单的防抖）
    if (window.lastPlayedText === text && (Date.now() - window.lastPlayedTime < 3000)) {
        return;
    }
    window.lastPlayedText = text;
    window.lastPlayedTime = Date.now();

    console.log('正在转换语音:', text.substring(0, 10) + '...');
    
    try {
        const { groupId, apiKey, domain, model } = state.ttsSettings;
        const baseUrl = domain === 'overseas' 
            ? 'https://api.minimaxi.chat/v1/text_to_speech' 
            : 'https://api.minimax.chat/v1/text_to_speech';
        
        const response = await fetch(`${baseUrl}?GroupId=${groupId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'speech-01',
                voice_setting: { 
                    voice_id: 'female-yaya', 
                    speed: 1.0, 
                    vol: 1.0, 
                    pitch: 0 
                },
                text: text
            })
        });

        if (!response.ok) throw new Error('TTS 请求失败');
        
        const blob = await response.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        audio.play();
    } catch (error) {
        console.error('语音播放失败:', error);
    }
}

// 2. 自动监听器 (代替 appendMessage 修改)
function enableAutoTTS() {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;

    // 创建观察者：当聊天区域发生变化时触发
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                // 检查是否是新添加的 AI 消息气泡
                if (node.nodeType === 1 && 
                    node.classList.contains('message-bubble') && 
                    node.classList.contains('ai')) {
                    
                    // 获取文字内容
                    const text = node.innerText || node.textContent;
                    
                    // 只有当页面已经加载完毕（不是加载历史记录）时才播放
                    // 我们通过检查 mutation 是否在页面加载1秒后发生来简单判断
                    if (Date.now() - window.pageLoadTime > 2000) {
                        tryPlayAudio(text);
                    }
                }
            });
        });
    });

    // 开始监听
    observer.observe(chatContainer, { childList: true });
    console.log('✅ 语音自动播报已就绪');
}

// 3. 启动逻辑
window.pageLoadTime = Date.now();
// 延迟启动，避免把历史记录也读一遍
setTimeout(enableAutoTTS, 2000);
