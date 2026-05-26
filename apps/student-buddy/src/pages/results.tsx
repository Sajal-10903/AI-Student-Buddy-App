import { useRoute, Link, useLocation } from "wouter";
import { useGetResultById } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, Button, Badge } from "@/components/ui";
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Target, RotateCcw,
  BrainCircuit, Sparkles, TrendingUp, TrendingDown, Minus,
  ChevronDown, Loader2,
} from "lucide-react";
import { formatTime, getGradeColor, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

// ─── Adaptive Difficulty Card ──────────────────────────────────────────────

type Difficulty = "easy" | "medium" | "hard";
type Action = "increase" | "decrease" | "maintain";

interface Suggestion {
  performanceId: number;
  suggestedDifficulty: Difficulty;
  action: Action;
  message: string;
  reward: number;
  state: { difficulty: Difficulty; score: number };
}

function getAuthToken(): string {
  try {
    const s = localStorage.getItem("auth-storage");
    if (s) return JSON.parse(s)?.state?.token ?? "";
  } catch {}
  return "";
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy:   "bg-green-100 text-green-700 border-green-300",
  medium: "bg-amber-100 text-amber-700 border-amber-300",
  hard:   "bg-red-100  text-red-700   border-red-300",
};

const ACTION_ICONS: Record<Action, React.ReactNode> = {
  increase: <TrendingUp  className="w-5 h-5 text-green-500" />,
  decrease: <TrendingDown className="w-5 h-5 text-red-500" />,
  maintain: <Minus       className="w-5 h-5 text-blue-500" />,
};

function AdaptiveCard({ resultId, accuracy }: { resultId: number; accuracy: number }) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [decided, setDecided] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [override, setOverride] = useState<Difficulty | "">("");
  const [showOverride, setShowOverride] = useState(false);
  const [finalMessage, setFinalMessage] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/adaptive/suggest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({ resultId }),
        });
        if (res.ok) setSuggestion(await res.json());
      } catch {}
      finally { setLoading(false); }
    })();
  }, [resultId]);

  const decide = async (accepted: boolean, chosen?: Difficulty) => {
    if (!suggestion) return;
    setDeciding(true);
    try {
      const res = await fetch("/api/adaptive/decide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          performanceId: suggestion.performanceId,
          accepted,
          chosenDifficulty: chosen,
        }),
      });
      const data = await res.json();
      setFinalMessage(data.message);
      setDecided(true);
    } catch {}
    finally { setDeciding(false); }
  };

  if (loading) {
    return (
      <Card className="p-5 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Computing your adaptive difficulty…</span>
      </Card>
    );
  }

  if (!suggestion) return null;

  const { action, suggestedDifficulty, message, reward, state } = suggestion;

  // Reward colour
  const rewardColor = reward >= 0.75 ? "text-green-600" : reward >= 0.5 ? "text-amber-600" : "text-red-600";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="overflow-hidden border-primary/20">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-primary/10 px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-foreground">Adaptive Learning System</p>
            <p className="text-xs text-muted-foreground">Rule-based RL · Human-in-the-Loop</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* State → Action → Next State */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">Current State</p>
              <div className="flex flex-col items-center gap-1">
                <span className={cn("px-3 py-1 rounded-lg text-xs font-bold border capitalize", DIFFICULTY_COLORS[state.difficulty])}>
                  {state.difficulty}
                </span>
                <span className="text-xs text-muted-foreground">{accuracy}% score</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center gap-1 min-w-[80px]">
              <div className="flex items-center gap-1.5">
                {ACTION_ICONS[action]}
                <span className="text-xs font-semibold capitalize text-muted-foreground">{action}</span>
              </div>
              <div className="w-full h-px bg-border relative">
                <div className="absolute inset-y-0 right-0 w-0 h-0 border-l-[6px] border-l-border border-y-[4px] border-y-transparent translate-y-[-3px]" />
              </div>
              <span className={cn("text-xs font-bold", rewardColor)}>Reward: {reward.toFixed(2)}</span>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">Suggested Next</p>
              <span className={cn("px-3 py-1 rounded-lg text-xs font-bold border capitalize", DIFFICULTY_COLORS[suggestedDifficulty])}>
                {suggestedDifficulty}
              </span>
            </div>
          </div>

          {/* Message */}
          <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 rounded-xl p-4 border">
            {message}
          </p>

          {/* Human-in-the-Loop Controls */}
          <AnimatePresence mode="wait">
            {decided ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200"
              >
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">{finalMessage}</p>
                  <button
                    onClick={() => setLocation(`/quiz/generate?difficulty=${encodeURIComponent(
                      override || suggestedDifficulty
                    )}`)}
                    className="text-xs text-green-600 underline mt-0.5"
                  >
                    Start next quiz →
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="controls" className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Your Decision (Human-in-the-Loop)
                </p>
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => decide(true)}
                    disabled={deciding}
                  >
                    {deciding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Accept Suggestion
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowOverride(s => !s)}
                    disabled={deciding}
                    className="flex items-center gap-1.5"
                  >
                    Override <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showOverride && "rotate-180")} />
                  </Button>
                </div>

                <AnimatePresence>
                  {showOverride && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
                          <button
                            key={d}
                            onClick={() => setOverride(d)}
                            className={cn(
                              "py-2.5 rounded-xl text-sm font-semibold border-2 transition-all capitalize",
                              override === d
                                ? DIFFICULTY_COLORS[d]
                                : "border-border hover:border-muted-foreground/40 text-muted-foreground",
                            )}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                      <Button
                        className="w-full mt-3"
                        variant="outline"
                        disabled={!override || deciding}
                        onClick={() => decide(false, override as Difficulty)}
                      >
                        {deciding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Confirm Override → {override || "select a level"}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Main Results Page ─────────────────────────────────────────────────────

export default function Results() {
  const [, params] = useRoute("/results/:id");
  const resultId = parseInt(params?.id || "0");

  const { data: result, isLoading, isError } = useGetResultById(resultId, {
    query: { enabled: !!resultId }
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError || !result) {
    return (
      <AppLayout>
        <div className="p-8 text-center mt-20">
          <h2 className="text-2xl font-bold text-destructive mb-2">Result not found</h2>
          <Link href="/dashboard"><Button>Back to Dashboard</Button></Link>
        </div>
      </AppLayout>
    );
  }

  const gradeClass = getGradeColor(result.accuracy);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8 animate-in fade-in duration-500 pb-20">

        {/* Nav */}
        <Link href="/dashboard" className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>

        {/* Score Card Hero */}
        <Card className="overflow-hidden border-0 shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary to-secondary opacity-10" />
          <div className="p-8 sm:p-12 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div className="flex-1">
              <Badge variant="outline" className="mb-4 bg-white/50 backdrop-blur capitalize">{result.topic}</Badge>
              <h1 className="text-4xl sm:text-5xl font-display font-extrabold mb-4 text-foreground">Quiz Complete!</h1>
              <p className="text-lg text-muted-foreground max-w-md">
                {result.accuracy >= 80
                  ? "Outstanding performance! You've really mastered this topic."
                  : result.accuracy >= 50
                  ? "Good effort. Review the explanations below to improve."
                  : "Keep practicing. Identifying weak spots is the first step to mastery."}
              </p>
            </div>

            <div className="shrink-0 flex items-center justify-center">
              <div className={cn("relative flex items-center justify-center w-48 h-48 rounded-full border-8 bg-white shadow-xl", gradeClass.split(" ")[2])}>
                <div className="text-center">
                  <div className={cn("text-5xl font-display font-bold mb-1", gradeClass.split(" ")[0])}>
                    {result.score}<span className="text-2xl text-muted-foreground">/{result.totalQuestions}</span>
                  </div>
                  <div className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Correct</div>
                </div>
                <div className="absolute -left-6 top-10 bg-white px-3 py-1.5 rounded-lg shadow-lg border border-border flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">{result.accuracy}%</span>
                </div>
                <div className="absolute -right-6 bottom-10 bg-white px-3 py-1.5 rounded-lg shadow-lg border border-border flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">{formatTime(result.timeTakenSeconds || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 p-4 border-t border-border flex justify-center gap-4">
            <Link href={`/quiz/generate?topic=${encodeURIComponent(result.topic)}`}>
              <Button variant="outline" className="gap-2 bg-white">
                <RotateCcw className="w-4 h-4" /> Try Again
              </Button>
            </Link>
            <Link href="/quiz/generate">
              <Button className="gap-2">
                <BrainCircuit className="w-4 h-4" /> New Topic
              </Button>
            </Link>
          </div>
        </Card>

        {/* ── Adaptive Learning Card ── */}
        <AdaptiveCard resultId={result.resultId} accuracy={result.accuracy} />

        {/* Question Review */}
        <div className="space-y-6">
          <h3 className="text-2xl font-bold px-2">Question Review</h3>

          {result.feedback.map((item, index) => (
            <motion.div
              key={item.questionId}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
            >
              <Card className={cn("p-6 sm:p-8 border-l-4 overflow-hidden", item.isCorrect ? "border-l-success" : "border-l-destructive")}>
                <div className="flex items-start gap-4 mb-6">
                  <div className="shrink-0 mt-1">
                    {item.isCorrect ? (
                      <div className="bg-success/10 p-2 rounded-full text-success"><CheckCircle2 className="w-6 h-6" /></div>
                    ) : (
                      <div className="bg-destructive/10 p-2 rounded-full text-destructive"><XCircle className="w-6 h-6" /></div>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-muted-foreground mb-1 block">Question {index + 1}</span>
                    <h4 className="text-xl font-semibold text-foreground leading-snug">{item.question}</h4>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 pl-0 sm:pl-16 mb-6">
                  {item.options.map((opt, oIdx) => {
                    const isSelected = item.selectedAnswer === oIdx;
                    const isCorrect  = item.correctAnswer  === oIdx;
                    let bgClass = "bg-muted/30 border-transparent text-foreground/80";
                    let icon: React.ReactNode = null;
                    if (isCorrect) {
                      bgClass = "bg-success/10 border-success/30 text-success-foreground font-semibold";
                      icon = <CheckCircle2 className="w-5 h-5 text-success ml-auto" />;
                    } else if (isSelected && !item.isCorrect) {
                      bgClass = "bg-destructive/10 border-destructive/30 text-destructive-foreground";
                      icon = <XCircle className="w-5 h-5 text-destructive ml-auto" />;
                    }
                    return (
                      <div key={oIdx} className={cn("p-4 rounded-xl border flex items-center", bgClass)}>
                        <span className="w-6 h-6 rounded-full bg-background border flex items-center justify-center text-xs font-bold mr-3 shrink-0">
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className={cn("text-sm", isCorrect && "text-success font-bold", isSelected && !isCorrect && "text-destructive line-through")}>
                          {opt}
                        </span>
                        {icon}
                      </div>
                    );
                  })}
                </div>

                <div className="pl-0 sm:pl-16">
                  <div className="bg-primary/5 rounded-xl p-5 border border-primary/10">
                    <h5 className="font-bold flex items-center gap-2 text-primary mb-2">
                      <BrainCircuit className="w-4 h-4" /> AI Explanation
                    </h5>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.explanation}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

      </div>
    </AppLayout>
  );
}
