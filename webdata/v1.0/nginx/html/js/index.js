const chatArea = document.getElementById('chatArea');
const messageInput = document.getElementById('messageInput');
const submitBtn = document.getElementById('submitBtn');
const stopBtn = document.getElementById('stopBtn');
const newChatBtn = document.getElementById('newChatBtn');
const chatList = document.getElementById('chatList');
const welcomeMessage = document.getElementById('welcomeMessage');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const sidebar = document.getElementById('sidebar');
let currentEventSource = null;
let currentChatId = null;

// 全局变量，用于跟踪聊天编号
let chatCounter = 1;

// 初始化时设置聊天计数器
document.addEventListener('DOMContentLoaded', function() {
    // 初始化聊天计数器
    initChatCounter();
    
    // 确保默认显示发送按钮，隐藏停止按钮
    if (submitBtn && stopBtn) {
        submitBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
    }
    
    // 获取知识库列表
    const loadRagOptions = () => {
        const ragSelect = document.getElementById('ragSelect');

        fetch('http://127.0.0.1:8090/api/v1/rag/query_rag_tag_list')
            .then(response => response.json())
            .then(data => {
                if (data.code === '0000' && data.data) {
                    // 清空现有选项（保留第一个默认选项）
                    while (ragSelect.options.length > 1) {
                        ragSelect.remove(1);
                    }

                    // 添加新选项
                    data.data.forEach(tag => {
                        const option = new Option(`Rag：${tag}`, tag);
                        ragSelect.add(option);
                    });
                }
            })
            .catch(error => {
                console.error('获取知识库列表失败:', error);
            });
    };

    // 初始化加载
    loadRagOptions();

    // 初始化动画效果
    initializeAnimations();
});

// 额外的初始化代码，确保按钮状态正确
window.addEventListener('load', function() {
    // 再次确保按钮状态正确
    if (submitBtn && stopBtn) {
        submitBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
    }
});

// 全局检查按钮状态
setTimeout(function() {
    if (submitBtn && stopBtn) {
        submitBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
    }
}, 500);

// 初始化聊天计数器
function initChatCounter() {
    // 获取所有聊天
    const chats = Object.keys(localStorage)
        .filter(key => key.startsWith('chat_'));
    
    // 如果没有聊天，重置计数器
    if (chats.length === 0) {
        chatCounter = 1;
        localStorage.setItem('chatCounter', '1');
        return;
    }
    
    // 尝试从localStorage读取计数器
    const savedCounter = localStorage.getItem('chatCounter');
    if (savedCounter) {
        chatCounter = parseInt(savedCounter);
    } else {
        // 如果没有保存的计数器，则基于现有聊天设置一个值
        chatCounter = chats.length + 1;
        localStorage.setItem('chatCounter', chatCounter.toString());
    }
}

function createNewChat() {
    const chatId = Date.now().toString();
    currentChatId = chatId;
    localStorage.setItem('currentChatId', chatId);
    
    // 使用带编号的聊天名称
    const chatName = `聊天 #${chatCounter}`;
    chatCounter++;
    localStorage.setItem('chatCounter', chatCounter.toString());
    
    // 创建聊天数据结构
    localStorage.setItem(`chat_${chatId}`, JSON.stringify({
        name: chatName,
        messages: []
    }));
    
    // 确保显示发送按钮，隐藏停止按钮
    if (submitBtn && stopBtn) {
        submitBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
    }
    
    updateChatList();
    clearChatArea();
}

function deleteChat(chatId) {
    if (confirm('确定要删除这个聊天记录吗？')) {
        localStorage.removeItem(`chat_${chatId}`); // Remove the chat from localStorage
        if (currentChatId === chatId) { // If the current chat is being deleted
            createNewChat(); // Create a new chat
        }
        updateChatList(); // Update the chat list to reflect changes
    }
}

function updateChatList() {
    chatList.innerHTML = '';
    const chats = Object.keys(localStorage)
      .filter(key => key.startsWith('chat_'))
      // 按照时间戳排序，最新的在前面，但不移动当前选中的聊天
      .sort((a, b) => {
          // 如果是当前聊天，保持原来的位置
          if (a.split('_')[1] === currentChatId) return -1;
          if (b.split('_')[1] === currentChatId) return 1;
          // 否则按照时间戳排序
          return parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]);
      });

    // 是否处于选择模式
    const isSelectMode = !document.getElementById('batchDeleteBtn').classList.contains('hidden');

    // 如果没有聊天，隐藏批量删除按钮
    if (chats.length === 0) {
        document.getElementById('selectAllChats').classList.add('hidden');
    } else {
        document.getElementById('selectAllChats').classList.remove('hidden');
    }

    chats.forEach(chatKey => {
        let chatData = JSON.parse(localStorage.getItem(chatKey));
        const chatId = chatKey.split('_')[1];

        // 数据迁移：将旧数组格式转换为新对象格式
        if (Array.isArray(chatData)) {
            chatData = {
                name: `聊天 #${chatCounter++}`,
                messages: chatData
            };
            localStorage.setItem(chatKey, JSON.stringify(chatData));
        }

        const li = document.createElement('li');
        li.className = `chat-item flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors ${chatId === currentChatId? 'bg-blue-50' : ''}`;
        
        // 添加选择框
        const selectCheckbox = isSelectMode ? `
            <div class="mr-2">
                <input type="checkbox" class="chat-select-checkbox w-4 h-4" data-chat-id="${chatId}">
            </div>
        ` : '';
        
        li.innerHTML = `
            ${selectCheckbox}
            <div class="flex-1 flex items-center justify-between">
                <div>
                    <div class="text-sm font-medium">${chatData.name}</div>
                    <div class="text-xs text-gray-400">${new Date(parseInt(chatId)).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
                </div>
                <div class="chat-actions flex items-center gap-1 opacity-0 transition-opacity duration-200 ${isSelectMode ? 'hidden' : ''}">
                    <button class="p-1 hover:bg-gray-200 rounded text-gray-500" onclick="renameChat('${chatId}')">重命名</button>
                    <button class="p-1 hover:bg-red-200 rounded text-red-500" onclick="deleteChat('${chatId}')">删除</button>
                </div>
            </div>
        `;
        
        li.addEventListener('click', (e) => {
            // 如果点击的是复选框或者按钮，不加载聊天
            if (e.target.closest('input[type="checkbox"]') || e.target.closest('.chat-actions button')) {
                return;
            }
            loadChat(chatId);
        });
        
        li.addEventListener('mouseenter', () => {
            const actionsDiv = li.querySelector('.chat-actions');
            if (actionsDiv && !isSelectMode) {
                actionsDiv.classList.remove('opacity-0');
            }
        });
        
        li.addEventListener('mouseleave', () => {
            const actionsDiv = li.querySelector('.chat-actions');
            if (actionsDiv) {
                actionsDiv.classList.add('opacity-0');
            }
        });
        
        chatList.appendChild(li);
    });
}

