import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateMessageVariations(baseMessage: string, count: number = 3): Promise<string[]> {
  if (!baseMessage) return [];

  const prompt = `
    You are an expert Bangla marketing specialist and AI copywriting assistant for "লাকী গোল্ড" (Lucky Gold) located at "লাকী প্লাজা, আগ্রাবাদ" (Lucky Plaza, Agrabad), Chittagong. 
    The user wants to send promotional messages via WhatsApp/SMS. 
    Your goal is to suggest ${count} unique variations of a base message to comply with anti-spam policies.

    Requirements for Variations:
    1. STRICTLY maintain the core offer and factual information.
    2. Always ensure the business name "লাকী গোল্ড" is clearly visible in the message.
    3. Use natural, conversational, and professional Bangla.
    4. Include at least one relevant emoji per variation.
    5. At least one variation must be a COMPLETELY rephrased version.
    6. Tone: Polite, business-oriented, and inviting.

    Base Message: "${baseMessage}"

    Return the results as a JSON array of strings. 
    Example: ["variation 1", "variation 2", "variation 3"]
    Only output the JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const variations = JSON.parse(response.text || "[]");
    return Array.isArray(variations) ? variations : [];
  } catch (error) {
    console.error("AI Generation Error:", error);
    return [];
  }
}
