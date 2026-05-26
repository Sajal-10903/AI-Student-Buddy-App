import { useGetUserProfile, useGetNextQuizSuggestion } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, Button, Badge } from "@/components/ui";
import { User, Mail, Calendar, BookOpen, Sparkles, BrainCircuit } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Profile() {
  const { data: profile, isLoading } = useGetUserProfile();
  const { data: suggestion } = useGetNextQuizSuggestion();

  if (isLoading || !profile) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in">
        
        {/* Header/User Info */}
        <Card className="p-8 overflow-hidden relative border-0 shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl -mr-10 -mt-10"></div>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary p-1 shrink-0">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-4xl font-display font-bold text-primary">
                {profile.name.charAt(0)}
              </div>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl font-display font-bold mb-2">{profile.name}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-muted-foreground text-sm font-medium">
                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {profile.email}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Joined {format(new Date(profile.createdAt), "MMMM yyyy")}</span>
              </div>
            </div>
            
            <div className="shrink-0 text-center bg-muted/50 p-4 rounded-2xl border border-border">
              <p className="text-sm font-semibold text-muted-foreground">Total Questions Answered</p>
              <p className="text-3xl font-display font-bold text-primary">{profile.stats.totalQuestionsAnswered}</p>
            </div>
          </div>
        </Card>

        {/* AI Suggestion */}
        {suggestion && (
          <Card className="p-6 bg-gradient-to-r from-primary/10 via-background to-secondary/10 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-1">AI Recommendation for You</h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed max-w-3xl">{suggestion.reason}</p>
                <div className="flex items-center gap-3">
                  <Badge variant={suggestion.isWeakArea ? "danger" : "primary"} className="capitalize">
                    {suggestion.isWeakArea ? 'Focus Area' : 'Next Step'}
                  </Badge>
                  <span className="font-semibold">{suggestion.topic}</span>
                  <span className="text-muted-foreground text-sm border-l border-border pl-3 capitalize">{suggestion.difficulty}</span>
                  
                  <Link href={`/quiz/generate?topic=${encodeURIComponent(suggestion.topic)}`} className="ml-auto">
                    <Button size="sm" className="gap-2">Start Quiz <ArrowRight className="w-4 h-4" /></Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Full Topic History */}
        <h3 className="text-2xl font-bold pt-4 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" /> Mastery by Topic
        </h3>
        
        <div className="grid sm:grid-cols-2 gap-4">
          {profile.topicStats.map((stat, i) => (
            <Card key={i} className="p-5 flex items-center justify-between group hover:border-primary/30 transition-colors">
              <div>
                <h4 className="font-bold text-lg capitalize mb-1 flex items-center gap-2">
                  {stat.topic}
                  {stat.isWeakArea && <span className="w-2 h-2 rounded-full bg-destructive" title="Weak Area"></span>}
                </h4>
                <div className="flex gap-4 text-xs font-semibold text-muted-foreground">
                  <span>{stat.totalAttempts} Attempts</span>
                  <span>Best: {stat.bestScore}%</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-2xl font-display font-bold ${stat.averageAccuracy >= 70 ? 'text-success' : stat.averageAccuracy >= 50 ? 'text-amber-500' : 'text-destructive'}`}>
                  {stat.averageAccuracy}%
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Avg Accuracy</div>
              </div>
            </Card>
          ))}
          {profile.topicStats.length === 0 && (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-border rounded-2xl">
              <BrainCircuit className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No topic data available yet.</p>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}

// Inline dummy component for missing ArrowRight import above
import { ArrowRight } from "lucide-react";
