import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
})

const Model_Name = 'gemini-2.5-flash';

const generateContent = async (prompt) => {
    try {
        const response = await ai.models.generateContent({
            model: Model_Name,
            content: prompt
        });
        return response.text;
    }
    catch (error) {
        console.error('Error generating content:', error);
        throw new Error(`Failed to generate content: ${error.message}`);
    }
}


export { generateContent };