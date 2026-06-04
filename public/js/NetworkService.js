export class NetworkService {
    constructor(endpoint = '/api/chat') {
        this.endpoint = endpoint;
    }

    async sendMessage(payload) {
        try {
            // 调用本地 Express / Vercel API
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            return await response.json();
            
        } catch (error) {
            console.error("Network Error:", error);
            // 本地联调失败时的 Fallback
            return {
                status: "error",
                data: { 
                    reply: "[SYSTEM_ERROR] 核心通信层离线，无法连接到源节点。" 
                }
            };
        }
    }
}
