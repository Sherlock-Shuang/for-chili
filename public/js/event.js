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

    // 主题切换逻辑
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
        // 读取本地存储
        const savedTheme = localStorage.getItem('app-theme') || 'wechat';
        themeSelector.value = savedTheme;
        if (savedTheme === 'wechat') {
            document.body.classList.add('wechat-style');
        } else {
            document.body.classList.remove('wechat-style');
        }

        themeSelector.addEventListener('change', (e) => {
            const theme = e.target.value;
            localStorage.setItem('app-theme', theme);
            if (theme === 'wechat') {
                document.body.classList.add('wechat-style');
            } else {
                document.body.classList.remove('wechat-style');
            }
        });
    }

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
            
            exportBtn.innerHTML = "打包中...";
            exportBtn.style.pointerEvents = 'none';

            let exportHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>辣椒的回忆录</title>
<style>
body { font-family: -apple-system, system-ui, sans-serif; background: #f3f3f3; margin: 0; padding: 20px; }
.message { display: flex; margin-bottom: 20px; align-items: flex-start; }
.message.user { flex-direction: row-reverse; }
.avatar { width: 40px; height: 40px; border-radius: 4px; flex-shrink: 0; display: flex; justify-content: center; align-items: center; font-weight: bold; color: white; }
.assistant-avatar { background: #07c160; margin-right: 12px; }
.user-avatar { background: #1aad19; margin-left: 12px; }
.bubble-container { display: flex; flex-direction: column; gap: 8px; max-width: 70%; align-items: flex-start; }
.message.user .bubble-container { align-items: flex-end; }
.msg-content { padding: 10px 14px; border-radius: 8px; font-size: 16px; word-wrap: break-word; line-height: 1.5; }
.message.user .msg-content { background-color: #95ec69; color: #000; }
.message.assistant .msg-content { background-color: #fff; color: #000; }
.audio-bubble { cursor: pointer; display: flex; align-items: center; gap: 6px; user-select: none; }
.text-translation { margin-top: 4px; font-size: 14px; color: #888; background: #e8e8e8; padding: 8px 12px; border-radius: 6px; display: none; }
.playing { opacity: 0.7; }
</style>
</head>
<body>
<div style="text-align: center; color: #888; margin-bottom: 30px; font-size: 14px;">
    === 辣椒的回忆录 ===<br>
    导出时间：${new Date().toLocaleString()}<br>
    <small>提示：点击气泡播放语音，右键/长按语音转文字</small>
</div>
<div id="chat-container">
`;

            for (const msg of currentMessages) {
                exportHtml += `<div class="message ${msg.role}">`;
                if (msg.role === 'assistant') {
                    exportHtml += `<div class="avatar assistant-avatar">老姐</div>`;
                } else {
                    exportHtml += `<div class="avatar user-avatar">我</div>`;
                }

                exportHtml += `<div class="bubble-container">`;

                if (msg.role === 'assistant' && msg.items && msg.items.length > 0) {
                    for (const item of msg.items) {
                        if (item.type === 'text') {
                            exportHtml += `<div class="msg-content">${item.content}</div>`;
                        } else if (item.type === 'audio_result' || item.type === 'audio_error') {
                            const ph = msg.items.find(x => x.type === 'audio_placeholder' && x.id === item.id);
                            let displayTime = ph ? Math.max(1, Math.round(ph.length / 3)) : 5;
                            let textContent = ph ? ph.text : "";
                            let base64 = "";

                            if (item.type === 'audio_result') {
                                try {
                                    const res = await fetch(`/audio/speech_${item.id}.mp3`);
                                    if (res.ok) {
                                        const blob = await res.blob();
                                        base64 = await new Promise(r => {
                                            const reader = new FileReader();
                                            reader.onload = () => r(reader.result.split(',')[1]);
                                            reader.readAsDataURL(blob);
                                        });
                                    }
                                } catch(e){}
                            }

                            if (item.type === 'audio_error') {
                                exportHtml += `<div class="msg-content audio-bubble"><div style="color:red; font-size:12px;">生成失败</div></div>`;
                            } else {
                                const audioStr = base64 ? `data:audio/mp3;base64,${base64}` : '';
                                exportHtml += `
                                <div style="display:flex; flex-direction:column; align-items:flex-start;">
                                    <div class="msg-content audio-bubble" onclick="playAudio(this, '${audioStr}')" oncontextmenu="toggleText(event, this)">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                                        <div>${displayTime}"</div>
                                    </div>
                                    <div class="text-translation">${textContent}</div>
                                </div>
                                `;
                            }
                        }
                    }
                } else {
                    exportHtml += `<div class="msg-content">${msg.content}</div>`;
                }

                if (msg.imageUrl) {
                    exportHtml += `<img src="${msg.imageUrl}" style="max-width: 200px; border-radius: 8px; margin-top: 8px;">`;
                }

                exportHtml += `</div></div>\n`;
            }

            exportHtml += `
</div>
<script>
function playAudio(el, src) {
    if (!src) return;
    if (el.audioObj) {
        el.audioObj.play();
        return;
    }
    const audio = new Audio(src);
    el.audioObj = audio;
    audio.play();
    el.classList.add('playing');
    audio.onended = () => el.classList.remove('playing');
}
function toggleText(e, el) {
    e.preventDefault();
    const txt = el.nextElementSibling;
    if (txt && txt.classList.contains('text-translation')) {
        txt.style.display = txt.style.display === 'block' ? 'none' : 'block';
    }
}
</script>
</body>
</html>`;

            if (navigator.share) {
                try {
                    const file = new File([exportHtml], `辣椒_回忆录.html`, { type: "text/html" });
                    await navigator.share({
                        title: '辣椒的回忆录',
                        text: '这是一段包含原声语音的记忆记录...',
                        files: [file]
                    });
                } catch (e) {
                    const url = URL.createObjectURL(new Blob([exportHtml], { type: "text/html" }));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `辣椒_回忆录.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            } else {
                const url = URL.createObjectURL(new Blob([exportHtml], { type: "text/html" }));
                const a = document.createElement('a');
                a.href = url;
                a.download = `辣椒_回忆录.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            exportBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
            `;
            exportBtn.style.pointerEvents = 'auto';
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
        ui.appendMessageImmediate(msg.content, msg.role, msg.imageUrl, msg.items);
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
        if (data.type === 'text' || data.type === 'audio_placeholder' || data.type === 'audio_result' || data.type === 'audio_error') {
            ui.updateStreamingMessage(contentDiv, data);
        } else if (data.type === 'image') {
            ui.appendImageToStreamingMessage(contentDiv, data.url);
        }
    });

    const reply = responseObj.reply;
    const imageUrl = responseObj.imageUrl;

    ui.removeLoading(); // 销毁等待动画

    currentMessages.push({ role: 'assistant', content: reply, items: contentDiv.items, imageUrl: imageUrl });
    storage.saveChat({ id: currentChatId, title: title, messages: currentMessages });

    isInputLocked = false;
    inputField.disabled = false;
    inputField.focus();
}
