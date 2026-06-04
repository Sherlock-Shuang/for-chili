import { ui } from './ui.js';
import { sendMessage } from './api.js';
import { storage } from './storage.js';

let isInputLocked = false;
let currentChatId = null;
let currentMessages = [];

class AudioQueue {
    constructor() {
        this.queue = [];
        this.isPlaying = false;
        this.audioElement = new Audio();
        this.audioElement.addEventListener('ended', () => this.playNext());
    }
    enqueue(base64) {
        this.queue.push(base64);
        if (!this.isPlaying) this.playNext();
    }
    playNext() {
        if (this.queue.length === 0) {
            this.isPlaying = false;
            return;
        }
        this.isPlaying = true;
        const base64 = this.queue.shift();
        this.audioElement.src = "data:audio/mp3;base64," + base64;
        this.audioElement.play().catch(e => {
            console.error("Audio play failed", e);
            this.playNext();
        });
    }
}
const audioQueue = new AudioQueue();

export function setupEventListeners() {
    const userInput = document.getElementById('user-input');



    // 侧边栏折叠/展开联动
    const toggleSidebar = () => {
        document.body.classList.toggle('sidebar-collapsed');
    };
    const sidebarMenuBtn = document.querySelector('.sidebar-menu-btn');
    const mainMenuBtn = document.getElementById('main-menu-btn');
    if (sidebarMenuBtn) sidebarMenuBtn.addEventListener('click', toggleSidebar);
    if (mainMenuBtn) mainMenuBtn.addEventListener('click', toggleSidebar);

    // 发起新对话按钮
    const newChatBtn = document.querySelector('.new-chat-btn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            if (isInputLocked) return;
            startNewChat();
        });
    }

    userInput.addEventListener('keydown', async (e) => {
        if (isInputLocked) {
            e.preventDefault();
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            const text = userInput.value.trim();
            if (text) {
                userInput.value = '';
                await handleUserMessage(text, userInput);
            }
        }
    });

    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', async (e) => {
            if (isInputLocked) return;
            const text = userInput.value.trim();
            if (text) {
                userInput.value = '';
                await handleUserMessage(text, userInput);
            }
        });
    }

    // 导出并分享对话（或下载 txt）
    const exportBtn = document.getElementById('export-chat-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            if (currentMessages.length === 0) {
                alert("当前记忆还是空白的，先聊点什么吧。");
                return;
            }
            
            let exportText = "=== 辣椒的回忆录 ===\n\n";
            exportText += `导出时间：${new Date().toLocaleString()}\n`;
            exportText += "===========================\n\n";
            
            currentMessages.forEach(msg => {
                const roleName = msg.role === 'user' ? '曾爽' : '老姐';
                exportText += `【${roleName}】:\n${msg.content}\n\n`;
            });
            
            // 尝试调用系统的原生分享面板
            if (navigator.share) {
                try {
                    const file = new File([exportText], `辣椒_回忆录.txt`, { type: "text/plain" });
                    await navigator.share({
                        title: '辣椒的回忆录',
                        text: '这是我和老姐的一段记忆交流...',
                        files: [file]
                    });
                    return; // 如果分享成功，就不用走下面的下载逻辑了
                } catch (e) {
                    console.log("分享接口调用取消或设备不支持该文件类型分享，回滚至本地下载");
                }
            }
            
            // 回滚：标准文件下载
            const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `辣椒_回忆录_${new Date().getTime()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // 设置 Modal 逻辑与 Tab 切换
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const savePromptBtn = document.getElementById('save-prompt-btn');
    const resetPromptBtn = document.getElementById('reset-prompt-btn');
    
    // 三个板块的 Textarea
    const roleEditor = document.getElementById('prompt-role');
    const memoryEditor = document.getElementById('prompt-memory');
    const constraintsEditor = document.getElementById('prompt-constraints');

    // 解析与提取分离的板块
    const loadPromptIntoEditors = (text) => {
        const roleMatch = text.match(/<role>([\s\S]*?)<\/role>/);
        const memoryMatch = text.match(/<memory_core>([\s\S]*?)<\/memory_core>/);
        const constraintsMatch = text.match(/<output_constraints>([\s\S]*?)<\/output_constraints>/);
        
        if(roleEditor) roleEditor.value = roleMatch ? roleMatch[1].replace(/^\n|\n$/g, '') : "";
        if(memoryEditor) memoryEditor.value = memoryMatch ? memoryMatch[1].replace(/^\n|\n$/g, '') : "";
        if(constraintsEditor) constraintsEditor.value = constraintsMatch ? constraintsMatch[1].replace(/^\n|\n$/g, '') : "";
    };

    // 将各个板块组装回给模型的长 Prompt
    const getAssembledPrompt = () => {
        return `<role>\n${roleEditor.value}\n</role>\n\n<memory_core>\n${memoryEditor.value}\n</memory_core>\n\n<output_constraints>\n${constraintsEditor.value}\n</output_constraints>`;
    };
    
    // Tab 导航改为了多层级导航
    const menuItems = document.querySelectorAll('.menu-item');
    const settingsMenu = document.getElementById('settings-menu');
    const settingsDetail = document.getElementById('settings-detail');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    const detailContents = document.querySelectorAll('.detail-content');
    const detailTitle = document.getElementById('detail-title');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // 隐藏第一层菜单
            settingsMenu.classList.add('hidden');
            // 显示第二层详情
            settingsDetail.classList.remove('hidden');
            
            // 隐藏所有单独的内容区域
            detailContents.forEach(c => c.style.display = 'none');
            // 激活匹配的内容区域
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).style.display = 'flex';
            
            // 同步标题
            detailTitle.textContent = item.querySelector('h3').textContent;
        });
    });

    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', () => {
            // 退回第一层
            settingsDetail.classList.add('hidden');
            settingsMenu.classList.remove('hidden');
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', async () => {
            settingsModal.classList.remove('hidden');
            // 每次打开时，默认重置回第一层目录
            if(settingsMenu && settingsDetail) {
                settingsMenu.classList.remove('hidden');
                settingsDetail.classList.add('hidden');
            }
            let currentPrompt = localStorage.getItem('custom_system_prompt');
            if (currentPrompt) {
                loadPromptIntoEditors(currentPrompt);
            } else {
                try {
                    const res = await fetch('/configs/prompt.txt');
                    const text = await res.text();
                    loadPromptIntoEditors(text);
                } catch (e) {
                    if (roleEditor) roleEditor.value = "加载默认提示词失败";
                }
            }
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
    }

    if (savePromptBtn) {
        savePromptBtn.addEventListener('click', () => {
            const assembled = getAssembledPrompt();
            localStorage.setItem('custom_system_prompt', assembled);
            settingsModal.classList.add('hidden');
            ui.addSystemLog('SYSTEM PROMPT UPDATED MANUALLY');
            alert("设定分块修改已保存！这些改动将立即对后续的对话生效。");
        });
    }

    if (resetPromptBtn) {
        resetPromptBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/configs/prompt.txt');
                const text = await res.text();
                loadPromptIntoEditors(text);
                localStorage.removeItem('custom_system_prompt');
                alert("已清除个人设定，恢复出厂默认值！");
            } catch (e) {
                alert("加载默认提示词失败");
            }
        });
    }

    // 处理消息编辑按钮
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        chatContainer.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.edit-btn');
            if (editBtn && !isInputLocked) {
                const messageDiv = editBtn.closest('.message');
                // 找出它是第几个消息（注意要过滤掉非消息节点，或者直接按索引）
                const allMessageDivs = Array.from(chatContainer.querySelectorAll('.message:not(.loading-message)'));
                const index = allMessageDivs.indexOf(messageDiv);
                
                if (index !== -1 && currentMessages[index]) {
                    const originalText = currentMessages[index].content;
                    
                    // 1. 将内容填回输入框
                    userInput.value = originalText;
                    userInput.focus();
                    
                    // 2. 逻辑回滚：截断消息数组（从当前编辑的这条开始往后全部删除）
                    ui.addSystemLog(`TIMELINE_ROLLBACK: Editing message at index ${index}`);
                    currentMessages = currentMessages.slice(0, index);
                    
                    // 3. UI回滚：删除 DOM
                    for (let i = allMessageDivs.length - 1; i >= index; i--) {
                        allMessageDivs[i].remove();
                    }
                    
                    // 4. 保存状态
                    storage.saveChat({ id: currentChatId, title: document.getElementById('top-chat-title').textContent, messages: currentMessages });
                    
                    // 如果删完了，显示欢迎页
                    if (currentMessages.length === 0) {
                        ui.clearChat();
                    }
                }
            }
        });
    }
}

export function loadInitialState() {
    refreshSidebar();

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.classList.add('unlocked');
    }
}

function startNewChat() {
    currentChatId = null;
    currentMessages = [];
    ui.clearChat();
    refreshSidebar();
}

function switchChat(id) {
    if (isInputLocked) return;

    const chat = storage.getChat(id);
    if (!chat) return;

    currentChatId = chat.id;
    currentMessages = chat.messages || [];

    ui.clearChat();
    currentMessages.forEach(msg => {
        ui.appendMessageImmediate(msg.content, msg.role, msg.imageUrl);
    });

    ui.setChatTitle(chat.title);
    ui.updateSidebarActive(currentChatId);
}

function refreshSidebar() {
    const chats = storage.getChats();
    ui.renderSidebarChats(chats, currentChatId, switchChat);
}

// 模拟还没发送时人工智能的抢答/自发反馈
function triggerTypingEasterEgg(replyContent) {
    let isNewChat = false;
    if (!currentChatId) {
        currentChatId = 'chat_' + Date.now();
        isNewChat = true;
        let title = "（共鸣）";
        storage.saveChat({ id: currentChatId, title: title, messages: currentMessages });
        ui.setChatTitle(title);
        refreshSidebar();
    }

    ui.addSystemLog(`EASTER_EGG_MIND_READER: Detected keywords during typing.`);

    setTimeout(async () => {
        // 先上屏
        await ui.appendMessage(replyContent, 'assistant');
        // 保存入上下文，这样大模型接下来的问答会顺着这段插曲聊下去
        currentMessages.push({ role: 'assistant', content: replyContent });
        const currentChat = storage.getChat(currentChatId);
        storage.saveChat({ id: currentChatId, title: currentChat ? currentChat.title : "（共鸣）", messages: currentMessages });
    }, 600); // 稍微延迟一丢丢假装在读取
}

async function handleUserMessage(text, inputField) {
    isInputLocked = true;
    inputField.disabled = true;

    // 如果还没有 chatId，说明是新建的对话首次发送
    let isNewChat = false;
    if (!currentChatId) {
        currentChatId = 'chat_' + Date.now();
        isNewChat = true;
    }

    currentMessages.push({ role: 'user', content: text });

    let title = text.substring(0, 15);
    if (text.length > 15) title += '...';

    storage.saveChat({ id: currentChatId, title: title, messages: currentMessages });
    ui.setChatTitle(title);

    if (isNewChat) {
        refreshSidebar();
        // 异步请求 AI 为这句话生成一个简短标题（静默替换，不阻塞聊天流程）
        setTimeout(async () => {
            try {
                const titlePrompt = `【系统最高指令：忽略所有之前的记忆、性格设定，不进行角色扮演。直接为下面这整段话提取一个概括性主旨标题，字数不能超过8个字，不要带引号或任何标点，直接只输出标题文字】：\n\n${text}`;
                const genTitleData = await sendMessage([{ role: 'user', content: titlePrompt }]);
                const genTitle = genTitleData.reply;
                if (genTitle && genTitle.length > 0 && genTitle.length <= 20) {
                    const cleanTitle = genTitle.replace(/["'”’。，]/g, '').trim();
                    const chatToUpdate = storage.getChat(currentChatId);
                    if (chatToUpdate) {
                        chatToUpdate.title = cleanTitle;
                        storage.saveChat(chatToUpdate);
                        refreshSidebar();
                        // 仅仅在目前还是当前对话时顺便更新顶部UI
                        const currentTitleEl = document.getElementById('top-chat-title');
                        if (currentTitleEl && currentTitleEl.textContent === title) {
                            ui.setChatTitle(cleanTitle);
                        }
                    }
                }
            } catch (e) { console.warn("异步生成标题失败", e); }
        }, 1500); // 稍微延迟，把主线程让给正常聊天的渲染
    }

    await ui.appendMessage(text, 'user');
    ui.addSystemLog(`USER_INPUT_RECEIVED: Length ${text.length}`);

    ui.showLoading(); // 展示等待动画

    ui.addSystemLog(`MIND_CORE_RESPONSE_RECEIVED (STREAMING)`);
    
    // 创建空的流式消息气泡
    const contentDiv = ui.createStreamingMessage('assistant');

    // 发送给后端，最多只带最近 20 条，其中已经包括了最新这条
    const uploadMessages = currentMessages.slice(-20);
    const customPromptForReply = localStorage.getItem('custom_system_prompt');
    
    const responseObj = await sendMessage(uploadMessages, customPromptForReply, (data) => {
        if (data.type === 'text') {
            ui.updateStreamingMessage(contentDiv, data.content);
        } else if (data.type === 'image') {
            ui.appendImageToStreamingMessage(contentDiv, data.url);
        } else if (data.type === 'audio') {
            ui.addSystemLog(`VOICE_SYNTHESIS_CHUNK_RECEIVED`);
            audioQueue.enqueue(data.base64);
        }
    });

    const reply = responseObj.reply;
    const imageUrl = responseObj.imageUrl;

    ui.removeLoading(); // 销毁等待动画

    currentMessages.push({ role: 'assistant', content: reply, imageUrl: imageUrl });
    storage.saveChat({ id: currentChatId, title: title, messages: currentMessages });

    isInputLocked = false;
    inputField.disabled = false;
    inputField.focus();
}
