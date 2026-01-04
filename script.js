// 添加屏幕切换功能
function showScreen(screenId) {
  console.log('尝试切换到屏幕:', screenId); // 调试用
  
  // 隐藏所有屏幕
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => {
    screen.classList.remove('active');
  });
  
  // 显示目标屏幕
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add('active');
    
    // 根据目标屏幕执行相应初始化
    switch(screenId) {
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
    }
  } else {
    console.error('找不到屏幕:', screenId);
  }
}

// 初始化聊天列表的函数（需要实现）
function initializeChatList() {
  console.log('初始化聊天列表');
  // 这里需要实现聊天列表的加载逻辑
}

// 初始化世界书的函数（需要实现）
function initializeWorldBook() {
  console.log('初始化世界书');
  // 这里需要实现世界书的加载逻辑
}

// 初始化壁纸设置
function initializeWallpaperSettings() {
  console.log('初始化外观设置');
  // 这里需要实现外观设置的加载逻辑
}

// 初始化API设置
function initializeAPISettings() {
  console.log('初始化API设置');
  // 这里需要实现API设置的加载逻辑
}

// 添加返回函数
function goBack() {
  const currentScreen = document.querySelector('.screen.active');
  if (currentScreen) {
    // 根据当前屏幕决定返回哪个屏幕
    switch(currentScreen.id) {
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

// 在 DOMContentLoaded 事件中添加初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM 加载完成');
  
  // 为所有返回按钮添加事件
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', goBack);
  });
  
  // 初始化主页（确保主页是活跃的）
  showScreen('home-screen');
  
  // 其他初始化代码...
});
/**
 * 扩展功能说明：
 * 1. 新增动态主题切换、消息已读回执、聊天记录导出功能
 * 2. 优化表情面板搜索、图片预览缩放、群聊@提及自动补全
 * 3. 新增离线消息缓存、聊天窗口拖拽调整大小
 * 4. 完善错误处理与用户反馈机制
 */

// 全局状态管理（扩展原有state）
let state = {
  // 继承原有状态字段...
  theme: localStorage.getItem('app-theme') || 'light',
  readReceipts: {}, // 已读回执记录 { chatId: { messageTimestamp: true } }
  chatWindowSizes: {}, // 聊天窗口大小 { chatId: { width: 800, height: 600 } }
  offlineMessages: JSON.parse(localStorage.getItem('offline-messages')) || [],
  mentionCache: {}, // @提及缓存 { chatId: [memberNames] }
  stickerSearchHistory: JSON.parse(localStorage.getItem('sticker-search-history')) || []
};

// 初始化扩展功能
document.addEventListener('DOMContentLoaded', () => {
  initThemeSwitch();
  initReadReceipts();
  initChatWindowResize();
  initStickerSearchHistory();
  initMentionAutoComplete();
  initOfflineMessageSync();
  initMessageExport();
  initImagePreviewZoom();
  initLongPressImageSave();
});

// 1. 动态主题切换
function initThemeSwitch() {
  // 应用保存的主题
  document.documentElement.classList.add(state.theme);
  
  // 主题切换按钮事件（假设HTML中有#theme-switch-btn）
  const themeBtn = document.getElementById('theme-switch-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      state.theme = newTheme;
      localStorage.setItem('app-theme', newTheme);
      
      // 切换DOM类名
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
      
      // 显示切换提示
      showCustomAlert('主题切换成功', `已切换至${newTheme === 'light' ? '明亮' : '暗黑'}模式`);
    });
  }
}

// 2. 消息已读回执
function initReadReceipts() {
  // 监听聊天窗口激活，标记已读
  document.getElementById('chat-interface-screen').addEventListener('click', () => {
    if (state.activeChatId) {
      const chat = state.chats[state.activeChatId];
      if (chat && chat.history.length > 0) {
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

// 3. 聊天窗口拖拽调整大小
function initChatWindowResize() {
  const chatInterface = document.getElementById('chat-interface-screen');
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
      state.chatWindowSizes[state.activeChatId] = { width: newWidth, height: newHeight };
      localStorage.setItem('chat-window-sizes', JSON.stringify(state.chatWindowSizes));
    }
  }
  
  function stopResize() {
    isResizing = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  }
  
  // 加载保存的窗口大小
  if (state.activeChatId && state.chatWindowSizes[state.activeChatId]) {
    const { width, height } = state.chatWindowSizes[state.activeChatId];
    const chatWin = document.getElementById('chat-messages');
    chatWin.style.width = `${width}px`;
    chatWin.style.height = `${height}px`;
  }
}

// 4. 表情面板搜索历史
function initStickerSearchHistory() {
  const searchInput = document.getElementById('sticker-search-input');
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
    if (state.activeChatId && state.chats[state.activeChatId].isGroup) {
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
        mentionPopup.style.cssText = `
          display: block;
          top: ${rect.bottom + window.scrollY + 5}px;
          left: ${rect.left + window.scrollX + atIndex * 8}px;
          width: 200px;
          max-height: 150px;
          overflow-y: auto;
        `;
        
        // 点击选择成员
        mentionPopup.querySelectorAll('.mention-item').forEach(item => {
          item.addEventListener('click', () => {
            const originalName = item.dataset.originalName;
            const displayName = item.textContent;
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
        db.chats.put(chat).then(() => {
          // 同步后更新UI
          if (state.activeChatId === msg.chatId) {
            appendMessage(msg, chat);
          } else {
            chat.unreadCount = (chat.unreadCount || 0) + 1;
            db.chats.put(chat);
            renderChatList();
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
  const originalSendMessage = sendMessage; // 假设原有发送函数为sendMessage
  window.sendMessage = async function(content, chatId) {
    try {
      // 尝试正常发送
      await originalSendMessage(content, chatId);
    } catch (error) {
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
      chat.history.push(msg);
      appendMessage(msg, chat);
      
      showCustomAlert('发送失败', '消息已缓存，将在网络恢复后自动发送', 'warning');
    }
  };
}

// 7. 聊天记录导出
function initMessageExport() {
  // 导出按钮事件（假设HTML中有#export-chat-btn）
  const exportBtn = document.getElementById('export-chat-btn');
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
        sender: msg.role === 'user' ? (chat.settings.myNickname || '我') : 
                (msg.senderName || chat.name),
        type: msg.type || 'text',
        content: msg.content,
        status: state.readReceipts[chat.id]?.[msg.timestamp] ? '已读' : '未读'
      }))
    };
    
    // 生成文件并下载
    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showCustomAlert('导出成功', `聊天记录已导出为 ${filename}.json`);
  }
}

// 8. 图片预览缩放
function initImagePreviewZoom() {
  // 监听所有聊天图片点击
  document.getElementById('chat-messages').addEventListener('click', (e) => {
    const imgEl = e.target.closest('.chat-image, .ai-generated-image, .naiimag-image');
    if (imgEl) {
      e.stopPropagation();
      openImagePreview(imgEl.src);
    }
  });
  
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
  
  document.getElementById('chat-messages').addEventListener('mousedown', (e) => {
    const imgEl = e.target.closest('.chat-image, .ai-generated-image, .naiimag-image');
    if (imgEl) {
      longPressTimer = setTimeout(() => {
        // 长按触发保存选项
        showCustomConfirm(
          '保存图片',
          '是否保存当前图片到本地？',
          { confirmText: '保存图片' }
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
  event.preventDefault();
  showErrorAlert(event.reason);
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

// 初始化增强搜索
initChatSearchEnhanced();
