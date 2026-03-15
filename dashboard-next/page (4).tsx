"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────
interface User {
  name: string;
  email: string;
}

interface Competitor {
  _id: string;
  name: string;
  notes: string;
}

interface MetricCard {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: string;
}

// ── Mock chart data ───────────────────────────────────────────────────────────
const SENTIMENT_DATA = [
  { label: "Mon", positive: 72, negative: 28 },
  { label: "Tue", positive: 58, negative: 42 },
  { label: "Wed", positive: 85, negative: 15 },
  { label: "Thu", positive: 61, negative: 39 },
  { label: "Fri", positive: 90, negative: 10 },
  { label: "Sat", positive: 67, negative: 33 },
  { label: "Sun", positive: 78, negative: 22 },
];

const PRICE_DATA = [42, 45, 41, 48, 52, 49, 56, 54, 58, 62, 59, 65];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const METRICS: MetricCard[] = [
  { label: "Avg Sentiment", value: "+0.72", change: "+12% vs last week", positive: true, icon: "📈" },
  { label: "Articles Tracked", value: "1,284", change: "+84 today", positive: true, icon: "📰" },
  { label: "Price Alerts", value: "3", change: "2 new today", positive: false, icon: "⚠️" },
  { label: "Competitors", value: "—", change: "live tracking", positive: true, icon: "🏆" },
];

const ALERTS = [
  { id: 1, type: "warning", text: "Sony WH-1000XM6 sentiment spike detected (+0.89)", time: "2m ago" },
  { id: 2, type: "info", text: "Apple AirPods Pro 3 price dropped by 8%", time: "14m ago" },
  { id: 3, type: "success", text: "Positive trend confirmed across 3 competitors", time: "1h ago" },
];

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={`bg-white/[0.06] rounded-xl ${className}`}
    />
  );
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    motionVal.set(value);
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return unsub;
  }, [value, motionVal, spring]);

  return <>{display}</>;
}

