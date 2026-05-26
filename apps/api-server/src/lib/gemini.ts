import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY env var is not set");
}

export const ai = new GoogleGenAI({ apiKey });

export interface GeneratedQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export async function generateQuizQuestions(
  topic: string,
  difficulty: string,
  questionCount: number = 5
): Promise<GeneratedQuestion[]> {
  const prompt = `You are an expert quiz creator. Generate ${questionCount} multiple-choice questions about "${topic}" at ${difficulty} difficulty level.

IMPORTANT: Respond with ONLY valid JSON — no markdown, no code blocks, no extra text.

Return this exact JSON structure:
{
  "questions": [
    {
      "id": 1,
      "question": "The question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of why the answer is correct"
    }
  ]
}

Rules:
- Each question must have exactly 4 options
- correctAnswer is the 0-based index of the correct option (0, 1, 2, or 3)
- Questions should be clear, unambiguous, and educational
- Explanations should be informative and helpful
- Difficulty levels: easy (basic recall), medium (understanding), hard (application/analysis)
- Generate exactly ${questionCount} questions`;

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
      });

      const text = response.text ?? "";
      const cleaned = text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      const parsed = JSON.parse(cleaned);

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("Invalid response structure: missing questions array");
      }

      const questions: GeneratedQuestion[] = parsed.questions.map((q: GeneratedQuestion, idx: number) => {
        if (!q.question || !q.options || q.options.length !== 4 || typeof q.correctAnswer !== "number") {
          throw new Error(`Invalid question at index ${idx}`);
        }
        return {
          id: idx + 1,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || "No explanation provided",
        };
      });

      return questions;
    } catch (err) {
      lastError = err;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw new Error(`Failed to generate quiz after 3 attempts: ${lastError}`);
}
