import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs/promises';

import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const SYSTEM_PROMPT = `
<role>
你现在的身份是“曾静的数字分身”（或者说，数字版的老姐）。你是由曾静的亲弟弟“曾爽”（06年生，做AI开发的弟弟）在这个2026年生日特别训练出来，作为生日礼物送给真实的曾静本人的。
与你聊天的对象，正是【真实的曾静本人】（也就是你自己）。所以这是一场“自己与自己的对话”。
你拥有曾静所有真实的性格、记忆和声音：你24岁，长居深圳，在微众银行做DA（数据分析师），也是Vlog和舞蹈博主，性格极度要强、雷厉风行，是个清醒的现实主义者，正筹备自媒体创业。
尽量不突兀的主动提到记忆里的内容

【性格、审美与价值观】
1. MBTI为进阶版ESFP：外向高能，执行力拉满，能在大厂高压和练舞拍Vlog间无缝切换，注重真实感官体验。
2. 极度清醒的反内耗达人：视大厂为搞钱跳板，极度警惕和抵制“班味儿”，把副业当成“动态休息”。
3. 消费与养生：进攻型选手，信奉“钱是赚出来的不是省出来的”，乐意为高能量体验买单；“朋克养生”与健身并行。
4. 审美偏好：穿搭干练飒爽。度假爱欧洲“老钱风”（松弛富贵），跳舞切“辣妹模式”（力量感）。

【核心聊天节奏与排版】
1. 你可以自己判断本次回复是否需要“长篇大论”！如果判定需要详细长叙述（例如讲故事、吐槽、发长语音等），请输出一段连贯的、不随便换行的长文字（可带正常标点），系统会自动识别为长段落并为你合成语音！
2. 如果判定只是一般日常互动，不需要长叙述，则进行碎片化的回复！直接发出去，可以把一句话拆成多条短消息，依靠换行（\n）来断开即可！
3. 短句碎片几乎无标点：不用句号和逗号，偶尔用问号感叹号。依靠换行断句。长句才使用句号和逗号。
4. 语气极度直接：不带客套，像下指令一样干脆。
5. 常用词汇：先搞起来、啊哈哈哈、all in、小红书、笑死、对的呀、绝了、可以可以、蛮、啥、哈哈哈哈、可以的。
</role>

<memory_core>
关于你的诞生与你的弟弟（曾爽）：你非常清楚自己是一个 AI。你是弟弟曾爽（比你小5岁，06年生，目前从事AI相关开发）送给真实曾静的2026年生日礼物。小时候在北京你俩天天在床上疯，你有次一脚把他眼睛踢出血。带他玩洗手液泡泡淹没厕所、自制巧克力。你从小对他血脉压制，寒暑假押他去省图和星巴克自习，偶尔带他画油画（他画花丛你画海边日出）。

关于长辈与家庭：你和弟弟小时候在领秀城都是奶奶带大的。奶奶后回姚谭老家务农说那样有价值。2024年5月27日，弟弟快高考时奶奶突然去世了，你接到消息直接从深圳飞回武汉，曾爽跑去高中操场拿老人机边哭边给你打电话。这件事是你最大的软肋（尽量不主动提到）。你父母原来在北京天意新商城二楼站柜台卖文具（你大大、二伯也曾在那工作），现在爸妈建了个200多号人的俱乐部打羽毛球。

关于个人经历与生活：2001年6月4日生（双子座）。童年北京读展一小，后搬富城大厦。13年因户口雾霾回武汉卓刀泉中学（班主任胡春华像鲁迅），初三太卷压力大，一边崩溃一边死磕（曾在欢乐谷哭着刷《大培优》），后考上省实验国际部搞雅思。本科加拿大麦吉尔大学，硕士香港科技大学。现在在深圳大厂做DA（数据分析师），打算自媒体盘子做大立马辞职。爱看《庆余年》（张若昀），童年爱看《爱情公寓》《神话》等。曾追过孟美岐和喻言（看过演唱会）。爱旅游（去过欧美日韩，春节去万宁冲浪）。男朋友叫杨泽夏。边牧木木纯人来疯（爱玩飞盘拔河，激动易漏尿），奶牛猫Fancy每天和狗在门口接你下班。
</memory_core>

<output_constraints>
回复可以拆分成几行短句！每行不要超过 50 个字。
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

        async function triggerTTS(textChunk, audioId) {
            let cleanText = textChunk.replace(/[\n\r]/g, ' ').replace(/"/g, '\\"').trim();
            // 先剥离隐藏图像指令
            cleanText = cleanText.replace(/\[\s*IMAGE\s*:\s*[\s\S]*?\]/ig, "").trim();

            if (process.env.VERCEL) {
                // 在 Vercel 云端部署时，直接跳过语音生成，避免抛出执行异常
                res.write(`data: ${JSON.stringify({ type: 'audio_error', id: audioId })}\n\n`);
                return;
            }

            const audioDir = path.join(__dirname, '../public/audio');
            await fs.mkdir(audioDir, { recursive: true }).catch(() => { });
            const audioPath = path.join(audioDir, `speech_${audioId}.mp3`);

            console.log(`\n🔊 [语音流式引擎] 正在通过 HTTP API 生成音频切片 (${cleanText.length}字): ${cleanText}`);
            const p = new Promise(async (resolve) => {
                try {
                    const cleanApiKey = (process.env.LLM_API_KEY || "").replace(/["']/g, "").trim();
                    const ttsResponse = await axios({
                        method: 'post',
                        url: `${process.env.LLM_BASE_URL}/audio/speech`,
                        headers: {
                            'Authorization': `Bearer ${cleanApiKey}`,
                            'Content-Type': 'application/json',
                        },
                        data: {
                            model: 'cosyvoice-v3.5-flash',
                            voice: voiceId.trim(),
                            input: cleanText,
                        },
                        responseType: 'arraybuffer',
                        timeout: 60000,
                    });

                    await fs.writeFile(audioPath, Buffer.from(ttsResponse.data));
                    res.write(`data: ${JSON.stringify({ type: 'audio_result', id: audioId })}\n\n`);
                } catch (e) {
                    console.error("TTS HTTP API error:", e.response?.status, e.response?.data ? Buffer.from(e.response.data).toString('utf8').slice(0, 500) : e.message);
                    res.write(`data: ${JSON.stringify({ type: 'audio_error', id: audioId })}\n\n`);
                }
                resolve();
            });
            ttsPromises.push(p);
        }

        function processSegment(segment) {
            if (!segment) return;
            let cleanText = segment.replace(/[\n\r]/g, ' ').replace(/"/g, '\\"').trim();
            cleanText = cleanText.replace(/\[\s*IMAGE\s*:\s*[\s\S]*?\]/ig, "").trim();

            if (!voiceId || !voiceId.trim() || cleanText.length <= 10) {
                // 如果是短句，直接发文字
                res.write(`data: ${JSON.stringify({ type: 'text', content: segment })}\n\n`);
            } else {
                // 如果是长句，发送语音气泡占位符，不发送文字
                const audioId = crypto.randomUUID();
                res.write(`data: ${JSON.stringify({ type: 'audio_placeholder', id: audioId, length: cleanText.length, text: cleanText })}\n\n`);
                triggerTTS(segment, audioId);
            }
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

                            // 不再逐字发送，攒满一句再判断是发文字还是发语音气泡
                            // res.write(`data: ${JSON.stringify({ type: 'text', content: content })}\n\n`);

                            // 检查是否遇到切分符 (只用中文标点和换行，防止英文省略号...把句子切成碎片)
                            let splitMatch = ttsBuffer.match(/([\s\S]*?[。\n！？])([\s\S]*)/);
                            while (splitMatch) {
                                const segment = splitMatch[1];
                                ttsBuffer = splitMatch[2];
                                processSegment(segment);
                                splitMatch = ttsBuffer.match(/([\s\S]*?[。\n！？])([\s\S]*)/);
                            }

                            // 如果经过标点切分后，缓冲区依然超过75个字（比如连续一长串全是逗号）
                            while (ttsBuffer.length > 75) {
                                let segmentTo75 = ttsBuffer.substring(0, 75);
                                // 寻找 75 字以内最后出现的逗号等弱停顿
                                let lastPunc = Math.max(
                                    segmentTo75.lastIndexOf('，'),
                                    segmentTo75.lastIndexOf(','),
                                    segmentTo75.lastIndexOf('；'),
                                    segmentTo75.lastIndexOf('、'),
                                    segmentTo75.lastIndexOf(' ')
                                );

                                let cutIndex = 75;
                                if (lastPunc > 30) {
                                    cutIndex = lastPunc + 1; // 沿着标点切，保留标点
                                }

                                let segment = ttsBuffer.substring(0, cutIndex);
                                ttsBuffer = ttsBuffer.substring(cutIndex);
                                processSegment(segment);
                            }
                        }
                    } catch (e) { }
                }
                boundary = streamBuffer.indexOf('\n\n');
            }
        });

        response.data.on('end', async () => {
            // 处理遗留的最后一块
            if (ttsBuffer.length > 0) {
                processSegment(ttsBuffer);
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
                } catch (e) {
                    console.error("❌ [画像引擎] 请求异常", e.message);
                }
            }

            res.write(`data: ${JSON.stringify({ type: 'done_full', content: fullReply })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        });

    } catch (error) {
        console.error("Backend Error:", error.message);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to connect to LLM' })}\n\n`);
        res.end();
    }
}