let currentContextMenu = null;
// 优化后的上下文菜单
function showChatContextMenu(event, chatId) {
    event.stopPropagation();
    closeContextMenu();

    const buttonRect = event.target.closest('button').getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${buttonRect.left}px`;
    menu.style.top = `${buttonRect.bottom + 4}px`;

    menu.innerHTML = `
        <div class="context-menu-item" onclick="renameChat('${chatId}')">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            重命名
        </div>
        <div class="context-menu-item text-red-500" onclick="deleteChat('${chatId}')">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            删除
        </div>
    `;

    document.body.appendChild(menu);
    currentContextMenu = menu;

    // 点击外部关闭菜单
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu, { once: true });
    });
}

function closeContextMenu() {
    if (currentContextMenu) {
        currentContextMenu.remove();
        currentContextMenu = null;
    }
}

function renameChat(chatId) {
    const chatKey = `chat_${chatId}`;
    const chatData = JSON.parse(localStorage.getItem(chatKey));
    const currentName = chatData.name || `聊天 ${new Date(parseInt(chatId)).toLocaleString()}`;
    const newName = prompt('请输入新的聊天名称', currentName);

    if (newName) {
        chatData.name = newName;
        localStorage.setItem(chatKey, JSON.stringify(chatData));
        updateChatList();
    }
}

function loadChat(chatId) {
    currentChatId = chatId;
    localStorage.setItem('currentChatId', chatId);
    clearChatArea();
    const chatData = JSON.parse(localStorage.getItem(`chat_${chatId}`) || '{"name": "新聊天", "messages": []}');
    
    // 按时间戳顺序显示所有消息
    chatData.messages.sort((a, b) => a.timestamp - b.timestamp).forEach(msg => {
        appendMessage(msg.content, msg.isAssistant, false, msg.status || 'completed', msg.timestamp);
    });
    
    // 确保显示发送按钮，隐藏停止按钮
    if (submitBtn && stopBtn) {
        submitBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
    }
    
    updateChatList();
}

function clearChatArea() {
    chatArea.innerHTML = '';
    welcomeMessage.style.display = 'flex';
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function appendMessage(content, isAssistant = false, saveToStorage = true, status = 'completed', timestamp = Date.now()) {
    welcomeMessage.style.display = 'none';
    const messageDiv = document.createElement('div');
    messageDiv.className = `max-w-4xl mx-auto mb-4 p-4 rounded-lg ${isAssistant ? 'bg-gray-100' : 'bg-white border'} markdown-body relative`;
    messageDiv.dataset.timestamp = timestamp;
    messageDiv.dataset.status = status;

    // 创建消息头部
    const headerDiv = document.createElement('div');
    headerDiv.className = 'flex justify-between items-center mb-2';
    
    // 左侧显示发送者和状态
    const senderDiv = document.createElement('div');
    senderDiv.className = 'flex items-center gap-2';
    
    // 创建发送者标签
    const senderLabel = document.createElement('span');
    senderLabel.className = `font-medium inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${isAssistant ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`;
    senderLabel.innerHTML = `${isAssistant ? '<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>AI' : '<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"></path></svg>用户'}`;
    
    // 创建状态标签
    let statusSpan = '';
    if (status === 'sending') {
        statusSpan = `<span class="text-yellow-500 ml-2">发送中 <span class="loading-dots"><span></span><span></span><span></span></span></span>`;
    }
    
    senderDiv.innerHTML = `
        ${senderLabel.outerHTML}
        ${statusSpan}
        <span class="text-gray-400 text-xs">${formatTime(timestamp)}</span>
    `;
    
    // 右侧操作按钮
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100';
    
    // 停止按钮（仅在AI消息生成中显示）
    if (isAssistant && status === 'sending') {
        const stopBtn = document.createElement('button');
        stopBtn.className = 'p-1 bg-red-100 hover:bg-red-200 rounded text-red-500 text-sm flex items-center gap-1 stop-btn';
        stopBtn.style.opacity = '1'; // 确保停止按钮可见
        stopBtn.innerHTML = `
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            停止
        `;
        stopBtn.onclick = () => {
            if (currentEventSource) {
                // 关闭消息流
                currentEventSource.close();
                
                // 清除超时计时器
                if (window.aiResponseTimer) {
                    clearTimeout(window.aiResponseTimer);
                }
                
                // 恢复按钮状态
                submitBtn.style.display = 'flex';
                stopBtn.style.display = 'none';
                
                // 更新最后一条消息的状态
                const lastMessage = chatArea.lastElementChild;
                if (lastMessage && lastMessage.dataset.status === 'sending') {
                    // 更新UI显示
                    const statusSpan = lastMessage.querySelector('span.text-yellow-500, span.text-red-500, span.text-green-500');
                    if (statusSpan) {
                        statusSpan.className = 'text-red-500';
                        statusSpan.innerHTML = '已停止';
                    }
                    
                    // 移除消息中的停止按钮
                    const messageStopBtn = lastMessage.querySelector('.stop-btn');
                    if (messageStopBtn) {
                        messageStopBtn.remove();
                    }
                    
                    // 更新消息状态
                    lastMessage.dataset.status = 'stopped';
                    
                    // 保存部分内容
                    const contentDiv = lastMessage.querySelector('.message-content');
                    if (contentDiv && currentChatId) {
                        const partialContent = contentDiv.textContent;
                        const timestamp = parseInt(lastMessage.dataset.timestamp);
                        saveStoppedAIResponse(currentChatId, timestamp, partialContent);
                    }
                }
            }
        };
        actionsDiv.appendChild(stopBtn);
    }
    
    // 复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.className = 'p-1 hover:bg-gray-200 rounded text-gray-500 text-sm flex items-center gap-1';
    copyBtn.innerHTML = `
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
        复制
    `;
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(content).then(() => {
            copyBtn.innerHTML = `
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                已复制
            `;
            setTimeout(() => {
                copyBtn.innerHTML = `
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    复制
                `;
            }, 2000);
        });
    };
    
    // 编辑按钮（仅用户消息可编辑）
    if (!isAssistant) {
        const editBtn = document.createElement('button');
        editBtn.className = 'p-1 hover:bg-gray-200 rounded text-gray-500 text-sm flex items-center gap-1';
        editBtn.innerHTML = `
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            编辑
        `;
        
        // 使用现有的编辑逻辑
        editBtn.onclick = function() {
            const textarea = document.createElement('textarea');
            textarea.className = 'w-full p-2 border rounded-lg mb-2 shadow-inner focus:ring-2 focus:ring-blue-300 transition-all';
            textarea.value = content;
            const contentDiv = messageDiv.querySelector('.message-content');
            contentDiv.replaceWith(textarea);
            
            // 聚焦并自动调整高度
            textarea.focus();
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
            
            // 创建按钮容器
            const btnContainer = document.createElement('div');
            btnContainer.className = 'flex gap-2 mt-2';
            
            // 保存按钮
            const saveBtn = document.createElement('button');
            saveBtn.className = 'px-3 py-1 bg-blue-500 text-white rounded-lg text-sm flex items-center gap-1';
            saveBtn.innerHTML = `
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                保存
            `;
            
            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'px-3 py-1 bg-gray-500 text-white rounded-lg text-sm flex items-center gap-1';
            cancelBtn.innerHTML = `
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                取消
            `;
            
            // 保存按钮点击事件
            saveBtn.onclick = () => {
                const newContent = textarea.value.trim();
                if (newContent && newContent !== content) {
                    // 更新本地存储
                    const chatData = JSON.parse(localStorage.getItem(`chat_${currentChatId}`));
                    const messageIndex = chatData.messages.findIndex(
                        msg => msg.timestamp === parseInt(messageDiv.dataset.timestamp)
                    );
                    if (messageIndex !== -1) {
                        chatData.messages[messageIndex].content = newContent;
                        localStorage.setItem(`chat_${currentChatId}`, JSON.stringify(chatData));
                        
                        // 更新显示
                        contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(newContent));
                        messageDiv.replaceChild(contentDiv, textarea);
                        actionsDiv.removeChild(btnContainer);
                        
                        // 应用高亮
                        setTimeout(() => {
                            contentDiv.querySelectorAll('pre code').forEach((block) => {
                                hljs.highlightBlock(block);
                            });
                        }, 0);
                        
                        // 重新发送消息
                        startEventStream(newContent);
                    }
                } else {
                    // 如果内容没有改变，直接恢复原样
                    messageDiv.replaceChild(contentDiv, textarea);
                    actionsDiv.removeChild(btnContainer);
                }
            };
            
            // 取消按钮点击事件
            cancelBtn.onclick = () => {
                messageDiv.replaceChild(contentDiv, textarea);
                actionsDiv.removeChild(btnContainer);
            };
            
            btnContainer.appendChild(saveBtn);
            btnContainer.appendChild(cancelBtn);
            actionsDiv.appendChild(btnContainer);
            
            // 添加键盘快捷键
            textarea.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + Enter 保存
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    saveBtn.click();
                }
                // Escape 取消
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelBtn.click();
                }
            });
        };
        actionsDiv.appendChild(editBtn);
    }
    
    // 删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'p-1 hover:bg-red-200 rounded text-red-500 text-sm flex items-center gap-1';
    deleteBtn.innerHTML = `
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
        删除
    `;
    deleteBtn.onclick = () => {
        if (confirm('确定要删除这条消息吗？')) {
            // 添加退出动画
            messageDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease, max-height 0.3s ease';
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(-10px)';
            messageDiv.style.maxHeight = '0';
            messageDiv.style.overflow = 'hidden';
            messageDiv.style.marginTop = '0';
            messageDiv.style.marginBottom = '0';
            messageDiv.style.padding = '0';
            
            setTimeout(() => {
                // 更新本地存储
                const chatData = JSON.parse(localStorage.getItem(`chat_${currentChatId}`));
                chatData.messages = chatData.messages.filter(
                    msg => msg.timestamp !== parseInt(messageDiv.dataset.timestamp)
                );
                localStorage.setItem(`chat_${currentChatId}`, JSON.stringify(chatData));
                
                // 移除消息元素
                messageDiv.remove();
            }, 300);
        }
    };
    
    actionsDiv.appendChild(copyBtn);
    actionsDiv.appendChild(deleteBtn);
    
    headerDiv.appendChild(senderDiv);
    headerDiv.appendChild(actionsDiv);
    messageDiv.appendChild(headerDiv);
    
    // 消息内容
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(content));
    
    // 添加代码高亮
    setTimeout(() => {
        contentDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    }, 0);
    
    messageDiv.appendChild(contentDiv);
    
    // 添加鼠标悬停效果
    messageDiv.addEventListener('mouseenter', () => {
        actionsDiv.classList.remove('opacity-0');
        // 添加轻微上浮效果
        messageDiv.style.transform = 'translateY(-2px)';
        messageDiv.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    });
    
    messageDiv.addEventListener('mouseleave', () => {
        // 如果不在编辑状态才隐藏操作按钮
        if (!messageDiv.querySelector('textarea')) {
            actionsDiv.classList.add('opacity-0');
        }
        // 恢复原状
        messageDiv.style.transform = '';
        messageDiv.style.boxShadow = '';
    });
    
    // 添加出现动画
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(20px)';
    
    chatArea.appendChild(messageDiv);
    
    // 触发动画
    setTimeout(() => {
        messageDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    }, 10);
    
    chatArea.scrollTop = chatArea.scrollHeight;

    if (saveToStorage && currentChatId) {
        const chatData = JSON.parse(localStorage.getItem(`chat_${currentChatId}`) || '{"name": "新聊天", "messages": []}');
        chatData.messages.push({ 
            content, 
            isAssistant, 
            timestamp,
            status
        });
        localStorage.setItem(`chat_${currentChatId}`, JSON.stringify(chatData));
        updateChatList();
    }
    
    return messageDiv;
}

function startEventStream(message) {
    const userName = document.getElementById('userNameInput').value.trim();
    if (!userName) {
        alert('请输入用户名');
        return;
    }

    // 保存当前会话ID，用于确保消息保存到正确的聊天中
    const currentSessionChatId = currentChatId;

    if (currentEventSource) {
        currentEventSource.close();
    }
    
    // 切换按钮显示状态 - 隐藏发送按钮，显示停止按钮
    submitBtn.style.display = 'none';
    stopBtn.style.display = 'flex';

    // 添加用户消息，状态为已完成
    appendMessage(message, false, true, 'completed');
    
    // 创建AI回复的占位消息，状态为发送中
    const timestamp = Date.now();
    appendMessage('', true, false, 'sending', timestamp);

    const ragTag = document.getElementById('ragSelect').value;
    const aiModelSelect = document.getElementById('aiModel');
    const aiModelValue = aiModelSelect.value;
    const aiModelModel = aiModelSelect.options[aiModelSelect.selectedIndex].getAttribute('model');

    let url;
    if (ragTag) {
        url = `http://127.0.0.1:8090/api/v1/${aiModelValue}/generate_stream_rag?message=${encodeURIComponent(message)}&ragTag=${encodeURIComponent(ragTag)}&model=${encodeURIComponent(aiModelModel)}&user=${encodeURIComponent(userName)}`;
    } else {
        url = `http://127.0.0.1:8090/api/v1/${aiModelValue}/generate_stream_dify?message=${encodeURIComponent(message)}&model=${encodeURIComponent(aiModelModel)}&user=${encodeURIComponent(userName)}`;
    }

    currentEventSource = new EventSource(url);
    let accumulatedContent = '';

    currentEventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            
            // 重置超时计时器
            if (window.aiResponseTimer) {
                clearTimeout(window.aiResponseTimer);
            }

            if (data.result?.output?.content) {
                const newContent = data.result.output.content;
                accumulatedContent += newContent;

                // 立即保存部分回复到localStorage，即使是部分回复也保存
                savePartialAIResponse(currentSessionChatId, timestamp, accumulatedContent);

                // 如果当前聊天ID与会话开始时的ID相同，则更新UI
                if (currentChatId === currentSessionChatId) {
                    // 更新最后一条消息的内容和状态
                    const lastMessage = chatArea.lastElementChild;
                    if (lastMessage) {
                        const contentDiv = lastMessage.querySelector('.message-content');
                        if (contentDiv) {
                            contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(accumulatedContent));
                            
                            // 如果有内容，更新状态为"接收中"而不是"发送中"
                            if (accumulatedContent.trim().length > 0) {
                                const statusSpan = lastMessage.querySelector('span.text-yellow-500, span.text-red-500');
                                if (statusSpan) {
                                    statusSpan.className = 'text-green-500';
                                    statusSpan.textContent = '接收中...';
                                }
                            }
                        }
                        
                        lastMessage.dataset.status = 'sending';
                        
                        // 确保停止按钮可见
                        const stopBtn = lastMessage.querySelector('.stop-btn');
                        if (stopBtn) {
                            stopBtn.style.opacity = '1';
                        }
                        
                        // 应用代码高亮
                        lastMessage.querySelectorAll('pre code').forEach((block) => {
                            hljs.highlightBlock(block);
                        });
                    }
                    chatArea.scrollTop = chatArea.scrollHeight;
                }
                
                // 设置5秒超时，如果5秒内没有新内容则认为AI已完成回答
                window.aiResponseTimer = setTimeout(() => {
                    // 完成时保存最终内容
                    saveCompletedAIResponse(currentSessionChatId, timestamp, accumulatedContent);
                    
                    // 恢复按钮状态
                    submitBtn.style.display = 'flex'; 
                    stopBtn.style.display = 'none';
                    
                    // 仅当当前仍在同一个聊天中时更新UI
                    if (currentChatId === currentSessionChatId) {
                        const lastMessage = chatArea.lastElementChild;
                        if (lastMessage && lastMessage.dataset.status === 'sending') {
                            const statusSpan = lastMessage.querySelector('span.text-green-500');
                            if (statusSpan) {
                                statusSpan.remove();
                            }
                            lastMessage.dataset.status = 'completed';
                            
                            // 移除停止按钮
                            const stopBtn = lastMessage.querySelector('.stop-btn');
                            if (stopBtn) {
                                stopBtn.remove();
                            }
                        }
                    }
                    
                    // 关闭连接
                    if (currentEventSource) {
                        currentEventSource.close();
                        currentEventSource = null;
                    }
                }, 5000);
            }

            if (data.result?.output?.properties?.finishReason === 'STOP') {
                // 清除超时计时器
                if (window.aiResponseTimer) {
                    clearTimeout(window.aiResponseTimer);
                }
                
                currentEventSource.close();
                currentEventSource = null;

                // 完成时保存最终内容
                saveCompletedAIResponse(currentSessionChatId, timestamp, accumulatedContent);
                
                // 恢复按钮状态
                submitBtn.style.display = 'flex'; 
                stopBtn.style.display = 'none';
                
                // 仅当当前仍在同一个聊天中时更新UI
                if (currentChatId === currentSessionChatId) {
                    // 更新消息状态为已完成
                    const lastMessage = chatArea.lastElementChild;
                    if (lastMessage) {
                        const statusSpan = lastMessage.querySelector('span.text-yellow-500, span.text-red-500, span.text-green-500');
                        if (statusSpan) {
                            statusSpan.remove();
                        }
                        lastMessage.dataset.status = 'completed';
                        
                        // 移除停止按钮
                        const stopBtn = lastMessage.querySelector('.stop-btn');
                        if (stopBtn) {
                            stopBtn.remove();
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error parsing event data:', e);
        }
    };

    currentEventSource.onerror = function(error) {
        console.error('EventSource error:', error);
        currentEventSource.close();
        currentEventSource = null;
        
        // 清除超时计时器
        if (window.aiResponseTimer) {
            clearTimeout(window.aiResponseTimer);
        }
        
        // 恢复按钮状态
        submitBtn.style.display = 'flex'; 
        stopBtn.style.display = 'none';
        
        // 如果有部分内容，保存为完成状态
        if (accumulatedContent.trim().length > 0) {
            saveCompletedAIResponse(currentSessionChatId, timestamp, accumulatedContent);
        }
        
        // 仅当当前仍在同一个聊天中时更新UI
        if (currentChatId === currentSessionChatId) {
            // 更新消息状态
            const lastMessage = chatArea.lastElementChild;
            if (lastMessage && lastMessage.dataset.status === 'sending') {
                const contentDiv = lastMessage.querySelector('.message-content');
                // 如果已经有内容，说明部分消息已经接收到，标记为完成而不是失败
                if (contentDiv && contentDiv.textContent.trim().length > 0) {
                    const statusSpan = lastMessage.querySelector('span.text-yellow-500, span.text-red-500, span.text-green-500');
                    if (statusSpan) {
                        statusSpan.remove();
                    }
                    lastMessage.dataset.status = 'completed';
                    
                    // 移除停止按钮
                    const stopBtn = lastMessage.querySelector('.stop-btn');
                    if (stopBtn) {
                        stopBtn.remove();
                    }
                } else {
                    // 真正的错误，没有收到任何内容
                    const statusSpan = lastMessage.querySelector('span.text-yellow-500, span.text-red-500, span.text-green-500');
                    if (statusSpan) {
                        statusSpan.className = 'text-red-500';
                        statusSpan.textContent = '发送失败';
                    }
                    lastMessage.dataset.status = 'error';
                    
                    // 移除停止按钮
                    const stopBtn = lastMessage.querySelector('.stop-btn');
                    if (stopBtn) {
                        stopBtn.remove();
                    }
                }
            }
        }
    };
}

// 保存部分AI回复到localStorage
function savePartialAIResponse(chatId, timestamp, content) {
    if (!chatId) return;
    
    const chatData = JSON.parse(localStorage.getItem(`chat_${chatId}`) || '{"name": "新聊天", "messages": []}');
    
    // 检查是否已存在相同时间戳的消息
    const existingIndex = chatData.messages.findIndex(msg => 
        msg.isAssistant && msg.timestamp === timestamp
    );
    
    if (existingIndex !== -1) {
        // 更新现有消息
        chatData.messages[existingIndex].content = content;
        chatData.messages[existingIndex].status = 'sending';
    } else {
        // 添加新消息
        chatData.messages.push({ 
            content: content, 
            isAssistant: true, 
            timestamp: timestamp,
            status: 'sending'
        });
    }
    
    localStorage.setItem(`chat_${chatId}`, JSON.stringify(chatData));
    // 不要在这里调用updateChatList，避免频繁更新UI
}

// 保存完成的AI回复到localStorage
function saveCompletedAIResponse(chatId, timestamp, content) {
    if (!chatId) return;
    
    const chatData = JSON.parse(localStorage.getItem(`chat_${chatId}`) || '{"name": "新聊天", "messages": []}');
    
    // 检查是否已存在相同时间戳的消息
    const existingIndex = chatData.messages.findIndex(msg => 
        msg.isAssistant && msg.timestamp === timestamp
    );
    
    if (existingIndex !== -1) {
        // 更新现有消息
        chatData.messages[existingIndex].content = content;
        chatData.messages[existingIndex].status = 'completed';
    } else {
        // 添加新消息
        chatData.messages.push({ 
            content: content, 
            isAssistant: true, 
            timestamp: timestamp,
            status: 'completed'
        });
    }
    
    localStorage.setItem(`chat_${chatId}`, JSON.stringify(chatData));
    updateChatList(); // 更新聊天列表，这里可以更新UI因为是完成状态
}

// 保存AI回复为已停止状态
function saveStoppedAIResponse(chatId, timestamp, content) {
    if (!chatId) return;
    
    const chatData = JSON.parse(localStorage.getItem(`chat_${chatId}`) || '{"name": "新聊天", "messages": []}');
    
    // 检查是否已存在相同时间戳的消息
    const existingIndex = chatData.messages.findIndex(msg => 
        msg.isAssistant && msg.timestamp === timestamp
    );
    
    if (existingIndex !== -1) {
        // 更新现有消息
        chatData.messages[existingIndex].content = content;
        chatData.messages[existingIndex].status = 'stopped';
    } else {
        // 添加新消息
        chatData.messages.push({ 
            content: content, 
            isAssistant: true, 
            timestamp: timestamp,
            status: 'stopped'
        });
    }
    
    localStorage.setItem(`chat_${chatId}`, JSON.stringify(chatData));
    updateChatList(); // 更新聊天列表
}

submitBtn.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (!message) return;

    if (!currentChatId) {
        createNewChat();
    }

    messageInput.value = '';
    startEventStream(message);
});

