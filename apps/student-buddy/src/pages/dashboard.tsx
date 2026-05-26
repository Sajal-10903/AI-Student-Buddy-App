import { useGetUserProfile } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, Button, Badge } from "@/components/ui";
import { Link } from "wouter";
import {
  BrainCircuit, Sparkles, Target, Trophy, Clock, ArrowRight,
  Loader2, AlertCircle, TrendingUp, TrendingDown, Minus, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend, ReferenceLine,
} from "recharts";
import { formatTime, getGradeColor, cn } from "@/lib/utils";
import { format } from "date-fns";
import { useEffect, useState } from "react";

// ─── Adaptive History ──────────────────────────────────────────────────────

interface PerfEntry {
  id: number;
  score: number;
  difficulty: string;
  nextDifficulty: string;
  reward: number;
  action: string;
  finalDifficulty: string;
  topic: string;
  completedAt: string;
}

function getAuthToken(): string {
  try {
    const s = localStorage.getItem("auth-storage");
    if (s) return JSON.parse(s)?.state?.token ?? "";
  } catch {}
  return "";
}

const DIFF_COLOR: Record<string, string> = {
  easy:   "#22c55e",
  medium: "#f59e0b",
  hard:   "#ef4444",
};

const ACTION_ICON: Record<string, React.ReactNode> = {
  increase: <TrendingUp  className="w-4 h-4 text-green-500" />,
  decrease: <TrendingDown className="w-4 h-4 text-red-500" />,
  maintain: <Minus       className="w-4 h-4 text-blue-500" />,
};

