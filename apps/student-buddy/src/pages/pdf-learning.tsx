import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout";
import { Card, Button, Badge, Progress } from "@/components/ui";
import {
  Upload, Sparkles, Loader2, CheckCircle2, RotateCcw,
  ChevronLeft, ChevronRight, FileText, BookOpen, List,
  ChevronDown, ChevronRight as ChevronRightIcon,
  CreditCard, ClipboardList, X, Trophy, AlertCircle, FolderOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PdfInfo {
  pdfId: number;
  filename: string;
  pageCount: number;
  charCount: number;
}

interface SummarySection { heading: string; content: string; }
interface Summary {
  title: string; overview: string;
  keyPoints: string[]; sections: SummarySection[]; conclusion: string;
}

interface Flashcard { id: number; front: string; back: string; category: string; }

interface QuizQuestion {
  id: number; question: string; options: string[];
  correctAnswer: number; explanation: string;
}

type Tab = "summary" | "flashcards" | "quiz";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthToken(): string {
  try {
    const s = localStorage.getItem("auth-storage");
    if (s) return JSON.parse(s)?.state?.token ?? "";
  } catch {}
  return "";
}

async function apiPost(url: string, body?: object, isFormData?: boolean) {
  const headers: Record<string, string> = { Authorization: `Bearer ${getAuthToken()}` };
  if (!isFormData) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: isFormData ? (body as any) : (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({
  pdfInfo, uploading, onFile, onReset,
}: {
  pdfInfo: PdfInfo | null; uploading: boolean;
  onFile: (f: File) => void; onReset: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback((file: File) => {
    if (file.type !== "application/pdf") return;
    onFile(file);
  }, [onFile]);

  if (pdfInfo) {
    return (
      <div className="flex items-center gap-3 px-5 py-3 bg-green-50 border border-green-200 rounded-2xl">
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-green-800 truncate text-sm">{pdfInfo.filename}</p>
          <p className="text-xs text-green-600">{pdfInfo.pageCount} pages · {(pdfInfo.charCount / 1000).toFixed(1)}k chars</p>
        </div>
        <button
          onClick={onReset}
          className="p-1 hover:bg-green-100 rounded-lg text-green-600 transition-colors"
          title="Upload a different PDF"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer",
        dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/20",
      )}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) accept(f); }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef} type="file" accept=".pdf" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) accept(f); e.target.value = ""; }}
      />
      <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
        {uploading ? (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-3" />
            <p className="font-semibold text-foreground">Extracting text from PDF…</p>
            <p className="text-sm text-muted-foreground mt-1">This takes a few seconds</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <p className="font-bold text-lg text-foreground">Drop your PDF here</p>
            <p className="text-muted-foreground text-sm mt-1">or <span className="text-primary underline">browse files</span> · Max 20 MB</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Summary Tab ──────────────────────────────────────────────────────────────

function SummaryTab({ pdfInfo }: { pdfInfo: PdfInfo }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]));
  const { toast } = useToast();

  const generate = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const data = await apiPost(`/api/pdf/${pdfInfo.pdfId}/summarize`);
      setSummary(data.summary);
      setOpenSections(new Set([0]));
    } catch (e: any) {
      toast({ title: "Summary failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (i: number) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center">
          <BookOpen className="w-10 h-10 text-blue-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-2">Generate AI Summary</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            Our AI will read your PDF and create a structured summary with key points and section breakdowns.
          </p>
        </div>
        <Button size="lg" className="px-10 h-12" onClick={generate} disabled={loading}>
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing PDF…</>
            : <><Sparkles className="w-4 h-4 mr-2" />Generate Summary</>}
        </Button>
        {loading && <p className="text-xs text-muted-foreground animate-pulse">AI is reading your document…</p>}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Overview */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/60">
        <div className="flex items-start gap-3">
          <BookOpen className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-xl font-display font-bold text-blue-900">{summary.title}</h2>
            <p className="text-blue-700/80 mt-2 leading-relaxed text-sm">{summary.overview}</p>
          </div>
        </div>
      </Card>

      {/* Key Points */}
      <Card className="p-6">
        <h3 className="font-bold text-base flex items-center gap-2 mb-4">
          <List className="w-5 h-5 text-primary" />Key Points
        </h3>
        <ul className="space-y-2.5">
          {summary.keyPoints.map((pt, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-3"
            >
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-foreground/80">{pt}</span>
            </motion.li>
          ))}
        </ul>
      </Card>

      {/* Section Accordion */}
      {summary.sections.length > 0 && (
        <Card className="p-6">
          <h3 className="font-bold text-base flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />Section Breakdown
          </h3>
          <div className="space-y-2">
            {summary.sections.map((sec, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => toggleSection(i)}
                >
                  <span className="font-semibold text-sm">{sec.heading}</span>
                  {openSections.has(i)
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    : <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {openSections.has(i) && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{sec.content}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Conclusion */}
      <Card className="p-5 bg-muted/30">
        <h3 className="font-bold text-sm mb-2 text-muted-foreground uppercase tracking-wide">Conclusion</h3>
        <p className="text-sm leading-relaxed">{summary.conclusion}</p>
      </Card>

      <Button variant="outline" onClick={() => setSummary(null)} className="w-full">
        <RotateCcw className="w-4 h-4 mr-2" />Re-generate Summary
      </Button>
    </motion.div>
  );
}

// ─── Flashcards Tab ───────────────────────────────────────────────────────────

function FlipCard({ card, idx, total }: { card: Flashcard; idx: number; total: number }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
        <span>Card {idx + 1} of {total}</span>
        {card.category && (
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{card.category}</span>
        )}
      </div>

      <div className="relative w-full cursor-pointer select-none" style={{ perspective: "1200px" }} onClick={() => setFlipped(f => !f)}>
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative w-full"
        >
          <div style={{ backfaceVisibility: "hidden" }}>
            <Card className="p-8 min-h-[240px] flex flex-col items-center justify-center text-center bg-gradient-to-br from-indigo-50 via-background to-purple-50 border-indigo-200/60 shadow-lg">
              <p className="text-xs uppercase tracking-widest text-indigo-400 mb-4 font-bold">Question / Term</p>
              <p className="text-xl font-display font-semibold leading-relaxed">{card.front}</p>
              <p className="text-xs text-muted-foreground mt-6">Tap to reveal answer →</p>
            </Card>
          </div>
          <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <Card className="p-8 min-h-[240px] flex flex-col items-center justify-center text-center bg-gradient-to-br from-green-50 via-background to-emerald-50 border-green-200/60 shadow-lg">
              <p className="text-xs uppercase tracking-widest text-green-500/70 mb-4 font-bold">Answer / Definition</p>
              <p className="text-lg leading-relaxed text-foreground/90">{card.back}</p>
              <p className="text-xs text-muted-foreground mt-6">← Tap to see question</p>
            </Card>
          </div>
        </motion.div>
      </div>

      <button
        onClick={() => setFlipped(f => !f)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />Flip card
      </button>
    </div>
  );
}

function FlashcardsTab({ pdfInfo }: { pdfInfo: PdfInfo }) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [cardCount, setCardCount] = useState(10);
  const [currentIdx, setCurrentIdx] = useState(0);
  const { toast } = useToast();

  const generate = async () => {
    setLoading(true);
    setFlashcards([]);
    try {
      const data = await apiPost(`/api/pdf/${pdfInfo.pdfId}/flashcards`, { count: cardCount });
      setFlashcards(data.flashcards);
      setCurrentIdx(0);
    } catch (e: any) {
      toast({ title: "Flashcard generation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-purple-50 flex items-center justify-center">
          <CreditCard className="w-10 h-10 text-purple-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-2">Generate Flashcards</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            Convert your PDF into interactive flip-cards to help memorize key concepts.
          </p>
        </div>

        <Card className="p-4 flex items-center gap-6 w-full max-w-xs">
          <div className="text-left flex-1">
            <p className="font-semibold text-sm">Number of cards</p>
            <p className="text-xs text-muted-foreground">5 – 20 flashcards</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCardCount(c => Math.max(5, c - 5))}
              className="w-8 h-8 rounded-full border hover:bg-muted flex items-center justify-center font-bold"
            >−</button>
            <span className="font-bold text-xl w-6 text-center">{cardCount}</span>
            <button
              onClick={() => setCardCount(c => Math.min(20, c + 5))}
              className="w-8 h-8 rounded-full border hover:bg-muted flex items-center justify-center font-bold"
            >+</button>
          </div>
        </Card>

        <Button size="lg" className="px-10 h-12" onClick={generate} disabled={loading}>
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating flashcards…</>
            : <><Sparkles className="w-4 h-4 mr-2" />Generate {cardCount} Flashcards</>}
        </Button>
        {loading && <p className="text-xs text-muted-foreground animate-pulse">AI is creating your study cards…</p>}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.18 }}
        >
          <FlipCard card={flashcards[currentIdx]} idx={currentIdx} total={flashcards.length} />
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" />Prev
        </Button>
        <div className="flex gap-1.5 flex-wrap justify-center max-w-[200px]">
          {flashcards.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-200",
                i === currentIdx ? "bg-primary w-5" : "bg-muted-foreground/30 hover:bg-muted-foreground/60 w-2",
              )}
            />
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setCurrentIdx(i => Math.min(flashcards.length - 1, i + 1))} disabled={currentIdx === flashcards.length - 1}>
          Next<ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <Button variant="outline" onClick={() => setFlashcards([])} className="w-full">
        <RotateCcw className="w-4 h-4 mr-2" />Generate New Flashcards
      </Button>
    </motion.div>
  );
}

// ─── Quiz Tab ─────────────────────────────────────────────────────────────────

type QuizState = "settings" | "taking" | "results";

function QuizTab({ pdfInfo }: { pdfInfo: PdfInfo }) {
  const [state, setState] = useState<QuizState>("settings");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [qCount, setQCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const generate = async () => {
    setLoading(true);
    try {
      const data = await apiPost(`/api/pdf/${pdfInfo.pdfId}/quiz`, { difficulty, questionCount: qCount });
      setQuestions(data.questions);
      setAnswers({});
      setSubmitted(false);
      setState("taking");
    } catch (e: any) {
      toast({ title: "Quiz generation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setState("results");
  };

  const score = questions.filter(q => answers[q.id] === q.correctAnswer).length;
  const pct = Math.round((score / questions.length) * 100);

  // Settings
  if (state === "settings") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center">
          <ClipboardList className="w-10 h-10 text-amber-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-2">PDF-Based Quiz</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            Test your understanding with questions generated strictly from your uploaded document.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          {/* Difficulty */}
          <Card className="p-4">
            <p className="font-semibold text-sm mb-3">Difficulty</p>
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "medium", "hard"] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "py-2 rounded-xl text-sm font-semibold border-2 transition-all capitalize",
                    difficulty === d
                      ? d === "easy" ? "border-green-500 bg-green-50 text-green-700"
                        : d === "medium" ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-red-500 bg-red-50 text-red-700"
                      : "border-border hover:border-muted-foreground/40 text-muted-foreground",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </Card>

          {/* Question count */}
          <Card className="p-4 flex items-center justify-between">
            <div className="text-left">
              <p className="font-semibold text-sm">Questions</p>
              <p className="text-xs text-muted-foreground">5 to 10</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQCount(c => Math.max(5, c - 1))}
                className="w-8 h-8 rounded-full border hover:bg-muted flex items-center justify-center font-bold"
              >−</button>
              <span className="font-bold text-xl w-4 text-center">{qCount}</span>
              <button
                onClick={() => setQCount(c => Math.min(10, c + 1))}
                className="w-8 h-8 rounded-full border hover:bg-muted flex items-center justify-center font-bold"
              >+</button>
            </div>
          </Card>
        </div>

        <Button size="lg" className="px-10 h-12" onClick={generate} disabled={loading}>
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Quiz…</>
            : <><Sparkles className="w-4 h-4 mr-2" />Start Quiz</>}
        </Button>
        {loading && <p className="text-xs text-muted-foreground animate-pulse">AI is creating questions from your PDF…</p>}
      </div>
    );
  }

  // Taking quiz — show all questions, select answers, then submit
  if (state === "taking") {
    const answeredCount = Object.keys(answers).length;

    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">{questions.length} Questions · <span className="capitalize text-primary">{difficulty}</span></p>
            <p className="text-xs text-muted-foreground">{answeredCount} of {questions.length} answered</p>
          </div>
          <Badge variant="outline" className="font-mono">{answeredCount}/{questions.length}</Badge>
        </div>

        <Progress value={(answeredCount / questions.length) * 100} className="h-1.5 rounded-full" />

        <div className="space-y-5">
          {questions.map((q, qi) => (
            <Card key={q.id} className={cn("p-5 transition-all", answers[q.id] !== undefined ? "border-primary/30 bg-primary/3" : "")}>
              <p className="font-semibold mb-4 leading-snug">
                <span className="text-primary font-bold mr-2">Q{qi + 1}.</span>{q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, idx) => {
                  const isSelected = answers[q.id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: idx }))}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-3",
                        isSelected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/40 hover:bg-muted/30 text-foreground/80",
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/30",
                      )}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span className="font-semibold text-muted-foreground mr-1">{String.fromCharCode(65 + idx)}.</span>{opt}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        <Button
          size="lg"
          className="w-full h-13"
          onClick={handleSubmit}
          disabled={answeredCount < questions.length}
        >
          {answeredCount < questions.length
            ? `Answer all questions (${questions.length - answeredCount} left)`
            : <><CheckCircle2 className="w-4 h-4 mr-2" />Submit Quiz</>}
        </Button>
      </motion.div>
    );
  }

  // Results
  const grade = pct >= 80 ? "Excellent!" : pct >= 60 ? "Good job!" : pct >= 40 ? "Keep practicing" : "Needs more study";
  const gradeColor = pct >= 80 ? "text-green-600" : pct >= 60 ? "text-blue-600" : pct >= 40 ? "text-amber-600" : "text-red-600";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Score banner */}
      <Card className={cn(
        "p-6 text-center",
        pct >= 80 ? "bg-green-50 border-green-200" :
          pct >= 60 ? "bg-blue-50 border-blue-200" :
            pct >= 40 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200",
      )}>
        <Trophy className={cn("w-10 h-10 mx-auto mb-3", gradeColor)} />
        <p className={cn("text-4xl font-black mb-1", gradeColor)}>{pct}%</p>
        <p className={cn("text-lg font-bold mb-1", gradeColor)}>{grade}</p>
        <p className="text-sm text-muted-foreground">{score} correct out of {questions.length} questions</p>
      </Card>

      {/* Question review */}
      <div className="space-y-4">
        {questions.map((q, qi) => {
          const userAnswer = answers[q.id];
          const isCorrect = userAnswer === q.correctAnswer;
          return (
            <Card key={q.id} className={cn("p-5", isCorrect ? "border-green-300/60 bg-green-50/40" : "border-red-300/60 bg-red-50/40")}>
              <div className="flex items-start gap-2 mb-3">
                {isCorrect
                  ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  : <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                <p className="font-semibold text-sm leading-snug">
                  <span className="text-muted-foreground mr-1">Q{qi + 1}.</span>{q.question}
                </p>
              </div>

              <div className="space-y-1.5 ml-7">
                {q.options.map((opt, idx) => {
                  const isCorrectOpt = idx === q.correctAnswer;
                  const isUserPick = idx === userAnswer;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm flex items-center gap-2",
                        isCorrectOpt ? "bg-green-100 text-green-800 font-semibold" :
                          isUserPick && !isCorrectOpt ? "bg-red-100 text-red-700 line-through" : "text-muted-foreground",
                      )}
                    >
                      <span className="font-bold">{String.fromCharCode(65 + idx)}.</span> {opt}
                      {isCorrectOpt && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-green-600" />}
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div className="mt-3 ml-7 p-3 bg-muted/40 rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Explanation</p>
                  <p className="text-sm leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Button variant="outline" onClick={() => setState("settings")} className="w-full">
        <RotateCcw className="w-4 h-4 mr-2" />Take Another Quiz
      </Button>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "summary", label: "Summary", icon: BookOpen, color: "blue" },
  { id: "flashcards", label: "Flashcards", icon: CreditCard, color: "purple" },
  { id: "quiz", label: "Quiz", icon: ClipboardList, color: "amber" },
];

export default function PdfLearning() {
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const { toast } = useToast();

  // Load PDF from ?pdfId= query param (coming from PDF History page)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pdfId = params.get("pdfId");
    const tab = params.get("tab") as Tab | null;

    if (tab && ["summary", "flashcards", "quiz"].includes(tab)) {
      setActiveTab(tab);
    }

    if (pdfId) {
      setUploading(true);
      fetch(`/api/pdf/${pdfId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
        .then(r => r.json())
        .then(data => {
          if (data.pdfId) {
            setPdfInfo(data);
          } else {
            toast({ title: "PDF not found", description: "This PDF no longer exists.", variant: "destructive" });
          }
        })
        .catch(() => toast({ title: "Error", description: "Failed to load PDF.", variant: "destructive" }))
        .finally(() => setUploading(false));
    }
  }, []);

  const handleFile = async (file: File) => {
    setUploading(true);
    setPdfInfo(null);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const data = await apiPost("/api/pdf/upload", formData as any, true);
      setPdfInfo(data);
      toast({ title: "PDF uploaded!", description: `${data.pageCount} page(s) extracted. Choose a learning mode below.` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const reset = () => setPdfInfo(null);

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-6 h-6 text-primary" />
              <h1 className="text-3xl font-display font-bold">PDF Learning</h1>
            </div>
            <p className="text-muted-foreground text-sm ml-8">
              Upload any PDF to instantly get a summary, flashcards, and a quiz.
            </p>
          </div>
          <Link href="/pdf/history">
            <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-3 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0">
              <FolderOpen className="w-3.5 h-3.5" /> My PDFs
            </button>
          </Link>
        </div>

        {/* Upload zone */}
        <UploadZone pdfInfo={pdfInfo} uploading={uploading} onFile={handleFile} onReset={reset} />

        {/* Tabs — only show after upload */}
        <AnimatePresence>
          {pdfInfo && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              {/* Tab bar */}
              <div className="grid grid-cols-3 gap-2 bg-muted/40 p-1.5 rounded-2xl">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                        active
                          ? "bg-white shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab label (mobile) */}
              <div className="sm:hidden text-center">
                <Badge variant="outline" className="font-semibold capitalize">{activeTab}</Badge>
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === "summary" && <SummaryTab pdfInfo={pdfInfo} />}
                  {activeTab === "flashcards" && <FlashcardsTab pdfInfo={pdfInfo} />}
                  {activeTab === "quiz" && <QuizTab pdfInfo={pdfInfo} />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state when no PDF */}
        {!pdfInfo && !uploading && (
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: BookOpen, label: "AI Summary", desc: "Key points & sections", color: "blue" },
              { icon: CreditCard, label: "Flashcards", desc: "Flip-card study mode", color: "purple" },
              { icon: ClipboardList, label: "PDF Quiz", desc: "Test your knowledge", color: "amber" },
            ].map(f => (
              <div key={f.label} className="flex flex-col items-center text-center p-4 rounded-2xl bg-muted/30">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2",
                  f.color === "blue" ? "bg-blue-100" : f.color === "purple" ? "bg-purple-100" : "bg-amber-100",
                )}>
                  <f.icon className={cn("w-5 h-5",
                    f.color === "blue" ? "text-blue-600" : f.color === "purple" ? "text-purple-600" : "text-amber-600",
                  )} />
                </div>
                <p className="font-bold text-sm">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
