import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateMessageVariations(baseMessage: string, count: number = 3): Promise<string[]> {
  if (!baseMessage) return [];

  const prompt = `
    You are an expert Bangla marketing specialist and AI copywriting assistant for businesses in Bangladesh. 
    The user wants to send promotional messages via WhatsApp/SMS. 
    Your goal is to suggest ${count} unique variations of a base message to comply with anti-spam policies.

    Requirements for Variations:
    1. STRICTLY maintain the core offer and factual information.
    2. Use natural, conversational, and professional Bangla.
    3. Include at least one relevant emoji per variation.
    4. At least one variation must be a COMPLETELY rephrased version (different starting/ending, different sentence rhythm) while keeping the same meaning.
    5. Ensure all suggestions are distinct from each other to satisfy message policy requirements.
    6. Tone: Polite, business-oriented, and engaging.

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
