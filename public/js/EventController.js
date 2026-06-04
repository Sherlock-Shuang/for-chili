export class EventController {
    constructor(uiManager, networkService, fxEngine) {
        this.uiManager = uiManager;
        this.networkService = networkService;
        this.fxEngine = fxEngine;

        this.inputElement = document.getElementById('user-input');
        
        this.state = {
            mode: "MODE_NORMAL", // MODE_NORMAL, MODE_FEIHUALING, MODE_CINEMATIC
            hijackLock: false,
            currentKeyword: null
        };

        this.initEventListeners();
    }

    initEventListeners() {
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleInputSubmit();
            }
        });

        // 焦点劫持监听
        this.inputElement.addEventListener('focus', () => {
            this.handleFocusHijack();
        });
        
        this.inputElement.focus();
    }

    async handleInputSubmit() {
        const text = this.inputElement.value.trim();
        if (!text || this.state.hijackLock || this.state.mode === 'MODE_CINEMATIC') return;

        // 如果是初始状态，发送第一条消息时切换布局
        if (document.body.classList.contains('initial-state')) {
            document.body.classList.remove('initial-state');
        }

        this.inputElement.value = '';
        this.uiManager.appendUserMessage(text);
        
        this.inputElement.disabled = true;

        const payload = {
            message: text,
            client_state: {
                mode: this.state.mode,
                is_hijacked: false,
                current_keyword: this.state.currentKeyword
            }
        };

        await this.processRequest(payload);
        
        this.inputElement.disabled = false;
        this.inputElement.focus();
    }

    async handleFocusHijack() {
        if (this.state.hijackLock || this.state.mode === 'MODE_CINEMATIC') return;

        // 10% 概率触发焦点劫持机制
        const shouldHijack = Math.random() < 0.1;
        if (shouldHijack) {
            this.state.hijackLock = true;
            this.inputElement.value = '';
            this.inputElement.disabled = true;
            
            this.fxEngine.injectLog("[WARNING] User terminal focus forcibly hijacked!");

            const payload = {
                message: null,
                client_state: {
                    mode: this.state.mode,
                    is_hijacked: true,
                    current_keyword: this.state.currentKeyword
                }
            };

            await this.processRequest(payload);
            
            // 短暂停顿后恢复控制
            setTimeout(() => {
                this.state.hijackLock = false;
                this.inputElement.disabled = false;
                this.inputElement.focus();
            }, 3000);
        }
    }

    async processRequest(payload) {
        const response = await this.networkService.sendMessage(payload);
        
        if (response && response.data) {
            const data = response.data;
            
            if (data.system_log_inject) {
                this.fxEngine.injectLog(data.system_log_inject);
            }

            // 更新客户端模式 (可选，例如服务端命令进入飞花令模式)
            if (data.new_mode) {
                 this.state.mode = data.new_mode;
                 if (data.new_keyword) this.state.currentKeyword = data.new_keyword;
            }

            await this.uiManager.appendAIMessage(
                data.reply, 
                data.fx_triggers || [], 
                data.cinematic_trigger
            );
        }
    }
}
