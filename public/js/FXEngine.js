export class FXEngine {
    constructor() {
        this.systemLogArea = document.getElementById('system-log');
        this.mockLogs = [
            "[Warning] Godot Engine physical spring decoupled",
            "Routing vector: Madrid/Barcelona",
            "[SYS] Memory sector 0x4A is corrupted, bypassing...",
            "Loading artifact m_001...",
            "Syncing spacetime coordinates: -0.012, 0.045",
            "[Error] Quantum entanglement threshold exceeded"
        ];
        this.startLogLoop();
    }

    startLogLoop() {
        // 随机注入系统底层信息的循环
        setInterval(() => {
            if (Math.random() > 0.6) {
                this.injectLog(this.getRandomMockLog());
            }
        }, 3000);
    }

    getRandomMockLog() {
        return this.mockLogs[Math.floor(Math.random() * this.mockLogs.length)];
    }

    injectLog(text) {
        const logDiv = document.createElement('div');
        logDiv.className = 'system-message';
        logDiv.textContent = `> ${text}`;
        
        this.systemLogArea.appendChild(logDiv);
        
        if (this.systemLogArea.children.length > 5) {
            this.systemLogArea.removeChild(this.systemLogArea.firstChild);
        }

        setTimeout(() => {
            if(logDiv.parentNode) {
                logDiv.parentNode.removeChild(logDiv);
            }
        }, 3000);
    }
}
