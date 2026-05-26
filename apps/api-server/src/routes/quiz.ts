/**
 * quiz.ts (route handler)
 *
 * Thin request/response layer only.
 * Grading logic lives in services/quiz.service.ts.
 * AI generation logic lives in lib/gemini.ts.
 * File persistence lives in services/output.service.ts.
 */

import { Router } from "express";
import { db, quizzesTable, resultsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { generateQuizQuestions } from "../lib/gemini";
import { gradeQuiz } from "../services/quiz.service";
import { saveGeneratedFile, saveQuizResult } from "../services/output.service";

const router = Router();

// ─── POST /quiz/generate ───────────────────────────────────────────────────

router.post("/generate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { topic, difficulty, questionCount = 5 } = req.body;

    if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
      res.status(400).json({ error: "Validation error", message: "topic must be at least 2 characters" });
      return;
    }

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      res.status(400).json({ error: "Validation error", message: "difficulty must be easy, medium, or hard" });
      return;
    }

    const count = Math.min(Math.max(Number(questionCount) || 5, 5), 10);

    const questions = await generateQuizQuestions(topic.trim(), difficulty, count);

    const [quiz] = await db
      .insert(quizzesTable)
      .values({ userId: req.userId!, topic: topic.trim(), difficulty, questions })
      .returning();

    // Persist generated quiz to output folder
    const savedFile = saveGeneratedFile(
      "quiz",
      req.userId!,
      { quizId: quiz.id, topic: quiz.topic, difficulty, questions },
      topic.trim(),
    );

    req.log.info({ quizId: quiz.id, savedFile }, "Quiz generated and saved");

    res.json({
      quizId: quiz.id,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      questions: quiz.questions,
      createdAt: quiz.createdAt.toISOString(),
      savedFile,
    });
  } catch (err) {
    req.log.error(err, "Generate quiz error");
    res.status(500).json({ error: "Internal server error", message: "Failed to generate quiz" });
  }
});

// ─── POST /quiz/submit ─────────────────────────────────────────────────────

router.post("/submit", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { quizId, answers, totalTimeTakenSeconds } = req.body;

    if (!quizId || !answers || !Array.isArray(answers)) {
      res.status(400).json({ error: "Validation error", message: "quizId and answers are required" });
      return;
    }

    const [quiz] = await db
      .select()
      .from(quizzesTable)
      .where(and(eq(quizzesTable.id, Number(quizId)), eq(quizzesTable.userId, req.userId!)))
      .limit(1);

    if (!quiz) {
      res.status(404).json({ error: "Not found", message: "Quiz not found" });
      return;
    }

    // Delegate grading to service
    const { score, totalQuestions, accuracy, feedback } = gradeQuiz(
      quiz.questions as any[],
      answers,
    );

    const [result] = await db
      .insert(resultsTable)
      .values({
        userId: req.userId!,
        quizId: quiz.id,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        score,
        totalQuestions,
        accuracy,
        timeTakenSeconds: totalTimeTakenSeconds ?? null,
        feedback,
      })
      .returning();

    // Persist quiz result to output/saved_results/
    const savedFile = saveQuizResult(
      req.userId!,
      {
        resultId: result.id,
        quizId: quiz.id,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        score,
        totalQuestions,
        accuracy,
        timeTakenSeconds: result.timeTakenSeconds,
        feedback,
        completedAt: result.completedAt.toISOString(),
      },
      quiz.topic,
    );

    req.log.info({ resultId: result.id, score, accuracy, savedFile }, "Quiz result saved");

    res.json({
      resultId: result.id,
      quizId: quiz.id,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      score,
      totalQuestions,
      accuracy,
      timeTakenSeconds: result.timeTakenSeconds,
      feedback,
      completedAt: result.completedAt.toISOString(),
      savedFile,
    });
  } catch (err) {
    req.log.error(err, "Submit quiz error");
    res.status(500).json({ error: "Internal server error", message: "Failed to submit quiz" });
  }
});

export default router;
