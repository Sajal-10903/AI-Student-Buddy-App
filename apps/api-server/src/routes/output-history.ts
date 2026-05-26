/**
 * output-history.ts
 *
 * Routes for browsing and downloading AI-generated output files.
 *
 *   GET  /api/output-history          → list all files for authenticated user
 *   GET  /api/output-history/download/:subdir/:filename → stream a file
 */

import { Router, type Response } from "express";
import path from "path";
import fs from "fs";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { listAllOutputFiles, readOutputFile, GENERATED_DIR, RESULTS_DIR } from "../services/output.service";

const router = Router();

// ─── List output files ─────────────────────────────────────────────────────

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const files = listAllOutputFiles(req.userId!);
    res.json({
      total: files.length,
      files,
    });
  } catch (err) {
    req.log.error(err, "List output history error");
    res.status(500).json({ error: "Internal server error", message: "Failed to list output files" });
  }
});

// ─── Download / view a file ────────────────────────────────────────────────

router.get("/download/:subdir/:filename", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { subdir, filename } = req.params;

    // Validate subdir
    if (!["generated", "results"].includes(subdir)) {
      res.status(400).json({ error: "Validation error", message: "Invalid subdir" });
      return;
    }

    // Sanitise filename — no path traversal
    const safe = path.basename(filename);
    if (!safe.endsWith(".json")) {
      res.status(400).json({ error: "Validation error", message: "Only .json files are served" });
      return;
    }

    const dir      = subdir === "generated" ? GENERATED_DIR : RESULTS_DIR;
    const fullPath = path.join(dir, safe);

    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: "Not found", message: "File not found" });
      return;
    }

    // Read and verify ownership (check _meta.userId)
    const content = readOutputFile(subdir as "generated" | "results", safe);
    if (!content) {
      res.status(404).json({ error: "Not found", message: "File not found" });
      return;
    }

    const meta = (content as any)._meta;
    if (meta?.userId && meta.userId !== req.userId) {
      res.status(403).json({ error: "Forbidden", message: "This file does not belong to you" });
      return;
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${safe}"`);
    res.sendFile(fullPath);
  } catch (err) {
    req.log.error(err, "Download output file error");
    res.status(500).json({ error: "Internal server error", message: "Failed to download file" });
  }
});

export default router;
