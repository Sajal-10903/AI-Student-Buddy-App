/**
 * pdf.service.ts
 *
 * Business logic for all PDF-derived AI generation:
 *   - Document summarisation
 *   - Flashcard generation
 *   - Quiz question generation from PDF text
 *
 * Routes delegate here; this layer is framework-agnostic.
 */

import { ai } from "../lib/gemini";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SummarySection { heading: string; content: string; }

export interface DocumentSummary {
  title: string;
  overview: string;
  keyPoints: string[];
  sections: SummarySection[];
  conclusion: string;
}

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  category: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// ─── Summarisation ──────────────────────────────────────────────────────────

export async function summariseDocument(extractedText: string): Promise<DocumentSummary> {
  const snippet = extractedText.slice(0, 30000);

  const prompt = `You are an expert academic summarizer. Analyze the following document text and provide a comprehensive summary.

IMPORTANT: Respond with ONLY valid JSON — no markdown, no code blocks, no extra text.

Return this exact JSON structure:
{
  "title": "Inferred document title",
  "overview": "2-3 sentence high-level overview of the document",
  "keyPoints": [
    "Key point 1",
    "Key point 2",
    "Key point 3",
    "Key point 4",
    "Key point 5"
  ],
  "sections": [
    {
      "heading": "Section name",
      "content": "2-3 sentence summary of this section"
    }
  ],
  "conclusion": "1-2 sentence conclusion/takeaway"
}

Rules:
- Provide 5-10 key points
- Identify 3-6 main sections from the content
- Be concise but informative
- Focus on the most important information

Document text:
${snippet}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json", maxOutputTokens: 8192 },
  });

  const raw     = response.text ?? "{}";
  const cleaned = raw.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(cleaned) as DocumentSummary;
}

// ─── Flashcard generation ───────────────────────────────────────────────────

export async function generateFlashcards(extractedText: string, count: number): Promise<Flashcard[]> {
  const snippet = extractedText.slice(0, 30000);

  const prompt = `You are an expert educator. Create ${count} high-quality flashcards from the following document text.

IMPORTANT: Respond with ONLY valid JSON — no markdown, no code blocks, no extra text.

Return this exact JSON structure:
{
  "flashcards": [
    {
      "id": 1,
      "front": "Question or term on the front of the card",
      "back": "Answer or definition on the back of the card",
      "category": "Topic category this card belongs to"
    }
  ]
}

Rules:
- Create exactly ${count} flashcards
- Mix question-answer format and term-definition format
- Cover the most important concepts from the document
- Keep fronts concise (1-2 sentences max)
- Keep backs informative but not too long (2-4 sentences max)
- Group related cards under the same category

Document text:
${snippet}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json", maxOutputTokens: 8192 },
  });

  const raw     = response.text ?? "{}";
  const cleaned = raw.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const result  = JSON.parse(cleaned);
  return result.flashcards as Flashcard[];
}

// ─── PDF quiz generation ────────────────────────────────────────────────────

export async function generatePdfQuizQuestions(
  extractedText: string,
  difficulty: string,
  count: number,
): Promise<QuizQuestion[]> {
  const snippet = extractedText.slice(0, 25000);

  const prompt = `You are an expert quiz creator. Generate ${count} multiple-choice questions based on the following document content at ${difficulty} difficulty level.

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
- Questions must be directly based on the document content
- Explanations should reference the document where relevant
- Generate exactly ${count} questions

Document text:
${snippet}`;

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json", maxOutputTokens: 8192 },
      });
      const raw     = response.text ?? "{}";
      const cleaned = raw.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      const parsed  = JSON.parse(cleaned);
      return parsed.questions.map((q: any, idx: number) => ({
        id: idx + 1,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
      }));
    } catch (err) {
      lastError = err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}
