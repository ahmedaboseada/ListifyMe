import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

let genAI = null;
let aiModel = null;

if (process.env.GEMINI_API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        aiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        console.log('🤖 Gemini AI initialized successfully');
    } catch (err) {
        console.error('❌ Failed to initialize Gemini AI:', err.message);
    }
} else {
    console.warn('⚠️ GEMINI_API_KEY not configured in environment. AI predictions will fall back to local rule-based mock helpers.');
}

export { genAI, aiModel };
