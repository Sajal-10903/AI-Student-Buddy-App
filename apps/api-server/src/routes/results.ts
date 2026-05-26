import { Router } from "express";
import { db, resultsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const results = await db
      .select()
      .from(resultsTable)
      .where(eq(resultsTable.userId, req.userId!))
      .orderBy(desc(resultsTable.completedAt));

    res.json({
      results: results.map((r) => ({
        resultId: r.id,
        quizId: r.quizId,
        topic: r.topic,
        difficulty: r.difficulty,
        score: r.score,
        totalQuestions: r.totalQuestions,
        accuracy: r.accuracy,
        timeTakenSeconds: r.timeTakenSeconds,
        completedAt: r.completedAt.toISOString(),
      })),
      total: results.length,
    });
  } catch (err) {
    req.log.error(err, "Get results error");
    res.status(500).json({ error: "Internal server error", message: "Failed to fetch results" });
  }
});

router.get("/:resultId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const resultId = Number(req.params.resultId);
    if (isNaN(resultId)) {
      res.status(400).json({ error: "Validation error", message: "Invalid result ID" });
      return;
    }

    const [result] = await db
      .select()
      .from(resultsTable)
      .where(and(eq(resultsTable.id, resultId), eq(resultsTable.userId, req.userId!)))
      .limit(1);

    if (!result) {
      res.status(404).json({ error: "Not found", message: "Result not found" });
      return;
    }

    res.json({
      resultId: result.id,
      quizId: result.quizId,
      topic: result.topic,
      difficulty: result.difficulty,
      score: result.score,
      totalQuestions: result.totalQuestions,
      accuracy: result.accuracy,
      timeTakenSeconds: result.timeTakenSeconds,
      feedback: result.feedback,
      completedAt: result.completedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Get result by ID error");
    res.status(500).json({ error: "Internal server error", message: "Failed to fetch result" });
  }
});

export default router;