stopBtn.addEventListener('click', () => {
    // 不管currentEventSource是否存在，都先重置UI
    // 恢复按钮状态
    submitBtn.style.display = 'flex'; 
    stopBtn.style.display = 'none';
    
    if (currentEventSource) {
        // 关闭消息流
        currentEventSource.close();
        currentEventSource = null;
        
        // 清除超时计时器
        if (window.aiResponseTimer) {
            clearTimeout(window.aiResponseTimer);
        }
        
        // 更新最后一条消息的状态
        const lastMessage = chatArea.lastElementChild;
        if (lastMessage && lastMessage.dataset.status === 'sending') {
            // 更新UI显示
            const statusSpan = lastMessage.querySelector('span.text-yellow-500, span.text-red-500, span.text-green-500');
            if (statusSpan) {
                statusSpan.className = 'text-red-500';
                statusSpan.innerHTML = '已停止';
            }
            
            // 移除消息中的停止按钮
            const messageStopBtn = lastMessage.querySelector('.stop-btn');
            if (messageStopBtn) {
                messageStopBtn.remove();
            }
            
            // 更新消息状态
            lastMessage.dataset.status = 'stopped';
            
            // 保存部分内容
            const contentDiv = lastMessage.querySelector('.message-content');
            if (contentDiv && currentChatId) {
                const partialContent = contentDiv.textContent;
                const timestamp = parseInt(lastMessage.dataset.timestamp);
                saveStoppedAIResponse(currentChatId, timestamp, partialContent);
            }
        }
    } else {
        console.log("没有活动的消息流，但已重置UI状态");
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitBtn.click();
    }
});

