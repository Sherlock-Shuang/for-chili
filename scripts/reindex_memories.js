import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEMORIES_PATH = path.join(__dirname, '../data/memories.json');

async function reindex() {
    console.log("Starting memory re-indexing...");
    
    try {
        const rawData = await fs.readFile(MEMORIES_PATH, 'utf-8');
        const memories = JSON.parse(rawData);
        
        for (let i = 0; i < memories.length; i++) {
            const content = memories[i].content;
            console.log(`[${i+1}/${memories.length}] Embedding: ${content.substring(0, 20)}...`);
            
            try {
                const response = await axios.post(`${process.env.EMBEDDING_BASE_URL}/embeddings`, {
                    model: process.env.EMBEDDING_MODEL,
                    input: content
                }, {
                    headers: { 'Authorization': `Bearer ${process.env.EMBEDDING_API_KEY}` }
                });
                
                memories[i].vector = response.data.data[0].embedding;
            } catch (err) {
                console.error(`Failed to embed item ${i}:`, err.message);
            }
        }
        
        await fs.writeFile(MEMORIES_PATH, JSON.stringify(memories, null, 2));
        console.log("Successfully updated memories.json with new vectors.");
        
    } catch (error) {
        console.error("Re-indexing failed:", error);
    }
}

reindex();
