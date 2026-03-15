"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────
interface User { id: string; name: string; email: string; }

interface Report {
  summary: string;
  sentiment: string;
  sentimentScore: number;
  topPrices: { title: string; price: string }[];
  keyInsights: string[];
  recommendation: string;
  rawMarkdown: string;
}

interface Competitor {
  _id: string;
  name: string;
  notes: string;
  createdAt: string;
  lastAnalyzed: string | null;
  latestReport: Report | null;
}

interface ActivityLog {
  _id: string;
  competitorName: string;
  status: "running" | "success" | "error";
  message: string;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function sentimentColor(s: string) {
  if (s === "Positive") return "text-emerald-400";
  if (s === "Negative") return "text-red-400";
  return "text-amber-400";
}

function sentimentBg(s: string) {
  if (s === "Positive") return "bg-emerald-500/10 border-emerald-500/20";
  if (s === "Negative") return "bg-red-500/10 border-red-500/20";
  return "bg-amber-500/10 border-amber-500/20";
}

function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      className={`bg-white/[0.06] rounded-xl ${className}`}
    />
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500"
      />
      <motion.p
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="text-zinc-500 text-sm font-mono"
      >
        Loading your workspace…
      </motion.p>
    </div>
  );
}

// ── Analysis status badge ─────────────────────────────────────────────────────
function AnalysisBadge({ status }: { status: "idle" | "running" | "done" | "error" }) {
  if (status === "running") return (
    <span className="flex items-center gap-1.5 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        className="w-2.5 h-2.5 border border-violet-300/40 border-t-violet-300 rounded-full" />
      Analyzing…
    </span>
  );
  if (status === "done") return (
    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
      ✓ Done
    </span>
  );
  if (status === "error") return (
    <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
      ✗ Failed
    </span>
  );
  return null;
}

