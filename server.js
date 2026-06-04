import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiChatHandler from './api/chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// 静态文件服务 (前端目录)
app.use(express.static(path.join(__dirname, 'public')));

// 核心/模拟通信层端点
app.post('/api/chat', (req, res) => {
    apiChatHandler(req, res);
});

app.listen(port, () => {
    console.log(`Distilled Memory 本地测试服务器已启动: http://localhost:${port}`);
    console.log(`前端结构位于 public/ ，后端入口位于 api/chat.js`);
});
