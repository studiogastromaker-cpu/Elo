import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../geminiService";

export { SYSTEM_INSTRUCTION };

const getAIClient = () => {
  const apiKey = (typeof process !== 'undefined' && process.env)
    ? (process.env.API_KEY || process.env.GEMINI_API_KEY || '')
    : '';
  
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

export const createChatSession = (): Chat => {
  const ai = getAIClient();
  return ai.chats.create({
    model: 'gemini-3.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
};

