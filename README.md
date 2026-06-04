# 2026.老姐 (SherlockAI)

本项目是一个沉浸式大模型聊天应用，通过流式并发语音合成技术 (SSE + CosyVoice TTS)，实现了“边打字、边配音”的极速对话体验。

## 特性
- 纯净的碎碎念人格（极度碎片化、无标点排版）。
- 流式打字机消息渲染。
- 异步并发语音流引擎（CosyVoice Custom TTS）。
- 图片隐藏唤醒引擎。

## 启动
1. 安装依赖：`npm install`
2. 配置环境变量：在 `.env` 中填写你的 `LLM_API_KEY` 等参数。
3. 提取音色（可选）：`python extract_voice.py`
4. 启动后端：`node server.js`
