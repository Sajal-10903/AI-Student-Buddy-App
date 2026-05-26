import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGenerateQuiz } from "@workspace/api-client-react";
import { useQuizStore } from "@/lib/store";
import { AppLayout } from "@/components/layout";
import { Card, Button, Input, Label, Badge } from "@/components/ui";
import { Sparkles, BookOpen, SlidersHorizontal, Lightbulb, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function useQuery() {
  return new URLSearchParams(window.location.search);
}

function getAuthToken(): string {
  try {
    const s = localStorage.getItem("auth-storage");
    if (s) return JSON.parse(s)?.state?.token ?? "";
  } catch {}
  return "";
}

export default function GenerateQuiz() {
  const query = useQuery();
  const initialTopic = query.get("topic") || "";
  const urlDifficulty = query.get("difficulty") as 'easy'|'medium'|'hard'|null;

  const [topic, setTopic] = useState(initialTopic);
  const [difficulty, setDifficulty] = useState<'easy'|'medium'|'hard'>(urlDifficulty || 'medium');
  const [count, setCount] = useState(5);
  const [adaptiveRec, setAdaptiveRec] = useState<{ difficulty: string; reason: string } | null>(null);

  // Fetch adaptive recommendation on mount (if no URL override)
  useEffect(() => {
    if (urlDifficulty) return;
    fetch("/api/adaptive/next-difficulty", {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.difficulty && ["easy", "medium", "hard"].includes(d.difficulty)) {
          setDifficulty(d.difficulty as 'easy'|'medium'|'hard');
          setAdaptiveRec(d);
        }
      })
      .catch(() => {});
  }, []);

  const [, setLocation] = useLocation();
  const { setActiveQuiz } = useQuizStore();
  const { toast } = useToast();
  
  const generateMutation = useGenerateQuiz();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim().length < 2) {
      toast({ title: "Topic too short", description: "Please enter a valid topic to learn about.", variant: "destructive" });
      return;
    }

    try {
      const quiz = await generateMutation.mutateAsync({
        data: {
          topic,
          difficulty,
          questionCount: count
        }
      });
      
      setActiveQuiz(quiz);
      setLocation("/quiz/take");
    } catch (error: any) {
      toast({ 
        title: "Generation Failed", 
        description: error?.message || "Our AI couldn't generate the quiz right now. Try a different topic.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <AppLayout>
      <div className="h-full flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-4 ring-8 ring-primary/5">
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-display font-bold">Generate AI Quiz</h1>
            <p className="text-muted-foreground mt-2">Specify what you want to learn, and our AI will build a custom test for you instantly.</p>
          </div>

          <Card className="p-6 sm:p-8 bg-white/80 backdrop-blur-xl border-white shadow-2xl">
            <form onSubmit={handleGenerate} className="space-y-8">
              
              {/* Topic */}
              <div className="space-y-3">
                <Label className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Topic to Study
                </Label>
                <Input 
                  placeholder="e.g. Cellular Respiration, World War II, Python Promises..." 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="h-14 text-lg bg-white"
                  autoFocus
                />
                <div className="flex gap-2 flex-wrap mt-2">
                  <span className="text-xs text-muted-foreground mt-1">Suggestions:</span>
                  {["Machine Learning", "Microeconomics", "Ancient Rome"].map(s => (
                    <button 
                      key={s} 
                      type="button"
                      onClick={() => setTopic(s)}
                      className="text-xs bg-muted hover:bg-primary/10 hover:text-primary px-2 py-1 rounded-md transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="text-base flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" /> Difficulty Level
                  </Label>
                  {adaptiveRec && (
                    <span className="flex items-center gap-1.5 bg-primary/8 border border-primary/20 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                      <Zap className="w-3 h-3" /> AI Recommended: {adaptiveRec.difficulty}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['easy', 'medium', 'hard'] as const).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={cn(
                        "py-3 px-4 rounded-xl border-2 font-bold capitalize transition-all duration-200",
                        difficulty === level 
                          ? "border-primary bg-primary/10 text-primary shadow-sm" 
                          : "border-border bg-background text-muted-foreground hover:border-border/80 hover:bg-muted/50"
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Count */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary" /> Number of Questions
                  </Label>
                  <Badge variant="primary" className="text-sm px-3 py-1 bg-primary text-primary-foreground">{count}</Badge>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="10" 
                  step="1"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground px-1 font-medium">
                  <span>5 (Quick)</span>
                  <span>10 (Thorough)</span>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full text-lg h-14 relative overflow-hidden group"
                  isLoading={generateMutation.isPending}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {generateMutation.isPending ? "AI is generating..." : "Generate Magic Quiz"} 
                    {!generateMutation.isPending && <Sparkles className="w-5 h-5" />}
                  </span>
                  {/* Shiny sweep effect */}
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
                </Button>
                {generateMutation.isPending && (
                  <p className="text-center text-sm text-muted-foreground mt-4 animate-pulse">
                    Crafting perfect questions based on your request...
                  </p>
                )}
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