newChatBtn.addEventListener('click', createNewChat);

toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
    updateSidebarIcon();
});

function updateSidebarIcon() {
    const iconPath = document.getElementById('sidebarIconPath');
    if (sidebar.classList.contains('-translate-x-full')) {
        iconPath.setAttribute('d', 'M4 6h16M4 12h4m12 0h-4M4 18h16');
    } else {
        iconPath.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
    }
}

// Initialize
updateChatList();
const savedChatId = localStorage.getItem('currentChatId');
if (savedChatId) {
    loadChat(savedChatId);
}

// Handle window resize for responsive design
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('-translate-x-full');
    } else {
        sidebar.classList.add('-translate-x-full');
    }
});

// Initial check for mobile devices
if (window.innerWidth <= 768) {
    sidebar.classList.add('-translate-x-full');
}

updateSidebarIcon();

// 上传知识下拉菜单控制
const uploadMenuButton = document.getElementById('uploadMenuButton');
const uploadMenu = document.getElementById('uploadMenu');

// 切换菜单显示
uploadMenuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    uploadMenu.classList.toggle('hidden');
});

// 点击外部区域关闭菜单
document.addEventListener('click', (e) => {
    if (!uploadMenu.contains(e.target) && e.target !== uploadMenuButton) {
        uploadMenu.classList.add('hidden');
    }
});

