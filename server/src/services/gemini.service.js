import { generateContent } from "../config/gemini.config.js";

//Other services can call this `askGemini` function to get a response from Gemini instead of touching the config file directly
export const askGemini = async (prompt) => { 
    try {
        //The generateContent service wraps the actual Gemini API call and error handling, so we can just call it here
        const response = await generateContent(prompt); 
        if (!response) {
            throw new Error("No response from Gemini AI");
        }
        return response;
    }
    catch (error) {
        console.error("Gemini Service Error : ", error.message);
        throw new Error(`Gemini Service Failed: ${error.message}`);
    }
}