// ── Report card shown inside expanded competitor row ──────────────────────────
function ReportCard({ report }: { report: Report }) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Sentiment + summary */}
      <div className={`flex items-start gap-3 p-3 rounded-xl border ${sentimentBg(report.sentiment)}`}>
        <span className={`text-lg font-bold ${sentimentColor(report.sentiment)}`}>
          {report.sentiment === "Positive" ? "↑" : report.sentiment === "Negative" ? "↓" : "→"}
        </span>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${sentimentColor(report.sentiment)}`}>
            {report.sentiment} Sentiment
          </p>
          <p className="text-zinc-300 text-xs leading-relaxed">{report.summary}</p>
        </div>
      </div>

      {/* Key insights */}
      {report.keyInsights.length > 0 && (
        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2 font-medium">Key Insights</p>
          <ul className="space-y-1.5">
            {report.keyInsights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                <span className="text-violet-400 mt-0.5 flex-shrink-0">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prices */}
      {report.topPrices.length > 0 && (
        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2 font-medium">Prices Found</p>
          <div className="flex flex-wrap gap-2">
            {report.topPrices.map((p, i) => (
              <span key={i} className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1 text-zinc-300 font-mono">
                {p.price}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      {report.recommendation && (
        <div className="p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/15">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1 font-medium">Recommendation</p>
          <p className="text-violet-300 text-xs leading-relaxed">→ {report.recommendation}</p>
        </div>
      )}

      {/* Raw markdown toggle */}
      <button
        onClick={() => setShowRaw(!showRaw)}
        className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors underline underline-offset-2"
      >
        {showRaw ? "Hide" : "Show"} raw report
      </button>
      <AnimatePresence>
        {showRaw && (
          <motion.pre
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="text-xs text-zinc-500 bg-black/30 rounded-xl p-4 overflow-auto whitespace-pre-wrap max-h-60 font-mono"
          >
            {report.rawMarkdown}
          </motion.pre>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [competitorsLoading, setCompetitorsLoading] = useState(true);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // per-competitor analysis status
  const [analysisStatus, setAnalysisStatus] = useState<Record<string, "idle" | "running" | "done" | "error">>({});

  const [activeTab, setActiveTab] = useState<"watchlist" | "reports" | "activity">("watchlist");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch logs ──────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/activity");
    if (res.ok) {
      const data = await res.json();
      setActivityLogs(data.logs ?? []);
    }
  }, []);

  // ── Run analysis for one competitor ────────────────────────────────────────
  const analyzeOne = useCallback(async (c: Competitor, force = false) => {
    setAnalysisStatus(prev => ({ ...prev, [c._id]: "running" }));
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorId: c._id, name: c.name, force }),
      });
      const data = await res.json();

      if (data.skipped) {
        setAnalysisStatus(prev => ({ ...prev, [c._id]: "idle" }));
        return;
      }

      if (!res.ok) throw new Error(data.message);

      // Update competitor in state with new report
      setCompetitors(prev => prev.map(comp =>
        comp._id === c._id
          ? { ...comp, lastAnalyzed: new Date().toISOString(), latestReport: data.report }
          : comp
      ));
      setAnalysisStatus(prev => ({ ...prev, [c._id]: "done" }));
      fetchLogs();
      setTimeout(() => setAnalysisStatus(prev => ({ ...prev, [c._id]: "idle" })), 4000);
    } catch {
      setAnalysisStatus(prev => ({ ...prev, [c._id]: "error" }));
      fetchLogs();
      setTimeout(() => setAnalysisStatus(prev => ({ ...prev, [c._id]: "idle" })), 5000);
    }
  }, [fetchLogs]);

  // ── Run all competitors (skips recently analyzed unless forced) ─────────────
  const analyzeAll = useCallback((compList: Competitor[], force = false) => {
    compList.forEach(c => analyzeOne(c, force));
  }, [analyzeOne]);

  // ── Fetch user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) { router.replace("/login"); return; }
        const data = await res.json();
        setUser(data.user);
      } catch {
        router.replace("/login");
      } finally {
        setAuthLoading(false);
      }
    })();
  }, [router]);

  // ── Fetch competitors + logs, then auto-analyze ─────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      setCompetitorsLoading(true);
      try {
        const [compRes, logsRes] = await Promise.all([
          fetch("/api/competitors"),
          fetch("/api/activity"),
        ]);
        let compList: Competitor[] = [];
        if (compRes.ok) {
          const data = await compRes.json();
          compList = data.competitors ?? [];
          setCompetitors(compList);
        }
        if (logsRes.ok) {
          const data = await logsRes.json();
          setActivityLogs(data.logs ?? []);
        }

        // Auto-analyze on login (respects 1-hour cache)
        if (compList.length > 0) {
          analyzeAll(compList, false);
        }
      } finally {
        setCompetitorsLoading(false);
      }
    })();
  }, [user, analyzeAll]);

  // ── Auto-analyze every 1 hour ───────────────────────────────────────────────
  useEffect(() => {
    if (!user || competitors.length === 0) return;
    intervalRef.current = setInterval(() => {
      analyzeAll(competitors, false);
    }, 60 * 60 * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [user, competitors, analyzeAll]);

  // ── Add ─────────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true); setAddError("");
    try {
      const res = await fetch("/api/competitors", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.message ?? "Failed to add"); return; }
      const newComp = data.competitor as Competitor;
      setCompetitors(prev => [newComp, ...prev]);
      setNewName("");
      // Immediately analyze the new competitor
      analyzeOne(newComp, true);
    } catch { setAddError("Network error."); }
    finally { setAdding(false); }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/competitors/${id}`, { method: "DELETE" });
      setCompetitors(prev => prev.filter(c => c._id !== id));
      if (expandedId === id) setExpandedId(null);
    } finally { setDeletingId(null); }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const startEdit = (c: Competitor) => {
    setEditingId(c._id); setEditingName(c.name); setEditingNotes(c.notes ?? "");
    setExpandedId(null);
  };

  const saveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setSavingId(id);
    try {
      const res = await fetch(`/api/competitors/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim(), notes: editingNotes }),
      });
      if (res.ok) {
        const data = await res.json();
        setCompetitors(prev => prev.map(c => c._id === id ? { ...c, ...data.competitor } : c));
      }
    } finally { setSavingId(null); setEditingId(null); }
  };

  // ── Upload .txt ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const names = text.split("\n").map(l => l.trim()).filter(Boolean);
    for (const name of names) {
      const res = await fetch("/api/competitors", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        const newComp = data.competitor as Competitor;
        setCompetitors(prev => [...prev, newComp]);
        analyzeOne(newComp, true);
      }
    }
    e.target.value = "";
  };

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  // ── Derived stats ───────────────────────────────────────────────────────────
  const analyzedCount = competitors.filter(c => c.lastAnalyzed).length;
  const positiveCount = competitors.filter(c => c.latestReport?.sentiment === "Positive").length;
  const runningCount = Object.values(analysisStatus).filter(s => s === "running").length;

  if (authLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[#070709] text-white">
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: `linear-gradient(#a78bfa 1px,transparent 1px),linear-gradient(90deg,#a78bfa 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(124,58,237,0.05) 0%,transparent 70%)" }} />

      {/* ════ NAVBAR ════ */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070709]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 12L6 7L9 10L13 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight">MarketPulse AI</span>
            {runningCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full ml-2">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="w-2 h-2 border border-violet-300/40 border-t-violet-300 rounded-full" />
                {runningCount} analyzing…
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium leading-tight">{user.name}</p>
                  <p className="text-xs text-zinc-500 leading-tight">{user.email}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold ring-2 ring-violet-500/20">
                  {user.name[0].toUpperCase()}
                </div>
              </>
            )}
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 text-xs hover:text-red-400 hover:border-red-500/25 transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Logout
            </motion.button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ════ WELCOME CARD ════ */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08]"
          style={{ background: "linear-gradient(135deg,#0f0a1e 0%,#130d24 60%,#0a0f1e 100%)" }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full"
              style={{ background: "radial-gradient(circle,rgba(124,58,237,0.12) 0%,transparent 70%)" }} />
          </div>
          <div className="relative px-8 py-7 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-zinc-500 text-xs font-mono tracking-widest uppercase mb-1">Welcome back</p>
              <h1 className="text-3xl font-bold tracking-tight">
                Hello, <span className="text-violet-400">{user?.name}</span> 👋
              </h1>
              <p className="text-zinc-500 text-sm mt-1.5">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                {" · "}
                <span className="text-zinc-400">
                  {competitorsLoading ? "loading…" : `${competitors.length} competitor${competitors.length !== 1 ? "s" : ""} tracked`}
                </span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07]">
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 text-xs font-medium">
                  {runningCount > 0 ? `Analyzing ${runningCount} competitor${runningCount > 1 ? "s" : ""}…` : "System live"}
                </span>
              </div>
              <p className="text-zinc-600 text-xs">Auto-refreshes every hour</p>
            </div>
          </div>
        </motion.div>

        {/* ════ STATS ════ */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: "Competitors", value: competitors.length, icon: "🏆", sub: "in your watchlist" },
            { label: "Analyzed", value: analyzedCount, icon: "🔍", sub: "have intelligence reports" },
            { label: "Positive", value: positiveCount, icon: "📈", sub: "positive sentiment" },
            { label: "Running", value: runningCount, icon: "⚡", sub: "analyses in progress" },
          ].map((stat, i) => (
            <motion.div key={stat.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06 }}
              className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-zinc-500 text-xs uppercase tracking-wider font-medium">{stat.label}</span>
                <span className="text-base">{stat.icon}</span>
              </div>
              <div className="text-2xl font-bold font-mono mb-0.5">
                {competitorsLoading ? <Skeleton className="h-7 w-10 inline-block" /> : String(stat.value)}
              </div>
              <p className="text-zinc-600 text-xs">{stat.sub}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ════ TABS ════ */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.07] rounded-xl w-fit mb-6">
            {(["watchlist", "reports", "activity"] as const).map(tab => (
              <button key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize relative ${
                  activeTab === tab ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {activeTab === tab && (
                  <motion.div layoutId="activeTab"
                    className="absolute inset-0 bg-white/[0.06] rounded-lg border border-white/[0.08]" />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {tab === "watchlist" && "🏆"}
                  {tab === "reports" && "📊"}
                  {tab === "activity" && (
                    <>
                      📋
                      {activityLogs.filter(l => l.status === "running").length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      )}
                    </>
                  )}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </span>
              </button>
            ))}
          </div>

          {/* ══ TAB: WATCHLIST ══ */}
          <AnimatePresence mode="wait">
            {activeTab === "watchlist" && (
              <motion.div key="watchlist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                  <div>
                    <h2 className="font-semibold text-white text-base">Competitor Watchlist</h2>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {competitorsLoading ? "Loading from database…" : `${competitors.length} competitor${competitors.length !== 1 ? "s" : ""} · analyses auto-run every hour`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input ref={fileInputRef} type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-300 text-xs hover:border-violet-500/30 transition-colors"
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1v9M5 4l3-3 3 3M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Upload .txt
                    </motion.button>
                    {competitors.length > 0 && (
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => analyzeAll(competitors, true)}
                        disabled={runningCount > 0}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs hover:bg-violet-500/20 transition-colors disabled:opacity-40"
                      >
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                          <path d="M1 8a7 7 0 1014 0A7 7 0 001 8zM8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Refresh All
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Add input */}
                <div className="flex gap-2 mb-5">
                  <div className="flex-1">
                    <input type="text" value={newName}
                      onChange={(e) => { setNewName(e.target.value); setAddError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                      placeholder="Type a competitor name and press Enter…"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40 transition-colors"
                    />
                    <AnimatePresence>
                      {addError && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="text-red-400 text-xs mt-1 ml-1">{addError}</motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleAdd} disabled={adding || !newName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-2 flex-shrink-0"
                  >
                    {adding ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    )}
                    Add
                  </motion.button>
                </div>

                {/* List */}
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {competitorsLoading ? (
                      [1,2,3].map(i => (
                        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <Skeleton className="h-16" />
                        </motion.div>
                      ))
                    ) : competitors.length === 0 ? (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-14 gap-3"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-2xl">🏆</div>
                        <p className="text-zinc-400 text-sm font-medium">No competitors yet</p>
                        <p className="text-zinc-600 text-xs text-center max-w-[220px]">Add a competitor above — analysis runs automatically.</p>
                      </motion.div>
                    ) : (
                      competitors.map((c, i) => (
                        <motion.div key={c._id} layout
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.3 }}
                          className="border border-white/[0.06] rounded-xl overflow-hidden"
                        >
                          {/* Row */}
                          <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.035] transition-colors group">
                            {editingId === c._id ? (
                              <div className="flex-1 flex flex-col gap-2 py-1">
                                <input autoFocus value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Escape") setEditingId(null); }}
                                  className="w-full bg-white/[0.05] border border-violet-500/40 rounded-lg px-3 py-2 text-sm text-white outline-none"
                                  placeholder="Competitor name"
                                />
                                <textarea value={editingNotes} onChange={(e) => setEditingNotes(e.target.value)}
                                  rows={3}
                                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none resize-none placeholder:text-zinc-600 focus:border-violet-500/30 transition-colors"
                                  placeholder="Add analysis notes (optional)…"
                                />
                                <div className="flex gap-2">
                                  <motion.button whileTap={{ scale: 0.97 }}
                                    onClick={() => saveEdit(c._id)} disabled={savingId === c._id}
                                    className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    {savingId === c._id && (
                                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                        className="w-3 h-3 border border-white/30 border-t-white rounded-full" />
                                    )}
                                    {savingId === c._id ? "Saving…" : "Save"}
                                  </motion.button>
                                  <button onClick={() => setEditingId(null)}
                                    className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-zinc-400 text-xs hover:text-white transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button className="flex items-center gap-3 flex-1 text-left min-w-0"
                                  onClick={() => setExpandedId(expandedId === c._id ? null : c._id)}
                                >
                                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400 flex-shrink-0">
                                    {c.name[0]?.toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                                      <AnalysisBadge status={analysisStatus[c._id] ?? "idle"} />
                                      {c.latestReport && analysisStatus[c._id] !== "running" && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${sentimentBg(c.latestReport.sentiment)} ${sentimentColor(c.latestReport.sentiment)}`}>
                                          {c.latestReport.sentiment}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-zinc-600">
                                      {c.lastAnalyzed ? `Analyzed ${timeAgo(c.lastAnalyzed)}` : "Not yet analyzed"}
                                      {c.notes?.trim() && " · has notes"}
                                    </p>
                                  </div>
                                </button>

                                <motion.div animate={{ rotate: expandedId === c._id ? 180 : 0 }} transition={{ duration: 0.2 }}
                                  className="text-zinc-600 flex-shrink-0">
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </motion.div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {/* Manual analyze button */}
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={(e) => { e.stopPropagation(); analyzeOne(c, true); }}
                                    disabled={analysisStatus[c._id] === "running"}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-violet-500/15 border border-white/[0.08] hover:border-violet-500/30 text-zinc-400 hover:text-violet-300 transition-colors disabled:opacity-40"
                                    title="Run analysis"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                      <path d="M5 3l8 5-8 5V3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span className="text-xs hidden sm:inline">Analyze</span>
                                  </motion.button>
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={(e) => { e.stopPropagation(); startEdit(c); }}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-violet-500/20 border border-white/[0.08] hover:border-violet-500/40 text-zinc-400 hover:text-violet-300 transition-colors"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                      <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span className="text-xs hidden sm:inline">Edit</span>
                                  </motion.button>
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={(e) => { e.stopPropagation(); handleDelete(c._id); }}
                                    disabled={deletingId === c._id}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-red-500/15 border border-white/[0.08] hover:border-red-500/40 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-40"
                                  >
                                    {deletingId === c._id ? (
                                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                                        className="w-3.5 h-3.5 border border-red-400/40 border-t-red-400 rounded-full" />
                                    ) : (
                                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                        <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                    <span className="text-xs hidden sm:inline">Delete</span>
                                  </motion.button>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Expanded panel — notes + report */}
                          <AnimatePresence>
                            {expandedId === c._id && editingId !== c._id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-white/[0.05] p-4 bg-black/20 space-y-4">
                                  {/* Notes */}
                                  {c.notes?.trim() && (
                                    <div>
                                      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2 font-medium">Your Notes</p>
                                      <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-wrap">{c.notes}</p>
                                    </div>
                                  )}

                                  {/* Report or loading */}
                                  {analysisStatus[c._id] === "running" ? (
                                    <div className="space-y-3">
                                      <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium">Analysis in progress…</p>
                                      <Skeleton className="h-16" />
                                      <Skeleton className="h-10" />
                                      <Skeleton className="h-12" />
                                    </div>
                                  ) : c.latestReport ? (
                                    <div>
                                      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3 font-medium">Latest Intelligence Report</p>
                                      <ReportCard report={c.latestReport} />
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between py-2">
                                      <p className="text-zinc-600 text-xs">No report yet.</p>
                                      <button onClick={() => analyzeOne(c, true)}
                                        className="text-violet-400 text-xs hover:text-violet-300 underline underline-offset-2">
                                        Run analysis now →
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ══ TAB: REPORTS ══ */}
            {activeTab === "reports" && (
              <motion.div key="reports" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
                  <h2 className="font-semibold text-white text-base mb-1">Intelligence Reports</h2>
                  <p className="text-zinc-500 text-xs mb-6">Latest analysis for all tracked competitors</p>

                  {competitors.filter(c => c.latestReport).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <div className="text-4xl">📊</div>
                      <p className="text-zinc-400 text-sm font-medium">No reports yet</p>
                      <p className="text-zinc-600 text-xs text-center max-w-[240px]">
                        {competitors.length === 0
                          ? "Add competitors in the Watchlist tab first."
                          : runningCount > 0
                            ? "Analysis is running — results will appear here shortly."
                            : "Go to Watchlist and click Analyze on any competitor."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {competitors.filter(c => c.latestReport).map((c, i) => (
                        <motion.div key={c._id}
                          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="border border-white/[0.06] rounded-xl overflow-hidden"
                        >
                          <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border-b border-white/[0.05]">
                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">
                              {c.name[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">{c.name}</p>
                              <p className="text-xs text-zinc-600">{c.lastAnalyzed ? `Last analyzed ${timeAgo(c.lastAnalyzed)}` : ""}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {c.latestReport && (
                                <span className={`text-xs px-2.5 py-1 rounded-full border ${sentimentBg(c.latestReport.sentiment)} ${sentimentColor(c.latestReport.sentiment)} font-medium`}>
                                  {c.latestReport.sentiment}
                                </span>
                              )}
                              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={() => analyzeOne(c, true)}
                                disabled={analysisStatus[c._id] === "running"}
                                className="px-3 py-1.5 rounded-lg border border-violet-500/25 bg-violet-500/10 text-violet-300 text-xs hover:bg-violet-500/20 transition-colors disabled:opacity-40"
                              >
                                {analysisStatus[c._id] === "running" ? "Running…" : "Re-run"}
                              </motion.button>
                            </div>
                          </div>
                          <div className="p-4">
                            {c.latestReport && <ReportCard report={c.latestReport} />}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ══ TAB: ACTIVITY LOG ══ */}
            {activeTab === "activity" && (
              <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-semibold text-white text-base">Activity Log</h2>
                    <p className="text-zinc-500 text-xs mt-0.5">Live feed of all analysis events</p>
                  </div>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={fetchLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 text-xs hover:text-white transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                      <path d="M1 8a7 7 0 0013.5-2M14.5 1v5h-5M15 8a7 7 0 01-13.5 2M1.5 15v-5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Refresh
                  </motion.button>
                </div>

                {activityLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="text-4xl">📋</div>
                    <p className="text-zinc-400 text-sm font-medium">No activity yet</p>
                    <p className="text-zinc-600 text-xs">Analysis events will appear here in real-time.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activityLogs.map((log, i) => (
                      <motion.div key={log._id}
                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${
                          log.status === "success" ? "bg-emerald-500/[0.04] border-emerald-500/15" :
                          log.status === "error" ? "bg-red-500/[0.04] border-red-500/15" :
                          "bg-violet-500/[0.04] border-violet-500/15"
                        }`}
                      >
                        <span className="text-base flex-shrink-0 mt-0.5">
                          {log.status === "success" ? "✅" : log.status === "error" ? "❌" : "⚡"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium leading-relaxed ${
                            log.status === "success" ? "text-emerald-300" :
                            log.status === "error" ? "text-red-300" : "text-violet-300"
                          }`}>
                            {log.message}
                          </p>
                          <p className="text-zinc-600 mt-0.5">{timeAgo(log.createdAt)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ════ ACCOUNT ════ */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6"
        >
          <h2 className="font-semibold text-white text-base mb-4">Account</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Name", value: user?.name ?? "—" },
              { label: "Email", value: user?.email ?? "—" },
              { label: "User ID", value: user?.id ?? "—", mono: true },
            ].map((field) => (
              <div key={field.label} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5">{field.label}</p>
                <p className={`text-white truncate ${field.mono ? "font-mono text-xs text-zinc-400" : "font-medium text-sm"}`}>
                  {field.value}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

      </main>
    </div>
  );
}