// 菜单项点击后关闭菜单
document.querySelectorAll('#uploadMenu a').forEach(item => {
    item.addEventListener('click', () => {
        uploadMenu.classList.add('hidden');
    });
});

// 初始化代码高亮
function initializeCodeHighlighting() {
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });
}

// 在处理消息时调用代码高亮
function processMessage(message) {
    const html = marked.parse(message);
    const sanitizedHtml = DOMPurify.sanitize(html);
    const messageElement = document.createElement('div');
    messageElement.innerHTML = sanitizedHtml;
    
    // 添加代码高亮
    messageElement.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });
    
    return messageElement;
}

// 批量删除选中的聊天
function batchDeleteChats() {
    const selectedChats = document.querySelectorAll('.chat-select-checkbox:checked');
    if (selectedChats.length === 0) return;
    
    if (confirm(`确定要删除选中的 ${selectedChats.length} 个聊天吗？`)) {
        selectedChats.forEach(checkbox => {
            const chatId = checkbox.getAttribute('data-chat-id');
            localStorage.removeItem(`chat_${chatId}`);
            
            // 如果删除了当前聊天，创建一个新的
            if (currentChatId === chatId) {
                createNewChat();
            }
        });
        
        // 切换回正常模式
        toggleSelectMode();
        
        // 更新UI
        updateChatList();
    }
}

