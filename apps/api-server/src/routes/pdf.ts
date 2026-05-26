/**
 * pdf.ts (route handler)
 *
 * Thin request/response layer only.
 * All AI generation logic lives in services/pdf.service.ts.
 * All file persistence logic lives in services/output.service.ts.
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import { db, pdfDocumentsTable, quizzesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { summariseDocument, generateFlashcards, generatePdfQuizQuestions } from "../services/pdf.service";
import { saveGeneratedFile } from "../services/output.service";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// ─── POST /pdf/upload ──────────────────────────────────────────────────────

router.post("/upload", requireAuth, upload.single("pdf"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Validation error", message: "PDF file is required" });
      return;
    }

    const data = await pdfParse(req.file.buffer);
    const extractedText = data.text?.trim();

    if (!extractedText || extractedText.length < 50) {
      res.status(400).json({
        error: "Validation error",
        message: "Could not extract readable text from the PDF. Make sure it is not scanned or image-based.",
      });
      return;
    }

    const [doc] = await db
      .insert(pdfDocumentsTable)
      .values({
        userId: req.userId!,
        filename: req.file.originalname,
        extractedText: extractedText.slice(0, 50000),
        pageCount: data.numpages,
      })
      .returning();

    const response = {
      pdfId: doc.id,
      filename: doc.filename,
      pageCount: doc.pageCount,
      charCount: doc.extractedText.length,
      createdAt: doc.createdAt.toISOString(),
    };

    res.json(response);
  } catch (err: any) {
    req.log.error(err, "PDF upload error");
    if (err.message?.includes("Only PDF")) {
      res.status(400).json({ error: "Validation error", message: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error", message: "Failed to process PDF" });
  }
});

// ─── GET /pdf/:pdfId ───────────────────────────────────────────────────────

router.get("/:pdfId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const pdfId = Number(req.params.pdfId);
    if (isNaN(pdfId)) {
      res.status(400).json({ error: "Validation error", message: "Invalid PDF ID" });
      return;
    }

    const [doc] = await db
      .select({
        id: pdfDocumentsTable.id,
        filename: pdfDocumentsTable.filename,
        pageCount: pdfDocumentsTable.pageCount,
        charCount: pdfDocumentsTable.extractedText,
        createdAt: pdfDocumentsTable.createdAt,
      })
      .from(pdfDocumentsTable)
      .where(and(eq(pdfDocumentsTable.id, pdfId), eq(pdfDocumentsTable.userId, req.userId!)))
      .limit(1);

    if (!doc) {
      res.status(404).json({ error: "Not found", message: "PDF not found" });
      return;
    }

    res.json({
      pdfId: doc.id,
      filename: doc.filename,
      pageCount: doc.pageCount,
      charCount: doc.charCount.length,
      createdAt: doc.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Get PDF error");
    res.status(500).json({ error: "Internal server error", message: "Failed to fetch PDF" });
  }
});

// ─── GET /pdf/ ─────────────────────────────────────────────────────────────

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const docs = await db
      .select({
        id: pdfDocumentsTable.id,
        filename: pdfDocumentsTable.filename,
        pageCount: pdfDocumentsTable.pageCount,
        createdAt: pdfDocumentsTable.createdAt,
      })
      .from(pdfDocumentsTable)
      .where(eq(pdfDocumentsTable.userId, req.userId!));

    res.json({ pdfs: docs.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })) });
  } catch (err) {
    req.log.error(err, "List PDFs error");
    res.status(500).json({ error: "Internal server error", message: "Failed to list PDFs" });
  }
});

// ─── POST /pdf/:pdfId/summarize ────────────────────────────────────────────

router.post("/:pdfId/summarize", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const pdfId = Number(req.params.pdfId);
    const [doc] = await db
      .select()
      .from(pdfDocumentsTable)
      .where(and(eq(pdfDocumentsTable.id, pdfId), eq(pdfDocumentsTable.userId, req.userId!)))
      .limit(1);

    if (!doc) {
      res.status(404).json({ error: "Not found", message: "PDF not found" });
      return;
    }

    // Delegate to service
    const summary = await summariseDocument(doc.extractedText);

    // Persist to output folder
    const savedFile = saveGeneratedFile("summary", req.userId!, { summary }, doc.filename);

    req.log.info({ pdfId, savedFile }, "Summary generated and saved");
    res.json({ pdfId: doc.id, filename: doc.filename, summary, savedFile });
  } catch (err) {
    req.log.error(err, "Summarize error");
    res.status(500).json({ error: "Internal server error", message: "Failed to generate summary" });
  }
});

// ─── POST /pdf/:pdfId/flashcards ───────────────────────────────────────────

router.post("/:pdfId/flashcards", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const pdfId = Number(req.params.pdfId);
    const count = Math.min(Math.max(Number(req.body.count) || 10, 5), 20);

    const [doc] = await db
      .select()
      .from(pdfDocumentsTable)
      .where(and(eq(pdfDocumentsTable.id, pdfId), eq(pdfDocumentsTable.userId, req.userId!)))
      .limit(1);

    if (!doc) {
      res.status(404).json({ error: "Not found", message: "PDF not found" });
      return;
    }

    // Delegate to service
    const flashcards = await generateFlashcards(doc.extractedText, count);

    // Persist to output folder
    const savedFile = saveGeneratedFile("flashcards", req.userId!, { flashcards }, doc.filename);

    req.log.info({ pdfId, count, savedFile }, "Flashcards generated and saved");
    res.json({ pdfId: doc.id, filename: doc.filename, flashcards, savedFile });
  } catch (err) {
    req.log.error(err, "Flashcards error");
    res.status(500).json({ error: "Internal server error", message: "Failed to generate flashcards" });
  }
});

// ─── POST /pdf/:pdfId/quiz ─────────────────────────────────────────────────

router.post("/:pdfId/quiz", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const pdfId = Number(req.params.pdfId);
    const { difficulty = "medium", questionCount = 5 } = req.body;
    const count = Math.min(Math.max(Number(questionCount), 5), 10);

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      res.status(400).json({ error: "Validation error", message: "difficulty must be easy, medium, or hard" });
      return;
    }

    const [doc] = await db
      .select()
      .from(pdfDocumentsTable)
      .where(and(eq(pdfDocumentsTable.id, pdfId), eq(pdfDocumentsTable.userId, req.userId!)))
      .limit(1);

    if (!doc) {
      res.status(404).json({ error: "Not found", message: "PDF not found" });
      return;
    }

    // Delegate to service
    const questions = await generatePdfQuizQuestions(doc.extractedText, difficulty, count);

    // Save as a quiz in the DB
    const [quiz] = await db
      .insert(quizzesTable)
      .values({
        userId: req.userId!,
        topic: `${doc.filename} (PDF)`,
        difficulty,
        questions,
      })
      .returning();

    // Persist to output folder
    const savedFile = saveGeneratedFile(
      "pdf-quiz",
      req.userId!,
      { quizId: quiz.id, topic: quiz.topic, difficulty, questions },
      doc.filename,
    );

    req.log.info({ pdfId, difficulty, savedFile }, "PDF quiz generated and saved");
    res.json({
      quizId: quiz.id,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      questions: quiz.questions,
      createdAt: quiz.createdAt.toISOString(),
      savedFile,
    });
  } catch (err) {
    req.log.error(err, "PDF quiz error");
    res.status(500).json({ error: "Internal server error", message: "Failed to generate quiz from PDF" });
  }
});

export default router;
