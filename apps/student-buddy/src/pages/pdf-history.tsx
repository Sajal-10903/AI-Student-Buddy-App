import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout";
import { Card, Button, Badge } from "@/components/ui";
import {
  FolderOpen, FileText, BookOpen, CreditCard, ClipboardList,
  Loader2, Upload, Calendar, ChevronRight, Sparkles,
  Download, Eye, FileJson, Trophy, LayoutList,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

interface PdfEntry {
  id: number;
  filename: string;
  pageCount: number;
  createdAt: string;
}

interface OutputFile {
  filename: string;
  type: string;
  userId: number;
  topic?: string;
  createdAt: string;
  downloadPath: string;
  sizeBytes: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getAuthToken(): string {
  try {
    const s = localStorage.getItem("auth-storage");
    if (s) return JSON.parse(s)?.state?.token ?? "";
  } catch {}
  return "";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_STYLES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  summary:    { label: "Summary",      color: "bg-blue-100 text-blue-700",    icon: BookOpen      },
  flashcards: { label: "Flashcards",   color: "bg-purple-100 text-purple-700", icon: CreditCard   },
  quiz:       { label: "Quiz",         color: "bg-amber-100 text-amber-700",   icon: ClipboardList },
  "pdf-quiz": { label: "PDF Quiz",     color: "bg-orange-100 text-orange-700", icon: ClipboardList },
  result:     { label: "Quiz Result",  color: "bg-green-100 text-green-700",   icon: Trophy        },
};

const PDF_MODES = [
  { id: "summary",    label: "Summary",    icon: BookOpen,      color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  { id: "flashcards", label: "Flashcards", icon: CreditCard,    color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
  { id: "quiz",       label: "Quiz",       icon: ClipboardList, color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
];

// ─── Output file viewer modal ───────────────────────────────────────────────

function OutputFileModal({ file, onClose }: { file: OutputFile; onClose: () => void }) {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(file.downloadPath, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    })
      .then(r => r.json())
      .then(d => setContent(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [file.downloadPath]);

  const typeStyle = TYPE_STYLES[file.type] ?? { label: file.type, color: "bg-muted text-muted-foreground", icon: FileJson };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border"
      >
        <div className="flex items-center gap-3 p-5 border-b shrink-0">
          <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", typeStyle.color)}>{typeStyle.label}</span>
          <p className="font-semibold text-foreground flex-1 truncate text-sm">{file.filename}</p>
          <a
            href={file.downloadPath}
            download={file.filename}
            className="flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </a>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none ml-1">×</button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /><span>Loading file…</span>
            </div>
          ) : content ? (
            <pre className="text-xs font-mono bg-muted/50 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(content, null, 2)}
            </pre>
          ) : (
            <p className="text-center text-muted-foreground py-12">Failed to load file.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Tab: PDF Library ───────────────────────────────────────────────────────

function PdfLibraryTab() {
  const [, setLocation] = useLocation();
  const [pdfs, setPdfs] = useState<PdfEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pdf/", { headers: { Authorization: `Bearer ${getAuthToken()}` } })
      .then(r => r.json())
      .then(d => setPdfs(d.pdfs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openPdf = (pdfId: number, tab?: string) => {
    const params = new URLSearchParams({ pdfId: String(pdfId) });
    if (tab) params.set("tab", tab);
    setLocation(`/pdf/learning?${params.toString()}`);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" /><span>Loading your PDFs…</span>
    </div>
  );

  if (pdfs.length === 0) return (
    <Card className="flex flex-col items-center justify-center py-24 text-center gap-4 border-dashed">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
        <FileText className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <div>
        <p className="font-bold text-lg text-foreground">No PDFs uploaded yet</p>
        <p className="text-muted-foreground text-sm mt-1">Upload a PDF to generate summaries, flashcards, and quizzes.</p>
      </div>
      <Button onClick={() => setLocation("/pdf/learning")} className="gap-2 mt-2">
        <Upload className="w-4 h-4" /> Upload Your First PDF
      </Button>
    </Card>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground font-medium">{pdfs.length} document{pdfs.length !== 1 ? "s" : ""} in your library</p>
      {pdfs.map((pdf, i) => (
        <motion.div key={pdf.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate text-lg leading-snug">{pdf.filename}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">{pdf.pageCount} page{pdf.pageCount !== 1 ? "s" : ""}</Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />{format(new Date(pdf.createdAt), "MMM d, yyyy · h:mm a")}
                    </span>
                  </div>
                </div>
                <button onClick={() => openPdf(pdf.id)} className="shrink-0 p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Open PDF">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Re-run AI features
                </p>
                <div className="flex gap-2 flex-wrap">
                  {PDF_MODES.map(mode => {
                    const Icon = mode.icon;
                    return (
                      <button key={mode.id} onClick={() => openPdf(pdf.id, mode.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mode.color}`}>
                        <Icon className="w-3.5 h-3.5" />{mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Tab: Generated Files ───────────────────────────────────────────────────

function GeneratedFilesTab() {
  const [files, setFiles] = useState<OutputFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<OutputFile | null>(null);

  useEffect(() => {
    fetch("/api/output-history", { headers: { Authorization: `Bearer ${getAuthToken()}` } })
      .then(r => r.json())
      .then(d => setFiles(d.files ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" /><span>Loading generated files…</span>
    </div>
  );

  if (files.length === 0) return (
    <Card className="flex flex-col items-center justify-center py-24 text-center gap-4 border-dashed">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
        <FileJson className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <div>
        <p className="font-bold text-lg text-foreground">No generated files yet</p>
        <p className="text-muted-foreground text-sm mt-1">Generate a quiz, summary, or flashcards to save files here.</p>
      </div>
    </Card>
  );

  return (
    <>
      {viewing && <OutputFileModal file={viewing} onClose={() => setViewing(null)} />}

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground font-medium">{files.length} file{files.length !== 1 ? "s" : ""} saved</p>

        {/* Table header */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">File</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Topic</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Size</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {files.map((file, i) => {
                  const typeStyle = TYPE_STYLES[file.type] ?? { label: file.type, color: "bg-muted text-muted-foreground", icon: FileJson };
                  const Icon = typeStyle.icon;
                  return (
                    <motion.tr
                      key={file.filename}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="group hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-mono text-xs text-foreground truncate max-w-[160px]" title={file.filename}>
                            {file.filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", typeStyle.color)}>
                          {typeStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate" title={file.topic}>
                        {file.topic ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(file.createdAt), "MMM d, h:mm a")}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatBytes(file.sizeBytes)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setViewing(file)}
                            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <a
                            href={file.downloadPath}
                            download={file.filename}
                            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </a>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

type ActiveTab = "library" | "generated";

export default function PdfHistory() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<ActiveTab>("library");

  return (
    <AppLayout>
      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-3xl font-display font-bold">PDF History</h1>
            </div>
            <p className="text-muted-foreground text-sm ml-[52px]">
              Browse your uploaded PDFs and every AI-generated file, with View and Download options.
            </p>
          </div>
          <Button onClick={() => setLocation("/pdf/learning")} className="gap-2 shrink-0">
            <Upload className="w-4 h-4" /> Upload New PDF
          </Button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-muted/40 rounded-xl w-fit">
          {([
            { id: "library",   label: "PDF Library",      icon: FileText    },
            { id: "generated", label: "Generated Files",   icon: LayoutList  },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === tab.id
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "library"   && <PdfLibraryTab />}
        {activeTab === "generated" && <GeneratedFilesTab />}

      </div>
    </AppLayout>
  );
}
