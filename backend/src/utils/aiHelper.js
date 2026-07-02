import { aiModel } from '../config/gemini.js';
import { categories } from '../config/CONSTANTS.js';

export const analyzeTaskWithAI = async (title, description = '', subtaskCount = 0, dueDate = null) => {
    if (!aiModel) {
        return getMockAIPrediction(title, description, subtaskCount, dueDate);
    }

    try {
        const allowedCategories = Object.values(categories);
        const now = new Date();
        const daysRemaining = dueDate ? Math.ceil((new Date(dueDate) - now) / (1000 * 60 * 60 * 24)) : 7;

        const prompt = `
        You are an AI Task Management Assistant for the ListifyMe app.
        Analyze the following task details:
        - Title: "${title}"
        - Description: "${description}"
        - Subtask count: ${subtaskCount}
        - Days remaining until due date: ${daysRemaining} (due date is ${dueDate})

        Determine the following properties:
        1. difficulty: 'low', 'medium', or 'high' based on the workload and description.
        2. category: Choose the most fitting category strictly from this list: ${JSON.stringify(allowedCategories)}.
        3. deadlineRisk: 'low', 'medium', or 'high' based on the complexity (subtasks/description) and time remaining (days remaining).
        4. aiTips: A short, motivating, one-sentence advice (under 100 characters) on how to tackle this task.

        Respond ONLY with a valid JSON object matching this schema. Do not output markdown code blocks or extra text, just the raw JSON:
        {
          "difficulty": "medium",
          "category": "personal",
          "deadlineRisk": "low",
          "aiTips": "Break down your task into daily steps to avoid last-minute stress."
        }
        `;

        const result = await aiModel.generateContent(prompt);
        const responseText = result.response.text().trim();

        // Extract outer JSON block robustly
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON object found in Gemini response');
        
        const parsed = JSON.parse(jsonMatch[0]);
        return {
            difficulty: ['low', 'medium', 'high'].includes(parsed.difficulty) ? parsed.difficulty : 'medium',
            pointsReward: 25, // Lock points to 25 points
            category: allowedCategories.includes(parsed.category) ? parsed.category : 'general',
            deadlineRisk: ['low', 'medium', 'high'].includes(parsed.deadlineRisk) ? parsed.deadlineRisk : 'low',
            aiTips: parsed.aiTips || 'Make sure to plan ahead and stay focused!'
        };
    } catch (err) {
        console.error('❌ Gemini AI prediction error, falling back to mock:', err.message);
        return getMockAIPrediction(title, description, subtaskCount, dueDate);
    }
};

export const suggestSubtasksWithAI = async (title, description = '') => {
    if (!aiModel) {
        return ['Analyze task outline details', 'Execute key implementation blocks', 'Verify results and debug issues'];
    }

    try {
        const prompt = `
        You are an AI Task Management Assistant for the ListifyMe app.
        Generate exactly 3 to 4 clear, actionable subtask titles for this task:
        - Title: "${title}"
        - Description: "${description}"

        Respond ONLY with a valid JSON array of strings. Do not output markdown code blocks or extra text, just the raw JSON:
        [
          "First subtask step",
          "Second subtask step",
          "Third subtask step"
        ]
        `;

        const result = await aiModel.generateContent(prompt);
        const responseText = result.response.text().trim();

        // Extract outer array block robustly
        const arrayMatch = responseText.match(/\[[\s\S]*\]/);
        if (!arrayMatch) throw new Error('No JSON array found in Gemini response');

        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed) && parsed.length >= 3) {
            return parsed;
        }
        return ['Analyze task outline details', 'Execute key implementation blocks', 'Verify results and debug issues'];
    } catch (err) {
        console.error('❌ Gemini AI subtask generation error, falling back to mock:', err.message);
        return ['Analyze task outline details', 'Execute key implementation blocks', 'Verify results and debug issues'];
    }
};

export const suggestDescriptionWithAI = async (title, type = 'task') => {
    if (!aiModel) {
        return `Core tasks for this ${type} workspace.`;
    }

    try {
        const prompt = `
        You are an AI Task Management Assistant for the ListifyMe app.
        Generate a concise, professional 1-sentence outline description (under 120 characters) for this ${type}:
        - Title: "${title}"

        Respond ONLY with the raw text description. Do not output markdown, JSON, or quotes, just the pure text:
        `;

        const result = await aiModel.generateContent(prompt);
        return result.response.text().trim().replace(/^"|"$/g, '');
    } catch (err) {
        console.error('❌ Gemini AI description suggestion error:', err.message);
        return `Core tasks for this ${type} workspace.`;
    }
};

const getMockAIPrediction = (title, description, subtaskCount, dueDate) => {
    const textToAnalyze = `${title.toLowerCase()} ${description.toLowerCase()}`;
    let category = 'general';
    
    if (textToAnalyze.includes('study') || textToAnalyze.includes('learn') || textToAnalyze.includes('exam') || textToAnalyze.includes('course')) {
        category = 'education';
    } else if (textToAnalyze.includes('work') || textToAnalyze.includes('meeting') || textToAnalyze.includes('office') || textToAnalyze.includes('client')) {
        category = 'work';
    } else if (textToAnalyze.includes('buy') || textToAnalyze.includes('shop') || textToAnalyze.includes('store') || textToAnalyze.includes('market')) {
        category = 'shopping';
    } else if (textToAnalyze.includes('gym') || textToAnalyze.includes('health') || textToAnalyze.includes('workout') || textToAnalyze.includes('run')) {
        category = 'health';
    } else if (textToAnalyze.includes('bank') || textToAnalyze.includes('money') || textToAnalyze.includes('pay') || textToAnalyze.includes('rent')) {
        category = 'finance';
    } else if (textToAnalyze.includes('personal') || textToAnalyze.includes('clean') || textToAnalyze.includes('home')) {
        category = 'personal';
    }

    let difficulty = 'low';
    if (subtaskCount > 3 || textToAnalyze.length > 150) {
        difficulty = 'high';
    } else if (subtaskCount > 1 || textToAnalyze.length > 50) {
        difficulty = 'medium';
    }

    let deadlineRisk = 'low';
    if (dueDate) {
        const daysRemaining = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 1 && difficulty === 'high') {
            deadlineRisk = 'high';
        } else if (daysRemaining <= 3) {
            deadlineRisk = 'medium';
        }
    }

    const aiTips = difficulty === 'high' 
        ? 'This looks like a large task. Consider breaking it down into smaller, bite-sized tasks!'
        : 'A straightforward task! Complete it early to build up momentum.';

    return {
        difficulty,
        pointsReward: 25,
        category,
        deadlineRisk,
        aiTips
    };
};
