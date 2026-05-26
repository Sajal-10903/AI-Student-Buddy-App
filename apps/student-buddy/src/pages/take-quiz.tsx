import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSubmitQuiz } from "@workspace/api-client-react";
import { useQuizStore } from "@/lib/store";
import { Button, Card, Progress } from "@/components/ui";
import { Clock, AlertTriangle, ArrowRight, BrainCircuit, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatTime, cn } from "@/lib/utils";

const TIME_PER_QUESTION = 120; // 2 minutes

export default function TakeQuiz() {
  const { activeQuiz, setActiveQuiz } = useQuizStore();
  const [, setLocation] = useLocation();
  const submitMutation = useSubmitQuiz();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [totalTimeTaken, setTotalTimeTaken] = useState(0);

  // Kick out if no active quiz
  useEffect(() => {
    if (!activeQuiz) {
      setLocation("/dashboard");
    }
  }, [activeQuiz, setLocation]);

  // Timer logic
  useEffect(() => {
    if (!activeQuiz) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleNextOrSubmit(); // Auto advance on timeout
          return TIME_PER_QUESTION;
        }
        return prev - 1;
      });
      setTotalTimeTaken((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, activeQuiz]); // Reset timer on index change

  if (!activeQuiz) return null;

  const currentQ = activeQuiz.questions[currentIndex];
  const isLast = currentIndex === activeQuiz.questions.length - 1;
  const hasAnswered = answers[currentQ.id] !== undefined;

  const handleSelectOption = (idx: number) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: idx }));
  };

  const handleNextOrSubmit = async () => {
    // If not answered, default to -1 (unanswered)
    if (!hasAnswered) {
      setAnswers(prev => ({ ...prev, [currentQ.id]: -1 }));
    }

    if (isLast) {
      // Submit all
      const finalAnswers = { ...answers };
      if (!hasAnswered) finalAnswers[currentQ.id] = -1;

      const submissionPayload = {
        quizId: activeQuiz.quizId,
        totalTimeTakenSeconds: totalTimeTaken,
        answers: activeQuiz.questions.map(q => ({
          questionId: q.id,
          selectedAnswer: finalAnswers[q.id] !== undefined ? finalAnswers[q.id] : -1,
          timeTakenSeconds: 0 // Simplification: we track total time instead
        }))
      };

      try {
        const result = await submitMutation.mutateAsync({ data: submissionPayload });
        setActiveQuiz(null); // Clear active session
        setLocation(`/results/${result.resultId}`);
      } catch (e) {
        console.error("Failed to submit", e);
        alert("Failed to submit quiz. Please try again.");
      }
    } else {
      // Next question
      setCurrentIndex(prev => prev + 1);
      setTimeLeft(TIME_PER_QUESTION);
    }
  };

  const progress = ((currentIndex) / activeQuiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 sm:px-8 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-6 h-6 text-primary" />
          <span className="font-display font-bold hidden sm:inline-block capitalize">{activeQuiz.topic} Quiz</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-sm font-semibold text-muted-foreground">
            Question {currentIndex + 1} of {activeQuiz.questions.length}
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-sm border",
            timeLeft < 30 ? "bg-destructive/10 text-destructive border-destructive/30 animate-pulse" : "bg-muted text-foreground border-border"
          )}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <Progress value={progress} className="h-1 rounded-none bg-border" />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden">
        <div className="w-full max-w-3xl flex-1 flex flex-col relative">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-1 flex flex-col"
            >
              <Card className="flex-1 p-6 sm:p-10 flex flex-col bg-white shadow-xl shadow-black/5 border-border/50">
                <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-8">
                  {currentQ.question}
                </h2>
                
                <div className="space-y-3 mt-auto">
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = answers[currentQ.id] === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        className={cn(
                          "w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 flex items-center group",
                          isSelected 
                            ? "border-primary bg-primary/5 shadow-sm" 
                            : "border-border hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30 group-hover:border-primary/40"
                        )}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <span className={cn(
                          "text-base sm:text-lg font-medium",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Footer Actions */}
          <div className="pt-6 pb-2 flex justify-between items-center mt-auto shrink-0">
            <Button 
              variant="ghost" 
              className="text-muted-foreground hover:text-destructive"
              onClick={() => {
                if(confirm("Are you sure you want to quit? Progress will not be saved.")) {
                  setActiveQuiz(null);
                  setLocation("/dashboard");
                }
              }}
            >
              Quit Quiz
            </Button>

            <Button 
              size="lg" 
              className="px-8"
              onClick={handleNextOrSubmit}
              disabled={submitMutation.isPending || !hasAnswered}
              isLoading={submitMutation.isPending}
            >
              {isLast ? "Submit Quiz" : "Next Question"} 
              {!isLast && <ArrowRight className="w-5 h-5 ml-2" />}
              {isLast && !submitMutation.isPending && <CheckCircle2 className="w-5 h-5 ml-2" />}
            </Button>
          </div>

        </div>
      </main>
    </div>
  );
}
