import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout";
import { Card, Button, Badge } from "@/components/ui";
import { Upload, Sparkles, Loader2, CheckCircle2, RotateCcw, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Flashcard {
  id: number;
  front: string;
  back: string;
  category: string;
}

interface PdfInfo {
  pdfId: number;
  filename: string;
  pageCount: number;
  charCount: number;
}

function getAuthToken(): string {
  try {
    const s = localStorage.getItem("auth-storage");
    if (s) return JSON.parse(s)?.state?.token ?? "";
  } catch {}
  return "";
}

function FlipCard({ card, idx, total }: { card: Flashcard; idx: number; total: number }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-muted-foreground font-medium">
        Card {idx + 1} of {total}
        {card.category && <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{card.category}</span>}
      </div>

      {/* Flip card */}
      <div
        className="relative w-full max-w-2xl cursor-pointer select-none"
        style={{ perspective: "1200px" }}
        onClick={() => setFlipped(f => !f)}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative w-full"
        >
          {/* Front */}
          <div
            className="backface-hidden"
            style={{ backfaceVisibility: "hidden" }}
          >
            <Card className="p-8 min-h-[260px] flex flex-col items-center justify-center text-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20 shadow-xl">
              <p className="text-xs uppercase tracking-widest text-primary/60 mb-4 font-bold">Question / Term</p>
              <p className="text-xl font-display font-semibold leading-relaxed">{card.front}</p>
              <p className="text-xs text-muted-foreground mt-6">Tap to reveal answer →</p>
            </Card>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 backface-hidden"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <Card className="p-8 min-h-[260px] flex flex-col items-center justify-center text-center bg-gradient-to-br from-green-500/5 via-background to-emerald-500/5 border-green-500/20 shadow-xl">
              <p className="text-xs uppercase tracking-widest text-green-500/60 mb-4 font-bold">Answer / Definition</p>
              <p className="text-lg leading-relaxed text-foreground/90">{card.back}</p>
              <p className="text-xs text-muted-foreground mt-6">← Tap to see question</p>
            </Card>
          </div>
        </motion.div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); setFlipped(f => !f); }}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Flip card
      </button>
    </div>
  );
}

export default function Flashcards() {
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [cardCount, setCardCount] = useState(10);
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<"upload" | "cards">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }
    setUploading(true);
    setFlashcards([]);
    setPdfInfo(null);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await fetch("/api/pdf/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setPdfInfo(data);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!pdfInfo) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/pdf/${pdfInfo.pdfId}/flashcards`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ count: cardCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Generation failed");
      setFlashcards(data.flashcards);
      setCurrentIdx(0);
      setMode("cards");
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleQuizFromPdf = async () => {
    if (!pdfInfo) return;
    try {
      const res = await fetch(`/api/pdf/${pdfInfo.pdfId}/quiz`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: "medium", questionCount: 5 }),
      });
      const quiz = await res.json();
      if (!res.ok) throw new Error(quiz.message || "Failed");
      // Store and navigate
      const storeStr = localStorage.getItem("quiz-storage");
      const store = storeStr ? JSON.parse(storeStr) : { state: {} };
      store.state.activeQuiz = quiz;
      localStorage.setItem("quiz-storage", JSON.stringify(store));
      window.location.href = "/quiz/take";
    } catch (err: any) {
      toast({ title: "Quiz generation failed", description: err.message, variant: "destructive" });
    }
  };

  const prev = () => setCurrentIdx(i => Math.max(0, i - 1));
  const next = () => setCurrentIdx(i => Math.min(flashcards.length - 1, i + 1));

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Flashcards</h1>
            <p className="text-muted-foreground mt-1">Upload a PDF and generate AI-powered study flashcards.</p>
          </div>
          {mode === "cards" && (
            <Button variant="outline" size="sm" onClick={() => { setMode("upload"); setFlashcards([]); }}>
              New PDF
            </Button>
          )}
        </div>

        {mode === "upload" && (
          <div className="space-y-4">
            {/* Upload Zone */}
            <Card
              className={`border-2 border-dashed transition-all duration-200 cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
                {uploading ? (
                  <><Loader2 className="w-10 h-10 text-primary animate-spin mb-3" /><p className="text-muted-foreground">Processing PDF...</p></>
                ) : pdfInfo ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
                    <p className="font-bold">{pdfInfo.filename}</p>
                    <p className="text-sm text-muted-foreground mt-1">{pdfInfo.pageCount} pages extracted</p>
                    <p className="text-xs text-primary mt-1 underline">Click to change</p>
                  </>
                ) : (
                  <>
                    <FileText className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <p className="font-bold">Drop a PDF here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </>
                )}
              </div>
            </Card>

            {pdfInfo && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Card count picker */}
                <Card className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm">Number of flashcards</p>
                    <p className="text-xs text-muted-foreground">How many cards to generate</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setCardCount(c => Math.max(5, c - 5))} className="w-8 h-8 rounded-full border hover:bg-muted flex items-center justify-center font-bold text-lg">-</button>
                    <span className="font-bold text-xl w-8 text-center">{cardCount}</span>
                    <button onClick={() => setCardCount(c => Math.min(20, c + 5))} className="w-8 h-8 rounded-full border hover:bg-muted flex items-center justify-center font-bold text-lg">+</button>
                  </div>
                </Card>

                <Button size="lg" className="w-full h-14 text-lg" onClick={handleGenerate} disabled={generating}>
                  {generating
                    ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Creating flashcards...</>
                    : <><Sparkles className="w-5 h-5 mr-2" />Generate {cardCount} Flashcards</>
                  }
                </Button>
                {generating && <p className="text-center text-xs text-muted-foreground animate-pulse">AI is creating your study cards...</p>}
              </motion.div>
            )}
          </div>
        )}

        {mode === "cards" && flashcards.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
              <FlipCard card={flashcards[currentIdx]} idx={currentIdx} total={flashcards.length} />

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={prev} disabled={currentIdx === 0} className="flex items-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>
                <div className="flex gap-1">
                  {flashcards.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIdx(i)}
                      className={cn("w-2 h-2 rounded-full transition-all", i === currentIdx ? "bg-primary w-5" : "bg-muted-foreground/30 hover:bg-muted-foreground/60")}
                    />
                  ))}
                </div>
                <Button variant="outline" onClick={next} disabled={currentIdx === flashcards.length - 1} className="flex items-center gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setCurrentIdx(0); }}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Restart
                </Button>
                <Button className="flex-1" onClick={handleQuizFromPdf}>
                  <Sparkles className="w-4 h-4 mr-2" /> Take Quiz on This PDF
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </AppLayout>
  );
}
