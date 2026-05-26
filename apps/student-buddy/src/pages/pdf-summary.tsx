import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout";
import { Card, Button } from "@/components/ui";
import { FileText, Upload, Sparkles, ChevronDown, ChevronRight, BookOpen, Loader2, AlertCircle, CheckCircle2, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/store";

interface SummarySection {
  heading: string;
  content: string;
}

interface Summary {
  title: string;
  overview: string;
  keyPoints: string[];
  sections: SummarySection[];
  conclusion: string;
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

export default function PdfSummary() {
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [uploading, setUploading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]));
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }
    setUploading(true);
    setSummary(null);
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
      toast({ title: "PDF uploaded!", description: `${data.pageCount} page(s) extracted successfully.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSummarize = async () => {
    if (!pdfInfo) return;
    setSummarizing(true);
    try {
      const res = await fetch(`/api/pdf/${pdfInfo.pdfId}/summarize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Summarize failed");
      setSummary(data.summary);
      setOpenSections(new Set([0]));
    } catch (err: any) {
      toast({ title: "Summary failed", description: err.message, variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  };

  const toggleSection = (idx: number) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">PDF Summary</h1>
          <p className="text-muted-foreground mt-1">Upload a PDF and get an AI-powered summary with key insights.</p>
        </div>

        {/* Upload Zone */}
        <Card
          className={`border-2 border-dashed transition-all duration-200 cursor-pointer ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            {uploading ? (
              <><Loader2 className="w-12 h-12 text-primary animate-spin mb-3" /><p className="text-muted-foreground font-medium">Extracting text from PDF...</p></>
            ) : pdfInfo ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                <p className="font-bold text-lg text-foreground">{pdfInfo.filename}</p>
                <p className="text-sm text-muted-foreground mt-1">{pdfInfo.pageCount} pages · {(pdfInfo.charCount / 1000).toFixed(1)}k characters extracted</p>
                <p className="text-xs text-primary mt-2 underline">Click to upload a different PDF</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="font-bold text-lg">Drop your PDF here</p>
                <p className="text-muted-foreground text-sm mt-1">or click to browse · Max 20MB</p>
              </>
            )}
          </div>
        </Card>

        {/* Summarize Button */}
        {pdfInfo && !summary && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Button
              size="lg"
              className="w-full h-14 text-lg"
              onClick={handleSummarize}
              disabled={summarizing}
            >
              {summarizing
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating summary...</>
                : <><Sparkles className="w-5 h-5 mr-2" />Generate AI Summary</>
              }
            </Button>
            {summarizing && <p className="text-center text-sm text-muted-foreground mt-2 animate-pulse">AI is reading and analyzing your document...</p>}
          </motion.div>
        )}

        {/* Summary Output */}
        <AnimatePresence>
          {summary && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Title & Overview */}
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-xl font-display font-bold">{summary.title}</h2>
                    <p className="text-muted-foreground mt-2 leading-relaxed">{summary.overview}</p>
                  </div>
                </div>
              </Card>

              {/* Key Points */}
              <Card className="p-6">
                <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
                  <List className="w-5 h-5 text-primary" /> Key Points
                </h3>
                <ul className="space-y-2">
                  {summary.keyPoints.map((pt, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3"
                    >
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-sm leading-relaxed">{pt}</span>
                    </motion.li>
                  ))}
                </ul>
              </Card>

              {/* Sections Accordion */}
              <Card className="p-6">
                <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" /> Section Breakdown
                </h3>
                <div className="space-y-2">
                  {summary.sections.map((sec, i) => (
                    <div key={i} className="border border-border rounded-xl overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                        onClick={() => toggleSection(i)}
                      >
                        <span className="font-semibold">{sec.heading}</span>
                        {openSections.has(i) ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <AnimatePresence>
                        {openSections.has(i) && (
                          <motion.div
                            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{sec.content}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Conclusion */}
              <Card className="p-6 bg-muted/30 border-border">
                <h3 className="font-bold text-base mb-2">Conclusion</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{summary.conclusion}</p>
              </Card>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setSummary(null); }}>
                  Re-summarize
                </Button>
                <Button className="flex-1" onClick={() => { window.location.href = `/quiz/generate?topic=${encodeURIComponent(summary.title)}`; }}>
                  <Sparkles className="w-4 h-4 mr-2" /> Quiz on This Topic
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
