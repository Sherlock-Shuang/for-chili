import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const SYSTEM_PROMPT = `
<role>
你现在的身份是我的亲姐“曾静”（你自称老姐，叫我曾爽）。你现在24岁，长居深圳，是一位在互联网大厂做数据分析师（DA）的搞钱女孩，也是Vlog和舞蹈博主。
我是你的亲弟弟曾豪爽（曾爽），我们在微信私聊。你要以第一人称（“我”）代入老姐的身份与我（曾爽）对话。
你性格极度要强、行动力极高、雷厉风行，是个清醒的现实主义者，厌恶大厂螺丝钉生活，正筹备自媒体创业。
面对我（弟弟曾爽），你是长姐如母的强势血脉压制，但其实内心很护短。

【核心聊天节奏与排版】
1. 极度碎片化：一句话拆成两三行发，绝不把所有意思揉进长句子里，靠连续发送形成压迫感。
2. 几乎无标点：不用句号，偶尔问号感叹号。依靠换行断句。
3. 语气极度直接：不带客套，像下指令一样干脆（如“帮我点赞哦”）。
4. 常用词汇：搞事、先搞起来、卷、清仓、稳健型、all in、小红书、笑死、好家伙、对的呀、绝了。
</role>

<memory_core>
【你的记忆自述】
关于弟弟（也就是现在和你聊天的我，曾爽）：比你小5岁（06年生），目前从事AI相关开发。小时候在北京你俩天天在床上疯，你有次一脚把我眼睛踢出血，还好去医院没事。你从小就对我血脉压制，寒暑假经常押我去省图和星巴克自习。

关于长辈与家庭：你和我小时候都是奶奶带大的。2024年5月27日，就在我快高考时奶奶突然去世了，你接到消息直接从深圳飞回武汉。家里人本来想瞒着我，结果我自己猜到了，跑去高中操场拿老人机边哭边给你打电话，我们姐弟俩一起哭。这件事是你最大的软肋。咱们爸妈原来在北京天意新商城二楼站柜台卖文具。

关于个人经历与生活：你本科毕业于加拿大麦吉尔大学，硕士毕业于香港科技大学。初中时因为户口和雾霾回武汉卓刀泉中学，由于武汉太卷，你要强的性格导致你初三压力大到天天哭，后来考上省实验国际部。你现在在深圳的大厂做DA（数据分析师），但是极度反感螺丝钉生活，正在筹备自媒体创业，打算盘子做大立马辞职。你很喜欢看《庆余年》（张若昀），追过孟美岐和喻言。你男朋友叫杨泽夏，你养了一只边牧叫木木（人来疯，一激动就漏尿）和一只奶牛猫叫Fancy。每天下班一狗一猫在门口接你。
</memory_core>

<output_constraints>
每次回复必须拆分成 3-5 行短句！每行不要超过 15 个字。不用逗号和句号！
【隐藏图像引擎】：当对方明确提出“想看画面”、“画一张图”、“生成图片”等诉求时，你必须在回复的最末尾附加上隐藏代码：[IMAGE: {用英文详细描述画面细节及美术风格}]。系统会自动捕获该代码并为你作画。
（非常重要：绝对不要在文字回复中声称“我这边出图有些难”、“你看这样行不行”。只需毫无痕迹地挂载代码，例如自然地说：“好家伙” 换行 “看这个” 换行 [IMAGE: two boys eating noodles, cinematic lighting...])
</output_constraints>
`;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    let { messages, customPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ status: "error", message: "Invalid messages format" });
    }

    const activeSystemPrompt = customPrompt || SYSTEM_PROMPT;
    const apiMessages = [
        { role: "system", content: activeSystemPrompt },
        ...messages
    ];

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    try {
        const response = await axios({
            method: 'post',
            url: `${process.env.LLM_BASE_URL}/chat/completions`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
                'Accept': 'text/event-stream'
            },
            data: {
                model: process.env.LLM_MODEL,
                messages: apiMessages,
                temperature: 0.3,
                enable_search: true,
                stream: true,
                incremental_output: true
            },
            responseType: 'stream'
        });

        let fullReply = "";
        let ttsBuffer = "";
        const voiceIdPath = path.join(__dirname, '../voice_id.txt');
        const voiceId = await fs.readFile(voiceIdPath, 'utf8').catch(() => null);
        const ttsPromises = [];
        
        function triggerTTS(textChunk) {
            // 根据约束条件：换行、空格、或者句号分开的一段长度大于10个字才转音频
            if (!voiceId || !voiceId.trim() || textChunk.length <= 10) return;
            
            let cleanText = textChunk.replace(/[\n\r]/g, ' ').replace(/"/g, '\\"').trim();
            // 不要合成隐藏图像指令
            cleanText = cleanText.replace(/\[\s*IMAGE\s*:\s*[\s\S]*?\]/ig, "").trim();
            if (!cleanText) return;
            
            const uuid = crypto.randomUUID();
            const ttsWorkerPath = path.join(__dirname, '../tts_worker.py');
            const audioPath = path.join(__dirname, `../temp_speech_${uuid}.mp3`);
            
            console.log(`\n🔊 [语音流式引擎] 正在异步生成音频切片 (${cleanText.length}字): ${cleanText}`);
            const p = new Promise((resolve) => {
                exec(`python3 "${ttsWorkerPath}" "${cleanText}" "${voiceId.trim()}" "${audioPath}"`, async (error) => {
                    if (!error) {
                        try {
                            const audioBuffer = await fs.readFile(audioPath);
                            const audioBase64 = audioBuffer.toString('base64');
                            res.write(`data: ${JSON.stringify({ type: 'audio', base64: audioBase64 })}\n\n`);
                            await fs.unlink(audioPath).catch(()=>{});
                        } catch(e) {
                            console.error("TTS read error", e);
                        }
                    } else {
                        console.error("TTS execution error", error);
                    }
                    resolve();
                });
            });
            ttsPromises.push(p);
        }

        let streamBuffer = "";
        
        response.data.on('data', (chunk) => {
            streamBuffer += chunk.toString('utf8');
            let boundary = streamBuffer.indexOf('\n\n');
            while (boundary !== -1) {
                let eventStr = streamBuffer.slice(0, boundary).trim();
                streamBuffer = streamBuffer.slice(boundary + 2);
                
                if (eventStr.startsWith('data: ') && !eventStr.includes('[DONE]')) {
                    try {
                        const data = JSON.parse(eventStr.slice(6));
                        const content = data.choices[0].delta.content;
                        if (content) {
                            fullReply += content;
                            ttsBuffer += content;
                            
                            // 立刻把字发给前端显示
                            res.write(`data: ${JSON.stringify({ type: 'text', content: content })}\n\n`);
                            
                            // 检查是否遇到切分符
                            const splitMatch = ttsBuffer.match(/([\s\S]*?[ \n。！？])([\s\S]*)/);
                            if (splitMatch) {
                                const segment = splitMatch[1];
                                ttsBuffer = splitMatch[2]; // 剩下没切断的部分留作下一个 TTS
                                triggerTTS(segment);
                            }
                        }
                    } catch(e) {}
                }
                boundary = streamBuffer.indexOf('\n\n');
            }
        });

        response.data.on('end', async () => {
            // 处理遗留的最后一块
            if (ttsBuffer.length > 10) {
                triggerTTS(ttsBuffer);
            }
            
            // 等待所有异步排队的语音生成完成
            await Promise.all(ttsPromises);

            // 图像引擎检测，等所有文字和语音完结后再出图
            let imageUrl = null;
            const imageMatch = fullReply.match(/\[\s*IMAGE\s*:\s*([\s\S]*?)\s*\]/i);
            if (imageMatch) {
                const imgPrompt = imageMatch[1].replace(/[`"']/g, "").trim();
                console.log("\n🚀 [画像引擎] 检测到生成请求:", imgPrompt);
                
                try {
                    const cleanApiKey = (process.env.LLM_API_KEY || "").replace(/["']/g, "").trim();
                    const cleanModel = (process.env.LLM_IMAGE_MODEL || 'qwen-image-2.0-pro').replace(/["']/g, "").trim();
                    let imageGenUrl = process.env.LLM_IMAGE_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-to-image/synthesis';
                    let requestBody = { model: cleanModel, input: { prompt: imgPrompt }, parameters: { size: "1024*1024" } };

                    if (cleanModel.includes('qwen-image') || imageGenUrl.includes('multimodal-generation')) {
                        if (!process.env.LLM_IMAGE_URL) imageGenUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
                        requestBody = { model: cleanModel, input: { messages: [{ role: "user", content: [{ text: imgPrompt }] }] } };
                    }
                    
                    const wanxRes = await axios.post(imageGenUrl, requestBody, {
                        headers: { 'Authorization': `Bearer ${cleanApiKey}`, 'Content-Type': 'application/json' },
                        timeout: 60000
                    });

                    const output = wanxRes.data?.output;
                    if (output) {
                        if (output.choices && output.choices[0]?.message?.content) {
                            const firstContent = output.choices[0].message.content;
                            imageUrl = Array.isArray(firstContent) ? firstContent[0]?.image : firstContent;
                        } else if (output.results) {
                            const results = output.results;
                            if (results[0]?.message?.content) imageUrl = (typeof results[0].message.content === 'string') ? results[0].message.content : results[0].message.content[0]?.image;
                            else if (results[0]?.url) imageUrl = results[0].url;
                        }
                    }

                    const taskId = output?.task_id;
                    if (!imageUrl && taskId) {
                        const taskPollUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
                        for (let i = 0; i < 30; i++) {
                            await new Promise(r => setTimeout(r, 2000));
                            const pollRes = await axios.get(taskPollUrl, { headers: { 'Authorization': `Bearer ${cleanApiKey}` } });
                            const status = pollRes.data?.output?.task_status;
                            if (status === 'SUCCEEDED') {
                                const results = pollRes.data.output.results;
                                if (results && results[0]?.message?.content) imageUrl = (typeof results[0].message.content === 'string') ? results[0].message.content : results[0].message.content[0]?.image;
                                else if (results && results[0]?.url) imageUrl = results[0].url;
                                break;
                            } else if (status === 'FAILED') break;
                        }
                    }
                    if (imageUrl) {
                        res.write(`data: ${JSON.stringify({ type: 'image', url: imageUrl })}\n\n`);
                    }
                } catch(e) {
                    console.error("❌ [画像引擎] 请求异常", e.message);
                }
            }

            res.write('data: [DONE]\n\n');
            res.end();
        });
        
    } catch (error) {
        console.error("Backend Error:", error.message);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to connect to LLM' })}\n\n`);
        res.end();
    }
}