// 切换选择模式
function toggleSelectMode() {
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    const selectAllBtn = document.getElementById('selectAllChats');
    
    if (batchDeleteBtn.classList.contains('hidden')) {
        // 进入选择模式
        batchDeleteBtn.classList.remove('hidden');
        selectAllBtn.textContent = '取消';
    } else {
        // 退出选择模式
        batchDeleteBtn.classList.add('hidden');
        selectAllBtn.textContent = '全选';
    }
    
    // 更新列表显示
    updateChatList();
}

// 全选/取消全选
function toggleSelectAll() {
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    const selectAllBtn = document.getElementById('selectAllChats');
    
    // 如果是"取消"按钮，则退出选择模式
    if (selectAllBtn.textContent === '取消') {
        toggleSelectMode();
        return;
    }
    
    // 否则是"全选"按钮
    if (batchDeleteBtn.classList.contains('hidden')) {
        // 当前不是选择模式，进入选择模式
        toggleSelectMode();
        
        // 等待DOM更新后选中所有复选框
        setTimeout(() => {
            const allCheckboxes = document.querySelectorAll('.chat-select-checkbox');
            allCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        }, 0);
        
        return;
    }
    
    // 已经是选择模式，检查是全选还是取消全选
    const allCheckboxes = document.querySelectorAll('.chat-select-checkbox');
    const allChecked = document.querySelectorAll('.chat-select-checkbox:checked').length === allCheckboxes.length;
    
    allCheckboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
    });
}

