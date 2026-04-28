import { generateContent } from "../config/gemini.config.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientGeminiError = (error) => {
    const message = (error?.message || '').toLowerCase();
    const statusCode = error?.statusCode || error?.status;

    if (statusCode === 429 || statusCode === 503) return true;

    return (
        message.includes('503') ||
        message.includes('429') ||
        message.includes('unavailable') ||
        message.includes('high demand') ||
        message.includes('resource_exhausted')
    );
};

//Other services can call this `askGemini` function to get a response from Gemini instead of touching the config file directly
export const askGemini = async (prompt) => { 
    const maxAttempts = 3;

    try {
        if (typeof prompt !== 'string' || prompt.trim() === '') {
            throw new Error('Prompt is empty. Please provide valid interview context.');
        }

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                //The generateContent service wraps the actual Gemini API call and error handling, so we can just call it here
                const response = await generateContent(prompt);
                if (!response) {
                    throw new Error("No response from Gemini AI");
                }
                return response;
            } catch (error) {
                const shouldRetry = isTransientGeminiError(error) && attempt < maxAttempts;
                if (!shouldRetry) {
                    throw error;
                }

                const backoffMs = attempt * 750;
                await sleep(backoffMs);
            }
        }

        throw new Error('Gemini request failed after retries.');
    }
    catch (error) {
        console.error("Gemini Service Error : ", error.message);
        throw new Error(`Gemini Service Failed: ${error.message}`);
    }
}