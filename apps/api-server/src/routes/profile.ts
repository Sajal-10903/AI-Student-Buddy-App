import { Router } from "express";
import { db, usersTable, resultsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Not found", message: "User not found" });
      return;
    }

    const allResults = await db
      .select()
      .from(resultsTable)
      .where(eq(resultsTable.userId, req.userId!))
      .orderBy(desc(resultsTable.completedAt));

    const totalQuizzes = allResults.length;
    const totalQuestionsAnswered = allResults.reduce((sum, r) => sum + r.totalQuestions, 0);
    const averageAccuracy = totalQuizzes > 0
      ? allResults.reduce((sum, r) => sum + r.accuracy, 0) / totalQuizzes
      : 0;

    const topicMap = new Map<string, { total: number; accuracy: number; best: number }>();
    for (const result of allResults) {
      const existing = topicMap.get(result.topic);
      if (existing) {
        existing.total++;
        existing.accuracy += result.accuracy;
        existing.best = Math.max(existing.best, result.score);
      } else {
        topicMap.set(result.topic, { total: 1, accuracy: result.accuracy, best: result.score });
      }
    }

    const topicStats = Array.from(topicMap.entries()).map(([topic, stats]) => ({
      topic,
      totalAttempts: stats.total,
      averageAccuracy: stats.accuracy / stats.total,
      bestScore: stats.best,
      isWeakArea: (stats.accuracy / stats.total) < 60,
    }));

    const weakAreas = topicStats.filter((t) => t.isWeakArea).map((t) => t.topic);
    const strongAreas = topicStats.filter((t) => !t.isWeakArea && t.averageAccuracy >= 80).map((t) => t.topic);

    const recentResults = allResults.slice(0, 10).map((r) => ({
      resultId: r.id,
      quizId: r.quizId,
      topic: r.topic,
      difficulty: r.difficulty,
      score: r.score,
      totalQuestions: r.totalQuestions,
      accuracy: r.accuracy,
      timeTakenSeconds: r.timeTakenSeconds,
      completedAt: r.completedAt.toISOString(),
    }));

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      stats: {
        totalQuizzes,
        averageAccuracy,
        totalQuestionsAnswered,
        weakAreas,
        strongAreas,
      },
      topicStats,
      recentResults,
    });
  } catch (err) {
    req.log.error(err, "Get profile error");
    res.status(500).json({ error: "Internal server error", message: "Failed to fetch profile" });
  }
});

router.get("/suggestion", requireAuth, async (req: AuthRequest, res) => {
  try {
    const allResults = await db
      .select()
      .from(resultsTable)
      .where(eq(resultsTable.userId, req.userId!))
      .orderBy(desc(resultsTable.completedAt));

    if (allResults.length === 0) {
      res.json({
        topic: "Introduction to Programming",
        difficulty: "easy",
        reason: "Start your learning journey with a beginner-friendly topic!",
        isWeakArea: false,
      });
      return;
    }

    const topicMap = new Map<string, { total: number; accuracy: number; lastDifficulty: string }>();
    for (const result of allResults) {
      const existing = topicMap.get(result.topic);
      if (existing) {
        existing.total++;
        existing.accuracy += result.accuracy;
      } else {
        topicMap.set(result.topic, {
          total: 1,
          accuracy: result.accuracy,
          lastDifficulty: result.difficulty,
        });
      }
    }

    const topicStats = Array.from(topicMap.entries()).map(([topic, stats]) => ({
      topic,
      averageAccuracy: stats.accuracy / stats.total,
      lastDifficulty: stats.lastDifficulty,
    }));

    const weakTopics = topicStats.filter((t) => t.averageAccuracy < 60);

    if (weakTopics.length > 0) {
      const weakest = weakTopics.sort((a, b) => a.averageAccuracy - b.averageAccuracy)[0];
      res.json({
        topic: weakest.topic,
        difficulty: "easy",
        reason: `You scored ${Math.round(weakest.averageAccuracy)}% on ${weakest.topic}. Practice more to improve!`,
        isWeakArea: true,
      });
      return;
    }

    const lastResult = allResults[0];
    let nextDifficulty: string = "medium";
    if (lastResult.accuracy >= 80 && lastResult.difficulty === "easy") nextDifficulty = "medium";
    else if (lastResult.accuracy >= 80 && lastResult.difficulty === "medium") nextDifficulty = "hard";
    else if (lastResult.accuracy < 60) nextDifficulty = "easy";
    else nextDifficulty = lastResult.difficulty;

    res.json({
      topic: lastResult.topic,
      difficulty: nextDifficulty,
      reason: `Great work! Try ${nextDifficulty} difficulty on "${lastResult.topic}" to keep improving.`,
      isWeakArea: false,
    });
  } catch (err) {
    req.log.error(err, "Get suggestion error");
    res.status(500).json({ error: "Internal server error", message: "Failed to get suggestion" });
  }
});

export default router;