// ── Sparkline chart ───────────────────────────────────────────────────────────
function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 200;
  const h = 48;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polyline
        points={points}
        fill="none"
        stroke="#7c3aed"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
      />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return (
          <motion.circle
            key={i}
            cx={x} cy={y} r="3"
            fill="#7c3aed"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + i * 0.08 }}
          />
        );
      })}
    </svg>
  );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function SentimentBar({ item, index }: { item: typeof SENTIMENT_DATA[0]; index: number }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className="w-full flex flex-col gap-0.5 h-24 justify-end">
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
          style={{ originY: 1, height: `${item.positive}%` }}
          className="w-full rounded-t-md bg-gradient-to-t from-violet-600 to-violet-400"
        />
      </div>
      <span className="text-zinc-500 text-[10px] font-mono">{item.label}</span>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [user] = useState<User>({ name: "Alex", email: "alex@marketpulse.ai" });
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentReady, setContentReady] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [adding, setAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load competitors ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/competitors");
        if (res.ok) {
          const data = await res.json();
          setCompetitors(data.competitors ?? []);
        }
      } catch {
        // fail silently — use empty list
      } finally {
        setLoading(false);
        setTimeout(() => setContentReady(true), 300);
      }
    };
    load();
  }, []);

  // ── Add competitor ──────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newCompetitor.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCompetitor.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCompetitors((prev) => [data.competitor, ...prev]);
        setNewCompetitor("");
      }
    } finally {
      setAdding(false);
    }
  };

  // ── Delete competitor ───────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setCompetitors((prev) => prev.filter((c) => c._id !== id));
    await fetch(`/api/competitors/${id}`, { method: "DELETE" });
  };

  // ── Edit competitor ─────────────────────────────────────────────────────────
  const handleEdit = async (id: string) => {
    if (!editingName.trim()) return;
    const res = await fetch(`/api/competitors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setCompetitors((prev) => prev.map((c) => (c._id === id ? data.competitor : c)));
    }
    setEditingId(null);
  };

  // ── Upload txt file ─────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const names = text.split("\n").map((l) => l.trim()).filter(Boolean);
      for (const name of names) {
        const res = await fetch("/api/competitors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const data = await res.json();
          setCompetitors((prev) => [...prev, data.competitor]);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Update metrics with live competitor count ───────────────────────────────
  const metrics = METRICS.map((m) =>
    m.label === "Competitors"
      ? { ...m, value: String(competitors.length) }
      : m
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white font-sans">

      {/* ── Background grid ── */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#a78bfa 1px, transparent 1px), linear-gradient(90deg, #a78bfa 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Glow orbs ── */}
      <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)" }} />
      <div className="fixed bottom-0 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)" }} />

      {/* ══════════════════════════════════════════════════════
          NAV
      ══════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070709]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 12L6 7L9 10L13 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight">MarketPulse AI</span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            {["Dashboard", "Analytics", "Alerts", "Reports"].map((item) => (
              <button key={item}
                className={`hover:text-white transition-colors ${item === "Dashboard" ? "text-white" : ""}`}>
                {item}
              </button>
            ))}
          </div>

          {/* User avatar */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-zinc-500">{user.email}</p>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-sm font-bold cursor-pointer ring-2 ring-violet-500/30"
            >
              {user.name[0].toUpperCase()}
            </motion.div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ══════════════════════════════════════════════════════
            HERO WELCOME CARD — full width
        ══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08]"
          style={{ background: "linear-gradient(135deg, #0f0a1e 0%, #130d24 50%, #0a0f1e 100%)" }}
        >
          {/* Decorative glow inside card */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)" }} />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)" }} />
          </div>

          <div className="relative px-8 py-7 flex items-center justify-between flex-wrap gap-4">
            <div>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-zinc-400 text-sm mb-1 font-mono tracking-widest uppercase"
              >
                Welcome back
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold tracking-tight"
              >
                Hello, <span className="text-violet-400">{user.name}</span> 👋
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-zinc-400 text-sm mt-1"
              >
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · Market intelligence is live
              </motion.p>
            </div>

            {/* Status pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/10"
            >
              <motion.div
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-emerald-400"
              />
              <span className="text-emerald-400 text-sm font-medium">All systems live</span>
            </motion.div>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════
            METRICS ROW
        ══════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map((i) => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {metrics.map((m, i) => (
                <motion.div
                  key={m.label}
                  variants={itemVariants}
                  whileHover={{ y: -2, borderColor: "rgba(124,58,237,0.3)" }}
                  className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 cursor-default transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">{m.label}</span>
                    <span className="text-lg">{m.icon}</span>
                  </div>
                  <div className="text-2xl font-bold font-mono mb-1">
                    {m.label === "Competitors" ? (
                      <AnimatedNumber value={competitors.length} />
                    ) : m.value}
                  </div>
                  <div className={`text-xs ${m.positive ? "text-emerald-400" : "text-amber-400"}`}>
                    {m.change}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════
            MAIN GRID: Competitors (left) + Charts (right)
        ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── COMPETITORS PANEL ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">Competitor Watchlist</h2>
                <p className="text-zinc-500 text-xs mt-0.5">Track and manage your competitors</p>
              </div>
              {/* Upload button */}
              <div>
                <input ref={fileInputRef} type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300 text-xs hover:border-violet-500/40 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1v10M4 7l4-4 4 4M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Upload .txt
                </motion.button>
              </div>
            </div>

            {/* Add input */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newCompetitor}
                onChange={(e) => setNewCompetitor(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Add competitor name..."
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/50 transition-colors"
              />
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleAdd}
                disabled={adding}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {adding ? "..." : "Add"}
              </motion.button>
            </div>

            {/* List */}
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
              <AnimatePresence>
                {loading ? (
                  [1,2,3].map((i) => <Skeleton key={i} className="h-12" />)
                ) : competitors.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-10 text-zinc-600 text-sm"
                  >
                    No competitors yet. Add one above or upload a .txt file.
                  </motion.div>
                ) : (
                  competitors.map((c, i) => (
                    <motion.div
                      key={c._id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16, height: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/20 group transition-colors"
                    >
                      {editingId === c._id ? (
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEdit(c._id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={() => handleEdit(c._id)}
                          className="flex-1 bg-transparent text-sm text-white outline-none border-b border-violet-500/50"
                        />
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">
                              {c.name[0].toUpperCase()}
                            </div>
                            <span className="text-sm text-white font-medium">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => { setEditingId(c._id); setEditingName(c.name); }}
                              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-400 hover:text-white transition-colors"
                              title="Edit"
                            >
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(c._id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </motion.button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ── SENTIMENT CHART ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-white">Sentiment Analysis</h2>
                <p className="text-zinc-500 text-xs mt-0.5">7-day positive sentiment score</p>
              </div>
              <span className="text-emerald-400 text-sm font-mono font-bold">+0.72 avg</span>
            </div>

            {loading ? (
              <Skeleton className="h-40" />
            ) : (
              <AnimatePresence>
                {contentReady && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-end gap-2 h-32"
                  >
                    {SENTIMENT_DATA.map((item, i) => (
                      <SentimentBar key={item.label} item={item} index={i} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.05]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-violet-500" />
                <span className="text-zinc-400 text-xs">Positive</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-white/10" />
                <span className="text-zinc-400 text-xs">Negative</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════
            PRICE TREND + ALERTS ROW
        ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Price trend — 2/3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="lg:col-span-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-white">Price Intelligence</h2>
                <p className="text-zinc-500 text-xs mt-0.5">12-month average market price trend</p>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 12L6 7L9 10L14 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                +54% YTD
              </div>
            </div>

            {loading ? <Skeleton className="h-16" /> : (
              <div className="flex items-end gap-1">
                {PRICE_DATA.map((v, i) => {
                  const max = Math.max(...PRICE_DATA);
                  const pct = (v / max) * 100;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1 group">
                      <motion.div
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.6 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        style={{ originY: 1, height: `${pct * 0.7}px` }}
                        className="w-full rounded-t-md bg-gradient-to-t from-violet-700/60 to-violet-400/80 group-hover:to-violet-300 transition-colors min-h-[4px]"
                      />
                      <span className="text-[9px] text-zinc-600 font-mono">{MONTHS[i]}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/[0.05]">
              <Sparkline data={PRICE_DATA} />
            </div>
          </motion.div>

          {/* Alerts — 1/3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white">Live Alerts</h2>
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-amber-400"
              />
            </div>

            <div className="flex flex-col gap-3">
              {ALERTS.map((alert, i) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className={`p-3 rounded-xl border text-xs ${
                    alert.type === "warning"
                      ? "bg-amber-500/5 border-amber-500/15 text-amber-300"
                      : alert.type === "success"
                      ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-300"
                      : "bg-blue-500/5 border-blue-500/15 text-blue-300"
                  }`}
                >
                  <p className="font-medium leading-relaxed">{alert.text}</p>
                  <p className="opacity-50 mt-1">{alert.time}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════
            AI INSIGHTS STRIP
        ══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-6 h-6 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xs">✨</div>
            <h2 className="font-semibold text-white">AI Insights</h2>
            <span className="text-xs text-zinc-500 ml-auto">Powered by OpenRouter</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "Market Trend",
                cause: "Positive earnings coverage",
                action: "Monitor premium segment",
                score: "+0.82",
                color: "emerald",
              },
              {
                title: "Price Breakout",
                cause: "Supply chain disruption signals",
                action: "Reassess pricing strategy",
                score: "⚠️ Alert",
                color: "amber",
              },
              {
                title: "Growth Signal",
                cause: "Budget segment expanding rapidly",
                action: "Target mid-range gap $150–$250",
                score: "+0.64",
                color: "violet",
              },
            ].map((insight, i) => (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                whileHover={{ y: -2 }}
                className={`p-4 rounded-xl border ${
                  insight.color === "emerald"
                    ? "border-emerald-500/15 bg-emerald-500/[0.04]"
                    : insight.color === "amber"
                    ? "border-amber-500/15 bg-amber-500/[0.04]"
                    : "border-violet-500/15 bg-violet-500/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{insight.title}</span>
                  <span className={`text-xs font-mono font-bold ${
                    insight.color === "emerald" ? "text-emerald-400" :
                    insight.color === "amber" ? "text-amber-400" : "text-violet-400"
                  }`}>{insight.score}</span>
                </div>
                <p className="text-white text-sm font-medium mb-1">📌 {insight.cause}</p>
                <p className="text-zinc-500 text-xs">→ {insight.action}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </main>
    </div>
  );
}
