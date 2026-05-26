import { Router } from "express";
import { db, userPerformanceTable, resultsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

// ─── Adaptive Logic ────────────────────────────────────────────────────────

type Difficulty = "easy" | "medium" | "hard";
const LEVELS: Difficulty[] = ["easy", "medium", "hard"];

function computeNextDifficulty(current: Difficulty, score: number): Difficulty {
  const idx = LEVELS.indexOf(current);
  if (score >= 75) return LEVELS[Math.min(idx + 1, 2)]; // promote
  if (score < 50)  return LEVELS[Math.max(idx - 1, 0)]; // demote
  return current;                                         // maintain
}

function computeReward(score: number): number {
  return Math.round((score / 100) * 100) / 100; // 2 dp
}

function computeAction(current: Difficulty, next: Difficulty): string {
  if (LEVELS.indexOf(next) > LEVELS.indexOf(current)) return "increase";
  if (LEVELS.indexOf(next) < LEVELS.indexOf(current)) return "decrease";
  return "maintain";
}

// ─── POST /adaptive/suggest ────────────────────────────────────────────────
// Called right after a quiz result is saved. Creates a suggestion row.
router.post("/suggest", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { resultId } = req.body;
    if (!resultId) {
      res.status(400).json({ error: "Validation error", message: "resultId is required" });
      return;
    }

    // Load the result
    const [result] = await db
      .select()
      .from(resultsTable)
      .where(and(eq(resultsTable.id, resultId), eq(resultsTable.userId, req.userId!)))
      .limit(1);

    if (!result) {
      res.status(404).json({ error: "Not found", message: "Result not found" });
      return;
    }

    // Avoid duplicate suggestions for the same result
    const [existing] = await db
      .select()
      .from(userPerformanceTable)
      .where(and(eq(userPerformanceTable.resultId, resultId), eq(userPerformanceTable.userId, req.userId!)))
      .limit(1);

    if (existing) {
      // Already computed — return cached
      res.json(buildResponse(existing, result.accuracy));
      return;
    }

    const current = result.difficulty as Difficulty;
    const score = result.accuracy;
    const next = computeNextDifficulty(current, score);
    const reward = computeReward(score);
    const action = computeAction(current, next);

    const [perf] = await db
      .insert(userPerformanceTable)
      .values({
        userId: req.userId!,
        resultId: result.id,
        score,
        difficulty: current,
        nextDifficulty: next,
        reward,
        accepted: null,
        chosenDifficulty: null,
      })
      .returning();

    res.json({
      performanceId: perf.id,
      state: { difficulty: current, score },
      action,
      suggestedDifficulty: next,
      reward,
      message: buildMessage(action, next),
    });
  } catch (err) {
    req.log.error(err, "Adaptive suggest error");
    res.status(500).json({ error: "Internal server error", message: "Failed to compute suggestion" });
  }
});

// ─── POST /adaptive/decide ─────────────────────────────────────────────────
// Called when user accepts or overrides the suggestion.
router.post("/decide", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { performanceId, accepted, chosenDifficulty } = req.body;

    if (typeof performanceId !== "number" || typeof accepted !== "boolean") {
      res.status(400).json({ error: "Validation error", message: "performanceId and accepted are required" });
      return;
    }

    const [perf] = await db
      .select()
      .from(userPerformanceTable)
      .where(and(eq(userPerformanceTable.id, performanceId), eq(userPerformanceTable.userId, req.userId!)))
      .limit(1);

    if (!perf) {
      res.status(404).json({ error: "Not found", message: "Performance record not found" });
      return;
    }

    const finalDifficulty = accepted ? perf.nextDifficulty : (chosenDifficulty ?? perf.difficulty);

    const [updated] = await db
      .update(userPerformanceTable)
      .set({ accepted, chosenDifficulty: finalDifficulty })
      .where(eq(userPerformanceTable.id, performanceId))
      .returning();

    res.json({
      performanceId: updated.id,
      accepted,
      finalDifficulty,
      message: accepted
        ? `Great! Next quiz will be ${finalDifficulty} difficulty.`
        : `Understood. Next quiz will be ${finalDifficulty} difficulty.`,
    });
  } catch (err) {
    req.log.error(err, "Adaptive decide error");
    res.status(500).json({ error: "Internal server error", message: "Failed to save decision" });
  }
});

// ─── GET /adaptive/history ─────────────────────────────────────────────────
// Returns performance history for charts.
router.get("/history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const records = await db
      .select({
        id: userPerformanceTable.id,
        score: userPerformanceTable.score,
        difficulty: userPerformanceTable.difficulty,
        nextDifficulty: userPerformanceTable.nextDifficulty,
        reward: userPerformanceTable.reward,
        accepted: userPerformanceTable.accepted,
        chosenDifficulty: userPerformanceTable.chosenDifficulty,
        completedAt: userPerformanceTable.completedAt,
        topic: resultsTable.topic,
      })
      .from(userPerformanceTable)
      .innerJoin(resultsTable, eq(userPerformanceTable.resultId, resultsTable.id))
      .where(eq(userPerformanceTable.userId, req.userId!))
      .orderBy(desc(userPerformanceTable.completedAt))
      .limit(30);

    res.json({
      history: records.map(r => ({
        id: r.id,
        score: r.score,
        difficulty: r.difficulty,
        nextDifficulty: r.nextDifficulty,
        reward: r.reward,
        action: computeAction(r.difficulty as Difficulty, r.nextDifficulty as Difficulty),
        accepted: r.accepted,
        finalDifficulty: r.chosenDifficulty ?? r.nextDifficulty,
        topic: r.topic,
        completedAt: r.completedAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error(err, "Adaptive history error");
    res.status(500).json({ error: "Internal server error", message: "Failed to fetch history" });
  }
});

// ─── GET /adaptive/next-difficulty ────────────────────────────────────────
// Returns the recommended difficulty for the next quiz based on last performance.
router.get("/next-difficulty", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [latest] = await db
      .select()
      .from(userPerformanceTable)
      .where(eq(userPerformanceTable.userId, req.userId!))
      .orderBy(desc(userPerformanceTable.completedAt))
      .limit(1);

    if (!latest) {
      res.json({ difficulty: "easy", reason: "No previous performance data. Starting at easy." });
      return;
    }

    const final = latest.chosenDifficulty ?? latest.nextDifficulty;
    res.json({ difficulty: final, reason: `Based on your last score of ${latest.score}%.` });
  } catch (err) {
    req.log.error(err, "Next difficulty error");
    res.status(500).json({ error: "Internal server error", message: "Failed to get next difficulty" });
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildResponse(perf: any, score: number) {
  return {
    performanceId: perf.id,
    state: { difficulty: perf.difficulty, score },
    action: computeAction(perf.difficulty as Difficulty, perf.nextDifficulty as Difficulty),
    suggestedDifficulty: perf.nextDifficulty,
    reward: perf.reward,
    message: buildMessage(
      computeAction(perf.difficulty as Difficulty, perf.nextDifficulty as Difficulty),
      perf.nextDifficulty,
    ),
  };
}

function buildMessage(action: string, next: string): string {
  if (action === "increase") return `Excellent performance! We're bumping you up to ${next} difficulty.`;
  if (action === "decrease") return `Let's build confidence. We're moving you to ${next} difficulty.`;
  return `Steady progress! Staying at ${next} difficulty for now.`;
}

export default router;