// 初始化事件监听
(function initializeEventListeners() {
    // 确保DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupListeners);
    } else {
        setupListeners();
    }
    
    function setupListeners() {
        // 批量删除和全选按钮事件监听
        const batchDeleteBtn = document.getElementById('batchDeleteBtn');
        const selectAllChats = document.getElementById('selectAllChats');
        
        if (batchDeleteBtn) {
            batchDeleteBtn.addEventListener('click', batchDeleteChats);
        } else {
            console.error('批量删除按钮未找到');
        }
        
        if (selectAllChats) {
            selectAllChats.addEventListener('click', toggleSelectAll);
        } else {
            console.error('全选按钮未找到');
        }
    }
})();

// 初始化动画和交互增强
function initializeAnimations() {
    // 添加状态文本动画
    addLoadingDotsAnimation();
    
    // 添加消息出现动画
    addMessageAppearanceAnimation();
    
    // 添加输入框焦点效果
    addInputFocusEffects();
    
    // 添加按钮点击波纹效果
    addButtonRippleEffects();
    
    // 添加滚动平滑效果
    document.querySelector('#chatArea').style.scrollBehavior = 'smooth';
    
    // 增强代码块
    enhanceCodeBlocks();
}

// 为状态文本添加动画点
function addLoadingDotsAnimation() {
    // 替换所有状态文本中的"发送中..."和"接收中..."为带动画的点
    function updateStatusSpans() {
        document.querySelectorAll('.text-yellow-500, .text-green-500').forEach(span => {
            if (span.textContent.includes('中...') && !span.querySelector('.loading-dots')) {
                const baseText = span.textContent.replace('...', '');
                span.innerHTML = `${baseText} <span class="loading-dots"><span></span><span></span><span></span></span>`;
            }
        });
    }
    
    // 初始运行一次，之后定期检查新增的状态文本
    updateStatusSpans();
    setInterval(updateStatusSpans, 1000);
}

// 添加消息出现的动画效果
function addMessageAppearanceAnimation() {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('markdown-body')) {
                        // 为新增的消息添加动画
                        node.style.opacity = '0';
                        node.style.transform = 'translateY(20px)';
                        
                        setTimeout(() => {
                            node.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                            node.style.opacity = '1';
                            node.style.transform = 'translateY(0)';
                        }, 10);
                    }
                });
            }
        });
    });
    
    observer.observe(chatArea, { childList: true, subtree: true });
}

// 添加输入框焦点效果
function addInputFocusEffects() {
    const messageInput = document.getElementById('messageInput');
    const messageContainer = messageInput.closest('.border');
    
    messageInput.addEventListener('focus', () => {
        messageContainer.classList.add('shadow-md');
        messageContainer.style.borderColor = 'var(--primary-color)';
    });
    
    messageInput.addEventListener('blur', () => {
        messageContainer.classList.remove('shadow-md');
        messageContainer.style.borderColor = '';
    });
    
    // 输入时自动调整高度
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(200, messageInput.scrollHeight) + 'px';
    });
}

