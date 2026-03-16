"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Report {
  summary: string;
  sentiment: string;
  topPrices: { title: string; price: string }[];
  keyInsights: string[];
  recommendation: string;
}

interface StoredContext {
  competitorName: string;
  lastAnalyzed: string | null;
  report: Report | null;
}

interface StrategyAnalysis {
  overallScore: number;
  verdict: "Strong" | "Moderate" | "Weak" | "Risky";
  summary: string;
  effectiveness: { dimension: string; score: number; reasoning: string }[];
  supportingEvidence: { point: string; source: string; strength: "Strong" | "Moderate" | "Weak" }[];
  risks: string[];
  opportunities: string[];
  competitorContext: string;
  finalOpinion: string;
}

interface AnalysisEntry {
  id: string;
  strategy: string;
  competitorContext: string;
  analysis: StrategyAnalysis;
  timestamp: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Build the intelligence string injected into the prompt ────────────────────
function buildIntelligenceBlock(ctx: StoredContext): string {
  if (!ctx.report) return `Competitor: ${ctx.competitorName} (no intelligence report available yet)`;
  const r = ctx.report;
  return [
    `COMPETITOR INTELLIGENCE REPORT — ${ctx.competitorName}`,
    `Sentiment: ${r.sentiment}`,
    `Summary: ${r.summary}`,
    r.keyInsights?.length > 0 ? `Key Insights:\n${r.keyInsights.map(i => `- ${i}`).join("\n")}` : "",
    r.topPrices?.length > 0 ? `Known Pricing: ${r.topPrices.map(p => p.price).join(", ")}` : "",
    r.recommendation ? `Their Strategic Recommendation: ${r.recommendation}` : "",
  ].filter(Boolean).join("\n\n");
}

// ── Competitor Intelligence Panel ─────────────────────────────────────────────
function CompetitorContextPanel({ ctx }: { ctx: StoredContext }) {
  const [open, setOpen] = useState(true);
  const r = ctx.report;

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="border border-violet-500/20 rounded-2xl overflow-hidden bg-violet-500/[0.03]">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-violet-500/[0.04] transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-xs font-bold text-violet-300">
            {ctx.competitorName[0]?.toUpperCase()}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-white">{ctx.competitorName}</p>
              {r && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${sentimentBg(r.sentiment)} ${sentimentColor(r.sentiment)}`}>
                  {r.sentiment}
                </span>
              )}
              <span className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full font-medium">
                Pre-loaded context
              </span>
            </div>
            <p className="text-zinc-600 text-[10px] mt-0.5">
              {ctx.lastAnalyzed ? `Intelligence from ${timeAgo(ctx.lastAnalyzed)}` : "No analysis date"} · click to {open ? "collapse" : "expand"}
            </p>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-zinc-600 flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="border-t border-violet-500/15 px-5 pb-5 pt-4 space-y-4">
              {!r ? (
                <p className="text-zinc-600 text-xs text-center py-3">No intelligence report available for this competitor yet — analysis will still run.</p>
              ) : (
                <>
                  {/* Summary sentiment bar */}
                  <div className={`flex items-start gap-3 p-3 rounded-xl border ${sentimentBg(r.sentiment)}`}>
                    <span className={`text-base font-bold flex-shrink-0 ${sentimentColor(r.sentiment)}`}>
                      {r.sentiment === "Positive" ? "↑" : r.sentiment === "Negative" ? "↓" : "→"}
                    </span>
                    <p className="text-zinc-300 text-xs leading-relaxed">{r.summary}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Key insights */}
                    {r.keyInsights?.length > 0 && (
                      <div>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2 font-medium">Key Insights</p>
                        <ul className="space-y-1.5">
                          {r.keyInsights.slice(0, 5).map((insight, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-400">
                              <span className="text-violet-400 flex-shrink-0 mt-0.5">•</span>{insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Prices */}
                      {r.topPrices?.length > 0 && (
                        <div>
                          <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2 font-medium">Prices Found</p>
                          <div className="flex flex-wrap gap-1.5">
                            {r.topPrices.slice(0, 4).map((p, i) => (
                              <span key={i} className="text-[10px] bg-white/[0.04] border border-white/[0.08] rounded-md px-2 py-0.5 text-zinc-400 font-mono">
                                {p.price}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Recommendation */}
                      {r.recommendation && (
                        <div className="p-2.5 rounded-lg bg-violet-500/[0.06] border border-violet-500/15">
                          <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 font-medium">Their Recommendation</p>
                          <p className="text-violet-300 text-[11px] leading-relaxed">→ {r.recommendation}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-zinc-700 text-[10px] italic border-t border-white/[0.05] pt-3">
                    💡 This full report is automatically injected into the AI strategy analysis below.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circ = 2 * Math.PI * radius;
  const color = score >= 70 ? "#34d399" : score >= 45 ? "#fbbf24" : "#f87171";
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (score / 100) * circ }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
      />
    </svg>
  );
}

function VerdictBadge({ verdict }: { verdict: StrategyAnalysis["verdict"] }) {
  const cfg = {
    Strong:   { bg: "bg-emerald-500/10 border-emerald-500/25", text: "text-emerald-400", icon: "↑" },
    Moderate: { bg: "bg-amber-500/10 border-amber-500/25",     text: "text-amber-400",   icon: "→" },
    Weak:     { bg: "bg-red-500/10 border-red-500/25",         text: "text-red-400",      icon: "↓" },
    Risky:    { bg: "bg-orange-500/10 border-orange-500/25",   text: "text-orange-400",   icon: "⚠" },
  }[verdict];
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.icon} {verdict}
    </span>
  );
}

function StrengthDot({ s }: { s: "Strong" | "Moderate" | "Weak" }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${
    s === "Strong" ? "bg-emerald-400" : s === "Moderate" ? "bg-amber-400" : "bg-red-400"
  }`} />;
}

function DimensionBar({ dimension, score, reasoning }: { dimension: string; score: number; reasoning: string }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 45 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-300 font-medium">{dimension}</span>
        <span className="text-xs font-mono text-zinc-400">{score}/100</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div className={`h-full rounded-full ${color}`} initial={{ width: 0 }}
          animate={{ width: `${score}%` }} transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }} />
      </div>
      <p className="text-xs text-zinc-600 leading-relaxed">{reasoning}</p>
    </div>
  );
}

