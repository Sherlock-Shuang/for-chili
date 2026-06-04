export async function sendMessage(messages, customPrompt = null, onMessage = null) {
    try {
        const payload = { messages };
        if (customPrompt) {
            payload.customPrompt = customPrompt;
        }

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        // 统一返回值
        let finalReply = "";
        let finalImageUrl = null;

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let streamBuffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            streamBuffer += decoder.decode(value, { stream: true });
            let boundary = streamBuffer.indexOf('\n\n');
            while (boundary !== -1) {
                let eventStr = streamBuffer.slice(0, boundary).trim();
                streamBuffer = streamBuffer.slice(boundary + 2);

                if (eventStr.startsWith('data: ') && !eventStr.includes('[DONE]')) {
                    try {
                        const data = JSON.parse(eventStr.slice(6));
                        
                        if (data.type === 'text' && data.content) {
                            finalReply += data.content;
                        } else if (data.type === 'image' && data.url) {
                            finalImageUrl = data.url;
                        }
                        
                        if (onMessage) {
                            onMessage(data);
                        }
                    } catch (e) {
                        console.error('SSE JSON parse error:', e);
                    }
                }
                boundary = streamBuffer.indexOf('\n\n');
            }
        }

        return {
            reply: finalReply,
            imageUrl: finalImageUrl
        };

    } catch (error) {
        console.error('Network error:', error);
        return { reply: '（网络波动，连接中断）', imageUrl: null };
    }
}