// 为按钮添加波纹效果
function addButtonRippleEffects() {
    const buttons = document.querySelectorAll('button');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            ripple.style.position = 'absolute';
            ripple.style.width = '1px';
            ripple.style.height = '1px';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(255, 255, 255, 0.4)';
            ripple.style.transform = 'scale(0)';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.style.animation = 'ripple 0.6s ease-out';
            
            button.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// 增强代码块显示和功能
function enhanceCodeBlocks() {
    // 初始运行一次，处理已有的代码块
    processExistingCodeBlocks();
    
    // 使用MutationObserver监听新增的代码块
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        const codeBlocks = node.querySelectorAll('pre code');
                        if (codeBlocks.length) {
                            codeBlocks.forEach(enhanceSingleCodeBlock);
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(chatArea, { childList: true, subtree: true });
}

// 处理页面上已存在的代码块
function processExistingCodeBlocks() {
    document.querySelectorAll('pre code').forEach(enhanceSingleCodeBlock);
}

// 增强单个代码块
function enhanceSingleCodeBlock(codeBlock) {
    const preBlock = codeBlock.parentElement;
    
    // 避免重复处理
    if (preBlock.classList.contains('enhanced')) return;
    preBlock.classList.add('enhanced');
    
    // 设置样式
    preBlock.style.backgroundColor = '#1e1e1e';
    preBlock.style.color = '#d4d4d4';
    preBlock.style.borderRadius = '0.5rem';
    preBlock.style.position = 'relative';
    preBlock.style.padding = '1.75rem 1rem 1rem 1rem';
    preBlock.style.marginTop = '1rem';
    preBlock.style.marginBottom = '1rem';
    
    // 添加语言标签
    let language = '';
    if (codeBlock.className) {
        const match = codeBlock.className.match(/language-(\w+)/);
        if (match) {
            language = match[1].toUpperCase();
        }
    }
    
    // 创建语言标签和复制按钮的容器
    const headerDiv = document.createElement('div');
    headerDiv.style.position = 'absolute';
    headerDiv.style.top = '0';
    headerDiv.style.left = '0';
    headerDiv.style.right = '0';
    headerDiv.style.padding = '0.15rem 0.5rem';
    headerDiv.style.height = '24px';
    headerDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    headerDiv.style.borderTopLeftRadius = '0.5rem';
    headerDiv.style.borderTopRightRadius = '0.5rem';
    headerDiv.style.display = 'flex';
    headerDiv.style.justifyContent = 'space-between';
    headerDiv.style.alignItems = 'center';
    
    // 语言标签
    if (language) {
        const langSpan = document.createElement('span');
        langSpan.textContent = language;
        langSpan.style.fontSize = '0.65rem';
        langSpan.style.color = '#9ca3af';
        headerDiv.appendChild(langSpan);
    }
    
    // 创建复制按钮
    const copyButton = document.createElement('button');
    copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    `;
    copyButton.style.background = 'transparent';
    copyButton.style.border = 'none';
    copyButton.style.color = '#9ca3af';
    copyButton.style.cursor = 'pointer';
    copyButton.style.padding = '0.15rem';
    copyButton.style.width = '24px';
    copyButton.style.height = '24px';
    copyButton.style.display = 'flex';
    copyButton.style.alignItems = 'center';
    copyButton.style.justifyContent = 'center';
    copyButton.style.borderRadius = '0.25rem';
    copyButton.title = '复制代码';
    
    // 复制功能
    copyButton.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // 获取纯文本内容
        const codeText = codeBlock.textContent;
        
        // 复制到剪贴板
        navigator.clipboard.writeText(codeText).then(() => {
            // 显示成功状态
            const originalHTML = copyButton.innerHTML;
            copyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
            copyButton.style.color = '#10b981';
            
            // 2秒后恢复
            setTimeout(() => {
                copyButton.innerHTML = originalHTML;
                copyButton.style.color = '#9ca3af';
            }, 2000);
        }).catch(err => {
            console.error('无法复制代码:', err);
            
            // 显示错误状态
            copyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;
            copyButton.style.color = '#ef4444';
            
            // 2秒后恢复
            setTimeout(() => {
                copyButton.innerHTML = originalHTML;
                copyButton.style.color = '#9ca3af';
            }, 2000);
        });
    });
    
    // 鼠标悬停效果
    copyButton.addEventListener('mouseenter', () => {
        copyButton.style.color = '#d4d4d4';
        copyButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });
    
    copyButton.addEventListener('mouseleave', () => {
        copyButton.style.color = '#9ca3af';
        copyButton.style.backgroundColor = 'transparent';
    });
    
    headerDiv.appendChild(copyButton);
    preBlock.insertBefore(headerDiv, preBlock.firstChild);
    
    // 尝试应用语法高亮
    if (typeof hljs !== 'undefined') {
        hljs.highlightBlock(codeBlock);
    }
}

// 初始设置按钮状态 - 页面加载后立即执行
(function() {
    // 立即强制初始化按钮状态
    if (submitBtn && stopBtn) {
        submitBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
    }
})();

// 添加一个自动检查和修复按钮状态的函数
function ensureCorrectButtonState() {
    // 如果两个按钮都隐藏了，显示发送按钮
    if (submitBtn.style.display === 'none' && stopBtn.style.display === 'none') {
        console.log('检测到两个按钮都隐藏，修复状态');
        submitBtn.style.display = 'flex';
    }
    
    // 如果两个按钮都显示了，隐藏停止按钮
    if (submitBtn.style.display !== 'none' && stopBtn.style.display !== 'none') {
        console.log('检测到两个按钮都显示，修复状态');
        stopBtn.style.display = 'none';
    }
    
    // 如果没有活动的消息流，确保显示发送按钮
    if (!currentEventSource && submitBtn.style.display === 'none') {
        console.log('没有活动消息流但发送按钮隐藏，修复状态');
        submitBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
    }
    
    // 如果有活动的消息流，确保显示停止按钮
    if (currentEventSource && stopBtn.style.display === 'none') {
        console.log('有活动消息流但停止按钮隐藏，修复状态');
        submitBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
    }
}

// 定期检查按钮状态
setInterval(ensureCorrectButtonState, 2000);

// 立即运行一次检查
setTimeout(ensureCorrectButtonState, 1000);