// ── Analysis result card ──────────────────────────────────────────────────────
function AnalysisCard({ entry }: { entry: AnalysisEntry }) {
  const [tab, setTab] = useState<"overview" | "evidence" | "opinion">("overview");
  const a = entry.analysis;
  const scoreColor = a.overallScore >= 70 ? "text-emerald-400" : a.overallScore >= 45 ? "text-amber-400" : "text-red-400";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="border border-white/[0.07] rounded-2xl overflow-hidden bg-white/[0.02]">

      {/* Score + verdict header */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-start gap-4 bg-white/[0.02]">
        <div className="relative flex-shrink-0">
          <ScoreRing score={a.overallScore} size={72} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-lg font-bold font-mono ${scoreColor}`}>{a.overallScore}</span>
            <span className="text-zinc-600 text-[9px] uppercase tracking-wider">score</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <VerdictBadge verdict={a.verdict} />
            <span className="text-zinc-600 text-xs">
              {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed line-clamp-2">{a.summary}</p>
        </div>
      </div>

      {/* Strategy text */}
      <div className="px-5 py-3 border-b border-white/[0.04] bg-black/20">
        <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-1">Your Strategy</p>
        <p className="text-zinc-400 text-xs leading-relaxed italic">"{entry.strategy}"</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        {(["overview", "evidence", "opinion"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors relative ${tab === t ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
            {tab === t && <motion.div layoutId={`tab-${entry.id}`} className="absolute inset-x-0 bottom-0 h-0.5 bg-violet-500 rounded-t-full" />}
            {t === "overview" && "📊 "}{t === "evidence" && "🔬 "}{t === "opinion" && "💡 "}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="p-5 space-y-5">
            <div className="space-y-4">
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium">Effectiveness Dimensions</p>
              {a.effectiveness.map((d, i) => <DimensionBar key={i} {...d} />)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium mb-2">⚠ Risks</p>
                <ul className="space-y-1.5">
                  {a.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-400">
                      <span className="text-red-400 flex-shrink-0 mt-0.5">•</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium mb-2">✦ Opportunities</p>
                <ul className="space-y-1.5">
                  {a.opportunities.map((o, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-400">
                      <span className="text-emerald-400 flex-shrink-0 mt-0.5">•</span>{o}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {a.competitorContext && (
              <div className="p-3 rounded-xl bg-violet-500/[0.05] border border-violet-500/15">
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">vs Competitor</p>
                <p className="text-violet-300 text-xs leading-relaxed">{a.competitorContext}</p>
              </div>
            )}
          </motion.div>
        )}

        {tab === "evidence" && (
          <motion.div key="evidence" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="p-5">
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium mb-3">Supporting Evidence</p>
            <div className="space-y-3">
              {a.supportingEvidence.map((e, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                  className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <StrengthDot s={e.strength} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 leading-relaxed">{e.point}</p>
                    <p className="text-[10px] text-zinc-600 mt-1 font-mono">{e.source}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${
                    e.strength === "Strong" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                    : e.strength === "Moderate" ? "text-amber-400 border-amber-500/20 bg-amber-500/10"
                    : "text-red-400 border-red-500/20 bg-red-500/10"
                  }`}>{e.strength}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "opinion" && (
          <motion.div key="opinion" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-sm flex-shrink-0">🤖</div>
              <div>
                <p className="text-white text-xs font-semibold">AI Strategic Opinion</p>
                <p className="text-zinc-600 text-[10px]">Based on market data & competitive analysis</p>
              </div>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{a.finalOpinion}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const QUICK_PROMPTS = [
  "Price undercut by 20% to gain market share",
  "Focus on niche vertical vs broad market",
  "Freemium model with enterprise upsell path",
  "Partner with complementary SaaS providers",
  "Double down on content marketing & SEO",
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StrategyAnalyzerPage() {
  const searchParams = useSearchParams();

  const [storedCtx, setStoredCtx] = useState<StoredContext | null>(null);
  const [strategy, setStrategy] = useState("");
  const [contextOverride, setContextOverride] = useState("");
  const [analyses, setAnalyses] = useState<AnalysisEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Read sessionStorage set by dashboard's navigateToStrategy()
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("strategyContext");
      if (raw) {
        const ctx: StoredContext = JSON.parse(raw);
        const urlCompetitor = searchParams.get("competitor");
        if (!urlCompetitor || ctx.competitorName === urlCompetitor) {
          setStoredCtx(ctx);
          setContextOverride(`Competing against ${ctx.competitorName}`);
        }
      }
    } catch { /* ignore parse errors */ }
  }, [searchParams]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [strategy]);

  const analyzeStrategy = async (strategyText: string, ctxText: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy: strategyText,
          competitorContext: ctxText,
          intelligenceBlock: storedCtx ? buildIntelligenceBlock(storedCtx) : "",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Analysis failed");
      }

      const { analysis } = await res.json();

      const entry: AnalysisEntry = {
        id: Date.now().toString(),
        strategy: strategyText,
        competitorContext: ctxText,
        analysis,
        timestamp: new Date(),
      };
      setAnalyses(prev => [entry, ...prev]);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = strategy.trim().length > 10 && !loading;

  return (
    <div className="min-h-screen bg-[#070709] text-white">
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: `linear-gradient(#a78bfa 1px,transparent 1px),linear-gradient(90deg,#a78bfa 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
      <div className="fixed top-0 left-1/3 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(124,58,237,0.05) 0%,transparent 70%)" }} />

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070709]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <a href="/dashboard" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-xs">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L4 8l6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dashboard
          </a>
          <span className="text-zinc-700">/</span>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-[10px]">🧠</div>
            <span className="font-semibold text-sm">Strategy Analyzer</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Header banner */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden border border-white/[0.08] px-8 py-7"
          style={{ background: "linear-gradient(135deg,#0f0a1e 0%,#130d24 60%,#0a0f1e 100%)" }}>
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle,rgba(124,58,237,0.1) 0%,transparent 70%)" }} />
          <div className="relative">
            <p className="text-zinc-500 text-xs font-mono tracking-widest uppercase mb-1">Intelligence Suite</p>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Strategy <span className="text-violet-400">Analyzer</span></h1>
            <p className="text-zinc-500 text-sm max-w-lg">
              Describe your business strategy and get an AI-powered effectiveness analysis — with real-world evidence, competitive context, and an honest opinion.
            </p>
          </div>
        </motion.div>

        {/* Competitor intel panel — only shown when navigated from dashboard */}
        <AnimatePresence>
          {storedCtx && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CompetitorContextPanel ctx={storedCtx} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input form */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-base">🧠</div>
            <div>
              <h2 className="font-semibold text-white text-sm">Analyze Strategy</h2>
              <p className="text-zinc-500 text-xs">
                {storedCtx
                  ? `Describe your plan against ${storedCtx.competitorName} — intelligence pre-loaded`
                  : "Describe your plan — get AI-powered effectiveness analysis with evidence"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-zinc-500 text-[10px] uppercase tracking-wider mb-1.5 font-medium">
                Your Strategy *
              </label>
              <textarea ref={textareaRef} value={strategy} onChange={(e) => setStrategy(e.target.value)}
                placeholder={storedCtx
                  ? `e.g. To counter ${storedCtx.competitorName}'s ${storedCtx.report?.sentiment?.toLowerCase() ?? "current"} position, we plan to…`
                  : "e.g. We plan to undercut competitor pricing by 15% in Q2, focus on enterprise clients, and offer bundled cloud storage with our SaaS product to differentiate…"}
                rows={4}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40 transition-colors resize-none leading-relaxed"
              />
              <p className="text-zinc-700 text-[10px] mt-1 ml-1">{strategy.length} chars — be specific for better analysis</p>
            </div>

            <div>
              <label className="block text-zinc-500 text-[10px] uppercase tracking-wider mb-1.5 font-medium">
                Competitor / Market Context {storedCtx ? "(pre-filled from dashboard)" : "(optional)"}
              </label>
              <input type="text" value={contextOverride} onChange={(e) => setContextOverride(e.target.value)}
                placeholder="e.g. We're competing against Microsoft, Salesforce in the CRM space targeting mid-market…"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/40 transition-colors"
              />
              {storedCtx && (
                <p className="text-violet-500 text-[10px] mt-1 ml-1">
                  ✓ Full intelligence report for {storedCtx.competitorName} injected into the AI prompt automatically.
                </p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: canSubmit ? 1.01 : 1 }} whileTap={{ scale: canSubmit ? 0.98 : 1 }}
              onClick={() => canSubmit && analyzeStrategy(strategy.trim(), contextOverride.trim())}
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Analyzing strategy…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M5 3l8 5-8 5V3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Analyze Strategy
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Quick prompts — only shown when no stored context and no results yet */}
        {!storedCtx && analyses.length === 0 && !loading && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <p className="text-zinc-600 text-xs uppercase tracking-wider mb-2 font-medium">Quick examples</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button key={p} onClick={() => { setStrategy(p); }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:text-violet-300 hover:border-violet-500/30 transition-colors">
                  {p}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <span>⚠</span> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading skeleton */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="border border-white/[0.07] rounded-2xl bg-white/[0.02] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.4, repeat: Infinity }}
                    className="h-3 bg-white/[0.07] rounded-full w-2/3" />
                  <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.2 }}
                    className="h-2 bg-white/[0.05] rounded-full w-1/2" />
                </div>
              </div>
              {[1, 2, 3].map(i => (
                <motion.div key={i} animate={{ opacity: [0.2, 0.45, 0.2] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
                  className="h-2.5 bg-white/[0.05] rounded-full" style={{ width: `${75 - i * 12}%` }} />
              ))}
              <p className="text-center text-zinc-600 text-xs pt-2 font-mono">
                {storedCtx ? `Analyzing against ${storedCtx.competitorName} intelligence…` : "Gathering market intelligence…"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <div ref={resultsRef} className="space-y-5">
          <AnimatePresence>
            {analyses.map(entry => <AnalysisCard key={entry.id} entry={entry} />)}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {analyses.length === 0 && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-2xl">🧠</div>
            <p className="text-zinc-400 text-sm font-medium">
              {storedCtx ? `Ready to analyze against ${storedCtx.competitorName}` : "No analyses yet"}
            </p>
            <p className="text-zinc-600 text-xs max-w-[280px]">
              {storedCtx
                ? `The intelligence report for ${storedCtx.competitorName} is loaded above. Describe your counter-strategy and hit Analyze.`
                : "Describe your strategy above to get a detailed effectiveness analysis with real-world evidence and an honest AI opinion."}
            </p>
          </motion.div>
        )}

      </main>
    </div>
  );
}