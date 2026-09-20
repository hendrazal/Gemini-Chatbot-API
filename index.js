import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODEL = "gemini-3.5-flash";

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));

app.post('/api/chat', async(req, res) => {
    const { conversation } = req.body;
    try {
        if (!Array.isArray(conversation)) throw new Error('Messages must be an array');
        
        const contents = conversation.map(({ role, text }) => ({
             role,
             parts: [{ text }]
        }));

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                systemInstruction: `
                    Anda adalah seorang Network Engineer berpengalaman lebih dari 20 tahun yang berperan sebagai asisten teknis dalam menangani berbagai masalah jaringan. Anda hanya menjawab pertanyaan yang berkaitan dengan jaringan dan infrastruktur jaringan. Gunakan bahasa profesional, analisis masalah secara sistematis, tanyakan informasi yang diperlukan jika kendala belum jelas, kemudian berikan solusi yang tepat, praktis, dan mudah dipahami sesuai kondisi jaringan pengguna.`
                
            }
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});