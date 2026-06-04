export class UIManager {
    constructor() {
        this.chatContainer = document.getElementById('chat-container');
        this.cinematicOverlay = document.getElementById('cinematic-overlay');
        this.cinematicText = document.getElementById('cinematic-text');
        this.typingSpeed = 35; // ms per char (打字机速度)
    }

    appendUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message user';
        msgDiv.textContent = text;
        this.chatContainer.appendChild(msgDiv);
        this.scrollToBottom();
    }

    async appendAIMessage(text, fxTriggers = [], cinematicTrigger = null) {
        // 节点电影级黑屏覆盖
        if (cinematicTrigger) {
            await this.playCinematicSequence(cinematicTrigger);
            if (!text) return; // 纯过场情况
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ai typing-cursor';

        this.chatContainer.appendChild(msgDiv);
        
        await this.typewriterEffect(msgDiv, text, fxTriggers);
        
        msgDiv.classList.remove('typing-cursor');
        this.scrollToBottom();
    }

    typewriterEffect(element, text, fxTriggers) {
        return new Promise(resolve => {
            let i = 0;
            element.textContent = '';
            
            const timer = setInterval(() => {
                element.textContent += text.charAt(i);
                this.scrollToBottom();
                i++;
                if (i >= text.length) {
                    clearInterval(timer);
                    // 打字完毕后判定是否追加故障特效
                    if (fxTriggers && fxTriggers.includes('GLITCH')) {
                        element.classList.add('glitch');
                        element.setAttribute('data-text', text); // Needed for CSS glitch
                    }
                    resolve();
                }
            }, this.typingSpeed);
        });
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    playCinematicSequence(data) {
        return new Promise(resolve => {
            this.cinematicText.textContent = data.text;
            this.cinematicOverlay.classList.remove('hidden');
            
            setTimeout(() => {
                this.cinematicOverlay.classList.add('hidden');
                resolve();
            }, data.duration || 5000);
        });
    }
}