function LearningProgressSection() {
  const [history, setHistory] = useState<PerfEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/adaptive/history", {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    })
      .then(r => r.json())
      .then(d => setHistory((d.history ?? []).slice().reverse()))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="p-6 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading learning progress…</span>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center min-h-[180px] gap-2 text-center">
        <Zap className="w-10 h-10 text-muted-foreground/30" />
        <p className="font-semibold text-muted-foreground">No adaptive data yet</p>
        <p className="text-sm text-muted-foreground/70">Complete a quiz to see your learning progression here.</p>
      </Card>
    );
  }

  // Chart data
  const chartData = history.map((e, i) => ({
    idx: i + 1,
    score: Math.round(e.score),
    reward: Math.round(e.reward * 100),
    difficulty: e.difficulty,
    topic: e.topic.length > 14 ? e.topic.slice(0, 14) + "…" : e.topic,
  }));

  // Aggregates
  const avgReward = (history.reduce((s, e) => s + e.reward, 0) / history.length).toFixed(2);
  const overrides = history.filter(e => e.action !== "maintain" && !e.accepted && e.accepted !== null).length;
  const promotions = history.filter(e => e.action === "increase").length;

  return (
    <div className="space-y-4">
      {/* KPI mini-row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{history.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Sessions tracked</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{promotions}</p>
          <p className="text-xs text-muted-foreground mt-1">Level-ups</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{avgReward}</p>
          <p className="text-xs text-muted-foreground mt-1">Avg reward</p>
        </Card>
      </div>

      {/* Line chart */}
      <Card className="p-6">
        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />Score Progression
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="topic" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
              formatter={(v: any, name: string) => [
                name === "score" ? `${v}%` : `${v}%`,
                name === "score" ? "Score" : "Reward ×100",
              ]}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: "75% (promote)", fill: "#22c55e", fontSize: 9, position: "insideTopLeft" }} />
            <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: "50% (demote)", fill: "#ef4444", fontSize: 9, position: "insideBottomLeft" }} />
            <Line name="score" type="monotone" dataKey="score" stroke="hsl(249 89% 60%)" strokeWidth={2.5} dot={(props: any) => {
              const { cx, cy, payload } = props;
              return <circle key={payload.idx} cx={cx} cy={cy} r={5} fill={DIFF_COLOR[payload.difficulty] ?? "#6366f1"} stroke="#fff" strokeWidth={2} />;
            }} activeDot={{ r: 7 }} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
          {(["easy", "medium", "hard"] as const).map(d => (
            <span key={d} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: DIFF_COLOR[d] }} />
              {d} difficulty
            </span>
          ))}
        </div>
      </Card>

      {/* History table */}
      <Card className="p-5">
        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />Adaptive History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                <th className="pb-2 text-left font-semibold">Topic</th>
                <th className="pb-2 text-left font-semibold">Score</th>
                <th className="pb-2 text-left font-semibold">Difficulty</th>
                <th className="pb-2 text-left font-semibold">Action</th>
                <th className="pb-2 text-left font-semibold">Next</th>
                <th className="pb-2 text-left font-semibold">Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.slice().reverse().slice(0, 8).map(e => (
                <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 font-medium capitalize text-xs">{e.topic.length > 18 ? e.topic.slice(0, 18) + "…" : e.topic}</td>
                  <td className="py-2.5">
                    <span className={cn("font-bold text-xs", e.score >= 75 ? "text-green-600" : e.score >= 50 ? "text-amber-600" : "text-red-600")}>
                      {Math.round(e.score)}%
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize" style={{ background: DIFF_COLOR[e.difficulty] + "20", color: DIFF_COLOR[e.difficulty] }}>
                      {e.difficulty}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="flex items-center gap-1 capitalize text-xs">
                      {ACTION_ICON[e.action]}{e.action}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize" style={{ background: DIFF_COLOR[e.finalDifficulty] + "20", color: DIFF_COLOR[e.finalDifficulty] }}>
                      {e.finalDifficulty}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-xs font-semibold text-primary">{e.reward.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: profile, isLoading, isError } = useGetUserProfile();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError || !profile) {
    return (
      <AppLayout>
        <div className="p-8 max-w-4xl mx-auto text-center mt-20">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Failed to load dashboard</h2>
          <p className="text-muted-foreground">Please try refreshing the page or logging in again.</p>
        </div>
      </AppLayout>
    );
  }

  const { stats, topicStats, recentResults } = profile;

  return (
    <AppLayout>
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Welcome back, {profile.name.split(" ")[0]}! 👋</h1>
            <p className="text-muted-foreground mt-1 text-lg">Ready to conquer your weak areas today?</p>
          </div>
          <Link href="/quiz/generate">
            <Button size="lg" className="shrink-0 w-full sm:w-auto gap-2 text-base">
              <Sparkles className="w-5 h-5" />Generate Quiz
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Total Quizzes</p>
                <p className="text-3xl font-display font-bold">{stats.totalQuizzes}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Avg. Accuracy</p>
                <p className="text-3xl font-display font-bold">{stats.averageAccuracy}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Strong Topics</p>
                <p className="text-3xl font-display font-bold">{stats.strongAreas.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Weak Areas</p>
                <p className="text-3xl font-display font-bold">{stats.weakAreas.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Topic Performance Chart */}
          <Card className="lg:col-span-2 p-6 flex flex-col">
            <h3 className="text-lg font-bold mb-6">Topic Performance</h3>
            {topicStats.length > 0 ? (
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="topic" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dx={-10} domain={[0, 100]} />
                    <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }} />
                    <Bar dataKey="averageAccuracy" radius={[6, 6, 0, 0]} maxBarSize={50}>
                      {topicStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.averageAccuracy > 70 ? "hsl(142 71% 45%)" : entry.averageAccuracy < 50 ? "hsl(0 84% 60%)" : "hsl(249 89% 60%)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <BrainCircuit className="w-12 h-12 mb-3 opacity-20" />
                <p>No topic data yet. Take a quiz!</p>
              </div>
            )}
          </Card>

          {/* Focus Areas */}
          <Card className="p-6 bg-gradient-to-b from-card to-red-50/30 border-red-100">
            <div className="flex items-center gap-2 mb-6 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-lg font-bold">Focus Areas</h3>
            </div>
            {stats.weakAreas.length > 0 ? (
              <div className="space-y-4">
                {stats.weakAreas.map((topic, i) => {
                  const stat = topicStats.find(t => t.topic === topic);
                  return (
                    <div key={i} className="p-4 rounded-xl bg-white border border-destructive/20 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground capitalize">{topic}</p>
                        <p className="text-xs text-muted-foreground">Avg: <span className="font-bold text-destructive">{stat?.averageAccuracy}%</span></p>
                      </div>
                      <Link href={`/quiz/generate?topic=${encodeURIComponent(topic)}`}>
                        <Button size="sm" variant="outline" className="text-xs border-primary/20 text-primary hover:bg-primary/5">
                          Practice
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-center">
                <p className="text-muted-foreground text-sm">Great job! You don't have any major weak areas right now.</p>
              </div>
            )}
          </Card>
        </div>

        {/* ── Adaptive Learning Progress ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Adaptive Learning Progress</h2>
            <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30">RL-Inspired</Badge>
          </div>
          <LearningProgressSection />
        </div>

        {/* Recent History Table */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Recent Quizzes</h3>
            <Link href="/profile" className="text-sm font-semibold text-primary hover:underline flex items-center">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-xs tracking-wider">
                  <th className="pb-3 font-semibold">Topic</th>
                  <th className="pb-3 font-semibold">Difficulty</th>
                  <th className="pb-3 font-semibold">Score</th>
                  <th className="pb-3 font-semibold">Time</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentResults.length > 0 ? recentResults.slice(0, 5).map((result) => (
                  <tr key={result.resultId} className="group hover:bg-muted/30 transition-colors">
                    <td className="py-4 font-semibold capitalize">{result.topic}</td>
                    <td className="py-4">
                      <Badge variant={result.difficulty === "hard" ? "danger" : result.difficulty === "medium" ? "warning" : "success"}>
                        {result.difficulty}
                      </Badge>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold", getGradeColor(result.accuracy).split(" ")[0])}>
                          {result.score}/{result.totalQuestions}
                        </span>
                        <span className="text-xs text-muted-foreground">({result.accuracy}%)</span>
                      </div>
                    </td>
                    <td className="py-4 text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />{formatTime(result.timeTakenSeconds || 0)}
                    </td>
                    <td className="py-4 text-muted-foreground">
                      {format(new Date(result.completedAt), "MMM d, yyyy")}
                    </td>
                    <td className="py-4 text-right">
                      <Link href={`/results/${result.resultId}`}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">Review</Button>
                      </Link>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No quizzes taken yet. Let's get started!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </AppLayout>
  );
}
