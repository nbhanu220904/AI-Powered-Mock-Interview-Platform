import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
})

const Model_Name = 'gemini-2.5-flash';

const generateContent = async (prompt) => {
    try {
        const normalizedPrompt = typeof prompt === 'string' ? prompt.trim() : '';
        if (!normalizedPrompt) {
            throw new Error('Prompt is empty. Cannot generate content.');
        }

        const response = await ai.models.generateContent({
            model: Model_Name,
            contents: normalizedPrompt
        });

        const text = typeof response.text === 'function' ? response.text() : response.text;
        return text;
    }
    catch (error) {
        console.error('Error generating content:', error);
        throw new Error(`Failed to generate content: ${error.message}`);
    }
}


export { generateContent };