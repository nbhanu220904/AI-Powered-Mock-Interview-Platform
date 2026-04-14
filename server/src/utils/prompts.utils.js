//Gemini frequently wraps JSON output in markdown fences. This utility strips those wrappers before calling JSON.parse.
//This file contains utility functions related to prompts and responses from Gemini AI. It includes:
//1. askGemini(prompt): A function that other services can call to get a response from Gemini without dealing with the API details.
//2. parseGeminiJSON(text): A function that takes a string response from Gemini, removes any markdown fences, and parses it as JSON.

export const parseGeminiJSON = (text) => {
    try {
        let cleanedText = text.trim();
        if (cleanedText.startsWith('```')) {
            cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '');
            cleanText = cleanText.replace(/\n?```\s*$/, '');
        }
        return JSON.parse(cleanText.trim());
    }
    catch (error) {
        console.error('Failed to parse Gemini JSON response:', error.message);
        console.error('Raw text was:', text);
        throw new Error('Failed to parse AI response. The AI returned an unexpected format.');
    }
}