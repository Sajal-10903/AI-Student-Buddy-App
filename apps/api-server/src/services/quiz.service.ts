/**
 * quiz.service.ts
 *
 * Business logic for quiz grading.
 * Decoupled from Express so it can be unit-tested independently.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface AnswerInput {
  questionId: number;
  selectedAnswer: number;
}

export interface FeedbackItem {
  questionId: number;
  question: string;
  options: string[];
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
}

export interface GradingResult {
  score: number;
  totalQuestions: number;
  accuracy: number;          // 0–100 rounded to 2 dp
  feedback: FeedbackItem[];
}

// ─── Grading logic ──────────────────────────────────────────────────────────

export function gradeQuiz(
  questions: QuizQuestion[],
  answers: AnswerInput[],
): GradingResult {
  let score = 0;

  const feedback: FeedbackItem[] = questions.map(q => {
    const answer = answers.find(a => a.questionId === q.id);
    const selected = answer?.selectedAnswer ?? -1;
    const isCorrect = selected === q.correctAnswer;
    if (isCorrect) score++;

    return {
      questionId: q.id,
      question: q.question,
      options: q.options,
      selectedAnswer: selected,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const totalQuestions = questions.length;
  const accuracy = totalQuestions > 0
    ? Math.round((score / totalQuestions) * 10000) / 100
    : 0;

  return { score, totalQuestions, accuracy, feedback };
}
