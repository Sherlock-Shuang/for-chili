export const ui = {
    chatContainer: null,
    systemLog: null,
    cinematicOverlay: null,
    cinematicText: null,
    chatListContainer: null,
    welcomeContainer: null,
    bgm: null,

    init() {
        this.chatContainer = document.getElementById('chat-container');
        this.systemLog = document.getElementById('system-log');
        this.cinematicOverlay = document.getElementById('cinematic-overlay');
        this.cinematicText = document.getElementById('cinematic-text');
        this.chatListContainer = document.getElementById('chat-list');
        this.welcomeContainer = document.getElementById('welcome-container');
        this.lightboxOverlay = document.getElementById('image-lightbox');
        this.lightboxImg = document.getElementById('lightbox-img');

        // 初始化灯箱关闭逻辑
        if (this.lightboxOverlay) {
            this.lightboxOverlay.onclick = () => this.closeLightbox();
        }
    },

    clearChat() {
        if(this.chatContainer) this.chatContainer.innerHTML = '';
        if(this.welcomeContainer) {
            this.welcomeContainer.classList.remove('hidden');
            this.chatContainer.classList.add('hidden');
        }
        const topTitle = document.getElementById('top-chat-title');
        if (topTitle) topTitle.textContent = '';
        
        const floatInput = document.getElementById('float-input-wrapper');
        if (floatInput) floatInput.classList.add('centered-state');
    },

    setChatTitle(title) {
        const topTitle = document.getElementById('top-chat-title');
        if (topTitle) topTitle.textContent = title;
    },

    renderSidebarChats(chats, currentChatId, onChatClick) {
        if (!this.chatListContainer) return;
        
        // Remove existing dynamic chats
        Array.from(this.chatListContainer.querySelectorAll('.dynamic-chat')).forEach(el => el.remove());

        chats.forEach(chat => {
            const div = document.createElement('div');
            div.className = `sidebar-item dynamic-chat ${chat.id === currentChatId ? 'active' : ''}`;
            div.textContent = chat.title || '新对话';
            div.dataset.id = chat.id;
            div.addEventListener('click', () => onChatClick(chat.id));
            this.chatListContainer.appendChild(div);
        });
    },

    updateSidebarActive(id) {
        if (!this.chatListContainer) return;
        Array.from(this.chatListContainer.querySelectorAll('.dynamic-chat')).forEach(el => {
            if (el.dataset.id === id) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    },

    appendMessage(content, role, imageUrl = null) {
        // 隐藏欢迎页，显示对话容器
        if (this.welcomeContainer && !this.welcomeContainer.classList.contains('hidden')) {
            this.welcomeContainer.classList.add('hidden');
            this.chatContainer.classList.remove('hidden');
            const floatInput = document.getElementById('float-input-wrapper');
            if (floatInput) floatInput.classList.remove('centered-state');
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'msg-content';

        if (role === 'assistant') {
            const avatar = document.createElement('div');
            avatar.className = 'assistant-avatar';
            avatar.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            msgDiv.appendChild(avatar);
            
            // 如果附带了图片，通过封装的方法渲染带操作按钮的图片
            if (imageUrl) {
                const imgContainer = this.createImageContainer(imageUrl);
                contentDiv.appendChild(imgContainer);
            }
            
            msgDiv.appendChild(contentDiv);
            this.chatContainer.appendChild(msgDiv);
            return this.typewriterEffect(contentDiv, content, imageUrl ? true : false);
        } else {
            // 用户消息：增加编辑按钮
            const editBtn = document.createElement('div');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
            msgDiv.appendChild(editBtn);

            msgDiv.appendChild(contentDiv);
            this.chatContainer.appendChild(msgDiv);
            contentDiv.textContent = content;
            this.scrollToBottom();
            return Promise.resolve();
        }
    },

    createStreamingMessage(role) {
        if (this.welcomeContainer && !this.welcomeContainer.classList.contains('hidden')) {
            this.welcomeContainer.classList.add('hidden');
            this.chatContainer.classList.remove('hidden');
            const floatInput = document.getElementById('float-input-wrapper');
            if (floatInput) floatInput.classList.remove('centered-state');
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        const contentDiv = document.createElement('div');
        contentDiv.className = 'msg-content';

        if (role === 'assistant') {
            const avatar = document.createElement('div');
            avatar.className = 'assistant-avatar';
            avatar.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            msgDiv.appendChild(avatar);
        }
        msgDiv.appendChild(contentDiv);
        this.chatContainer.appendChild(msgDiv);
        this.scrollToBottom();
        return contentDiv;
    },

    updateStreamingMessage(contentDiv, text) {
        let currentText = contentDiv.textContent + text;
        currentText = currentText.replace(/\[\s*IMAGE\s*:\s*[\s\S]*?/ig, "").trim();
        contentDiv.textContent = currentText;
        this.scrollToBottom();
    },

    appendImageToStreamingMessage(contentDiv, imageUrl) {
        const imgContainer = this.createImageContainer(imageUrl);
        contentDiv.appendChild(imgContainer);
        this.scrollToBottom();
    },

    appendMessageImmediate(content, role, imageUrl = null) {
        // 无打字机动画的加载，用于渲染历史记录
        if (this.welcomeContainer && !this.welcomeContainer.classList.contains('hidden')) {
            this.welcomeContainer.classList.add('hidden');
            this.chatContainer.classList.remove('hidden');
            const floatInput = document.getElementById('float-input-wrapper');
            if (floatInput) floatInput.classList.remove('centered-state');
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'msg-content';
        // 渲染时不显示隐藏的图像代码
        contentDiv.textContent = content.replace(/\[\s*IMAGE\s*:\s*[\s\S]*?\]/ig, "").trim();

        if (role === 'assistant') {
            const avatar = document.createElement('div');
            avatar.className = 'assistant-avatar';
            avatar.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            msgDiv.appendChild(avatar);
            
            if (imageUrl) {
                const imgContainer = this.createImageContainer(imageUrl);
                contentDiv.appendChild(imgContainer);

            }
        } else {
            // 用户消息：增加编辑按钮
            const editBtn = document.createElement('div');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
            msgDiv.appendChild(editBtn);
        }

        msgDiv.appendChild(contentDiv);
        this.chatContainer.appendChild(msgDiv);
        this.scrollToBottom();
    },

    typewriterEffect(element, text, hasImage = false) {
        return new Promise((resolve) => {
            let i = 0;
            // 如果有图片，就先把图片容器拿出来保存，不要清空
            const imgContainer = element.querySelector('.image-action-container');
            if(imgContainer) {
                element.innerHTML = '';
                element.appendChild(imgContainer); // 图片放在后面
            } else {
                element.textContent = '';
            }
            
            const textSpan = document.createElement('span');
            if(imgContainer) {
                element.insertBefore(textSpan, imgContainer); 
            } else {
                element.appendChild(textSpan);
            }

            const interval = setInterval(() => {
                if (i < text.length) {
                    textSpan.textContent += text.charAt(i);
                    i++;
                    this.scrollToBottom();
                } else {
                    clearInterval(interval);
                    resolve();
                }
            }, 30); // 调快一点打字速度
        });
    },

    addSystemLog(log) {
        if (!this.systemLog) return;
        const line = document.createElement('div');
        const hex = Math.floor(Math.random() * 0xffffffff).toString(16).padEnd(8, '0');
        line.textContent = `[0x${hex}] ${new Date().toISOString()} - ${log}`;
        this.systemLog.appendChild(line);
        this.systemLog.scrollTop = this.systemLog.scrollHeight;
    },

    scrollToBottom() {
        if (this.chatContainer) {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }
    },
    
    async playIntroSequence(phrases) {
        if (!this.cinematicOverlay || !this.cinematicText) return;
        
        // 确保遮罩处于显示状态
        this.cinematicOverlay.style.display = 'flex';
        this.cinematicOverlay.classList.remove('hidden');
        
        for (let j = 0; j < phrases.length; j++) {
            this.cinematicText.textContent = '';
            this.cinematicText.style.opacity = 1;
            
            await new Promise(resolve => {
                let i = 0;
                let text = phrases[j];
                const interval = setInterval(() => {
                    if (i < text.length) {
                        this.cinematicText.textContent += text.charAt(i);
                        i++;
                    } else {
                        clearInterval(interval);
                        // 大幅缩短文字展示完后的呆板停留时间
                        setTimeout(resolve, 600 + (text.length * 20)); 
                    }
                }, 160); // 把弹字速度变慢（调大打字间隔时间）
            });
            
            // 如果不是最后一句，淡出当前这一句
            if (j < phrases.length - 1) {
                this.cinematicText.style.opacity = 0;
                // 加快转场淡出后的等待间隙
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        
        // 全部播放完毕，移除黑幕
        this.cinematicText.style.opacity = 0;
        this.cinematicOverlay.classList.add('hidden');
        
        // 彻底清理 DOM 脱离遮挡
        setTimeout(() => {
            this.cinematicOverlay.style.display = 'none';
        }, 2000);
    },

    showLoading() {
        if (this.welcomeContainer && !this.welcomeContainer.classList.contains('hidden')) {
            this.welcomeContainer.classList.add('hidden');
            this.chatContainer.classList.remove('hidden');
            const floatInput = document.getElementById('float-input-wrapper');
            if (floatInput) floatInput.classList.remove('centered-state');
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = `message assistant loading-message`;
        msgDiv.id = 'loading-bubble';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'msg-content';
        contentDiv.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';

        const avatar = document.createElement('div');
        avatar.className = 'assistant-avatar';
        avatar.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
        
        msgDiv.appendChild(avatar);
        msgDiv.appendChild(contentDiv);
        this.chatContainer.appendChild(msgDiv);
        this.scrollToBottom();
    },

    removeLoading() {
        const loader = document.getElementById('loading-bubble');
        if (loader) {
            loader.remove();
        }
    },

    playBGM(url) {
        if (this.bgm) {
            if (this.bgm.src.endsWith(url)) return; // Already playing
            this.bgm.pause();
        }
        this.bgm = new Audio(url);
        this.bgm.loop = true;
        this.bgm.volume = 0.6;
        this.bgm.play().catch(e => {
            console.warn("BGM playback blocked. Waiting for user interaction.", e);
            // Browser might block, so we'll try again on next document click if needed
            document.addEventListener('click', () => {
                if (this.bgm && this.bgm.paused) this.bgm.play();
            }, { once: true });
        });
    },

    fadeOutAudio(audio, duration = 2000) {
        if (!audio) return;
        const step = 0.05;
        const intervalTime = duration / (1 / step);
        const fadeInterval = setInterval(() => {
            if (audio.volume > step) {
                audio.volume -= step;
            } else {
                audio.volume = 0;
                audio.pause();
                clearInterval(fadeInterval);
            }
        }, intervalTime);
    },

    createImageContainer(imageUrl) {
        const container = document.createElement('div');
        container.className = 'image-action-container';

        const imgEl = document.createElement('img');
        imgEl.src = imageUrl;
        imgEl.className = 'ai-generated-image fade-in-image';
        // 增加点击放大功能
        imgEl.onclick = () => this.openLightbox(imageUrl);
        
        const actionBar = document.createElement('div');
        actionBar.className = 'image-action-bar';
        
        // 保存按钮
        const saveBtn = document.createElement('button');
        saveBtn.className = 'img-action-btn save-img-btn';
        saveBtn.title = '保存到本地';
        saveBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>';
        saveBtn.onclick = () => this.downloadImage(imageUrl);

        // 复制按钮
        const copyBtn = document.createElement('button');
        copyBtn.className = 'img-action-btn copy-img-btn';
        copyBtn.title = '复制链接';
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
        copyBtn.onclick = () => this.copyImageLink(imageUrl);

        actionBar.appendChild(saveBtn);
        actionBar.appendChild(copyBtn);
        
        container.appendChild(imgEl);
        container.appendChild(actionBar);
        
        return container;
    },

    downloadImage(url) {
        fetch(url).then(res => res.blob()).then(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `辣椒_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }).catch(() => {
            // 如果 CORS 导致 blob 下载失败，尝试直接跳转
            window.open(url, '_blank');
        });
    },

    copyImageLink(url) {
        navigator.clipboard.writeText(url).then(() => {
            this.addSystemLog('IMAGE_LINK_COPIED');
            alert('图片链接已复制到剪贴板');
        });
    },

    openLightbox(url) {
        if (!this.lightboxOverlay || !this.lightboxImg) return;
        this.lightboxImg.src = url;
        this.lightboxOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // 禁止背景滚动
    },

    closeLightbox() {
        if (!this.lightboxOverlay) return;
        this.lightboxOverlay.classList.add('hidden');
        document.body.style.overflow = '';
    },


};
