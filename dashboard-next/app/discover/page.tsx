"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Competitor {
  name: string;
  description: string;
  website: string;
  country: string;
}

interface DiscoveryResult {
  local: Competitor[];
  global: Competitor[];
  summary: string;
}

// ── Country list ──────────────────────────────────────────────────────────────
const COUNTRIES = [
  "United States", "United Kingdom", "Germany", "France", "India", "Canada",
  "Australia", "Singapore", "Netherlands", "Sweden", "Switzerland", "Japan",
  "South Korea", "Brazil", "Mexico", "Spain", "Italy", "Norway", "Denmark",
  "Finland", "Poland", "Czech Republic", "Austria", "Belgium", "Portugal",
  "New Zealand", "South Africa", "UAE", "Saudi Arabia", "Israel", "Turkey",
  "Argentina", "Chile", "Colombia", "Indonesia", "Malaysia", "Thailand",
  "Philippines", "Vietnam", "Pakistan", "Bangladesh", "Nigeria", "Kenya",
  "Egypt", "Morocco", "Ghana", "Ethiopia", "Tanzania", "Uganda", "Rwanda",
  "China", "Hong Kong", "Taiwan", "Russia", "Ukraine", "Romania", "Hungary",
  "Greece", "Croatia", "Serbia", "Slovakia", "Bulgaria", "Lithuania",
  "Latvia", "Estonia", "Slovenia", "Luxembourg", "Ireland", "Iceland",
];

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
      done ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
      : active ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
      : "bg-white/[0.03] border-white/[0.08] text-zinc-600"
    }`}>
      {done ? "✓" : n}
    </div>
  );
}

// ── Competitor card ───────────────────────────────────────────────────────────
function CompetitorCard({ c, i, type }: { c: Competitor; i: number; type: "local" | "global" }) {
  const isLocal = type === "local";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors group ${
        isLocal
          ? "bg-emerald-500/[0.03] border-emerald-500/15 hover:border-emerald-500/30"
          : "bg-blue-500/[0.03] border-blue-500/15 hover:border-blue-500/30"
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        isLocal ? "bg-emerald-500/15 border border-emerald-500/25 text-emerald-400"
               : "bg-blue-500/15 border border-blue-500/25 text-blue-400"
      }`}>
        {c.name[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-white">{c.name}</p>
          {c.country && (
            <span className="text-[10px] text-zinc-500 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-md">
              {c.country}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{c.description}</p>
        {c.website && (
          <p className="text-[10px] text-zinc-600 mt-1 font-mono truncate">{c.website}</p>
        )}
      </div>
    </motion.div>
  );
}

// ── Download helper ───────────────────────────────────────────────────────────
function downloadTxt(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildTxt(result: DiscoveryResult, businessDescription: string, country: string): string {
  const lines: string[] = [
    "═══════════════════════════════════════════════════════",
    "  COMPETITOR DISCOVERY REPORT — MarketPulse AI",
    "═══════════════════════════════════════════════════════",
    "",
    `Business: ${businessDescription}`,
    `Country:  ${country}`,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "───────────────────────────────────────────────────────",
    "  MARKET OVERVIEW",
    "───────────────────────────────────────────────────────",
    result.summary,
    "",
    "───────────────────────────────────────────────────────",
    `  LOCAL COMPETITORS (${result.local.length})`,
    "───────────────────────────────────────────────────────",
    "",
    ...result.local.map((c, i) => [
      `${i + 1}. ${c.name}`,
      `   Country:     ${c.country || country}`,
      `   Website:     ${c.website || "—"}`,
      `   Description: ${c.description}`,
      "",
    ].join("\n")),
    "───────────────────────────────────────────────────────",
    `  GLOBAL COMPETITORS (${result.global.length})`,
    "───────────────────────────────────────────────────────",
    "",
    ...result.global.map((c, i) => [
      `${i + 1}. ${c.name}`,
      `   Country:     ${c.country || "Global"}`,
      `   Website:     ${c.website || "—"}`,
      `   Description: ${c.description}`,
      "",
    ].join("\n")),
    "═══════════════════════════════════════════════════════",
    "  NAMES ONLY — LOCAL",
    "═══════════════════════════════════════════════════════",
    ...result.local.map(c => c.name),
    "",
    "═══════════════════════════════════════════════════════",
    "  NAMES ONLY — GLOBAL",
    "═══════════════════════════════════════════════════════",
    ...result.global.map(c => c.name),
  ];
  return lines.join("\n");
}

// ── Loading stages ────────────────────────────────────────────────────────────
const STAGES = [
  { label: "Searching local market…", icon: "🔍" },
  { label: "Scanning global landscape…", icon: "🌍" },
  { label: "Extracting competitor data…", icon: "⚙️" },
  { label: "Building intelligence report…", icon: "📊" },
];

function LoadingStages() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStage(s => (s + 1) % STAGES.length), 4500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="relative">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-2 border-violet-500/20 border-t-violet-500" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">
          {STAGES[stage].icon}
        </div>
      </div>
      <div className="text-center space-y-2">
        <AnimatePresence mode="wait">
          <motion.p key={stage} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="text-white text-sm font-medium">
            {STAGES[stage].label}
          </motion.p>
        </AnimatePresence>
        <p className="text-zinc-600 text-xs">This usually takes 30–90 seconds</p>
      </div>
      <div className="flex gap-2">
        {STAGES.map((_, i) => (
          <motion.div key={i} animate={{ opacity: i === stage ? 1 : 0.25, scale: i === stage ? 1.2 : 1 }}
            className="w-1.5 h-1.5 rounded-full bg-violet-400" />
        ))}
      </div>
    </div>
  );
}

// ── Main inner page ───────────────────────────────────────────────────────────
function DiscoverInner() {
  const [businessDescription, setBusinessDescription] = useState("");
  const [country, setCountry] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [activeList, setActiveList] = useState<"local" | "global">("local");
  const countryRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredCountries = COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [businessDescription]);

  const step = !businessDescription.trim() ? 1 : !country ? 2 : 3;

  const handleDiscover = async () => {
    if (!businessDescription.trim() || !country) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessDescription: businessDescription.trim(), country }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Discovery failed");
      }
      const data = await res.json();
      setResult(data);
      setActiveList("local");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = businessDescription.trim().length > 10 && country && !loading;

  return (
    <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden border border-white/[0.08] px-8 py-7"
        style={{ background: "linear-gradient(135deg,#0a0f1e 0%,#0d1224 50%,#0f0a1e 100%)" }}>
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)" }} />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(124,58,237,0.08) 0%,transparent 70%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Intelligence Suite</span>
            <span className="text-zinc-700">·</span>
            <span className="text-[10px] font-mono text-blue-500 uppercase tracking-widest">New</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Competitor <span className="text-blue-400">Discovery</span>
          </h1>
          <p className="text-zinc-500 text-sm max-w-lg">
            Describe what your business does and select your country. We'll scrape the web to find your local and global competitors, then let you download the full list.
          </p>
        </div>
      </motion.div>

      {/* Step indicator */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="flex items-center gap-3">
        <StepDot n={1} active={step === 1} done={step > 1} />
        <div className={`h-px flex-1 transition-colors ${step > 1 ? "bg-emerald-500/30" : "bg-white/[0.06]"}`} />
        <StepDot n={2} active={step === 2} done={step > 2} />
        <div className={`h-px flex-1 transition-colors ${step > 2 ? "bg-emerald-500/30" : "bg-white/[0.06]"}`} />
        <StepDot n={3} active={step === 3} done={false} />
        <div className="h-px flex-1 bg-white/[0.06]" />
        <StepDot n={4} active={false} done={!!result} />
      </motion.div>
      <div className="flex text-[10px] text-zinc-600 px-0.5 -mt-3">
        <span className="flex-1">Describe business</span>
        <span className="flex-1 text-center">Select country</span>
        <span className="flex-1 text-center">Discover</span>
        <span className="flex-1 text-right">Results</span>
      </div>

      {/* Input form */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-4">

        {/* Business description */}
        <div>
          <label className="block text-zinc-500 text-[10px] uppercase tracking-wider mb-2 font-medium">
            What does your business do? *
          </label>
          <textarea ref={textareaRef} value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            placeholder="e.g. We build a SaaS platform for HR teams to manage employee onboarding, payroll, and performance reviews for mid-sized companies…"
            rows={3}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors resize-none leading-relaxed"
          />
          <p className="text-zinc-700 text-[10px] mt-1 ml-1">{businessDescription.length} chars — more detail = better results</p>
        </div>

        {/* Country selector */}
        <div ref={countryRef} className="relative">
          <label className="block text-zinc-500 text-[10px] uppercase tracking-wider mb-2 font-medium">
            Your Country *
          </label>
          <button onClick={() => setShowCountryDropdown(o => !o)}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-colors text-left ${
              country ? "text-white border-white/[0.12] bg-white/[0.04]" : "text-zinc-600 border-white/[0.08] bg-white/[0.04]"
            } ${showCountryDropdown ? "border-blue-500/40" : ""}`}>
            <span>{country || "Select your country…"}</span>
            <motion.div animate={{ rotate: showCountryDropdown ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
          </button>

          <AnimatePresence>
            {showCountryDropdown && (
              <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#0e0e12] border border-white/[0.1] rounded-xl overflow-hidden shadow-2xl">
                <div className="p-2 border-b border-white/[0.06]">
                  <input autoFocus value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search countries…"
                    className="w-full bg-white/[0.04] px-3 py-2 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none border border-white/[0.06] focus:border-blue-500/30 transition-colors"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredCountries.length === 0 ? (
                    <p className="text-zinc-600 text-xs text-center py-4">No countries found</p>
                  ) : (
                    filteredCountries.map(c => (
                      <button key={c} onClick={() => { setCountry(c); setCountrySearch(""); setShowCountryDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.04] ${
                          country === c ? "text-blue-400 bg-blue-500/[0.06]" : "text-zinc-300"
                        }`}>
                        {c}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Discover button */}
        <motion.button
          whileHover={{ scale: canSubmit ? 1.01 : 1 }} whileTap={{ scale: canSubmit ? 0.98 : 1 }}
          onClick={handleDiscover} disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              Discovering competitors…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Discover Competitors
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <span>⚠</span> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="border border-white/[0.07] rounded-2xl bg-white/[0.02] overflow-hidden">
            <div className="border-b border-white/[0.05] px-5 py-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-xs text-zinc-400 font-mono">Running Apify scrapers + AI extraction…</p>
            </div>
            <LoadingStages />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Summary card */}
            <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/[0.04]">
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2 font-medium">Market Overview</p>
              <p className="text-zinc-300 text-sm leading-relaxed">{result.summary}</p>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06]">
                <span className="text-xs text-emerald-400">
                  <span className="font-bold font-mono">{result.local.length}</span> local competitors
                </span>
                <span className="text-zinc-700">·</span>
                <span className="text-xs text-blue-400">
                  <span className="font-bold font-mono">{result.global.length}</span> global competitors
                </span>
                <span className="text-zinc-700">·</span>
                <span className="text-xs text-zinc-500">{country}</span>
              </div>
            </div>

            {/* Download buttons */}
            <div className="flex flex-wrap gap-2">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => downloadTxt(buildTxt(result, businessDescription, country), `competitors-full-${country.toLowerCase().replace(/\s/g, "-")}.txt`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] text-zinc-300 text-xs font-medium transition-colors">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v8M5 7l3 3 3-3M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Download Full Report (.txt)
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => downloadTxt(result.local.map(c => c.name).join("\n"), `local-competitors-${country.toLowerCase().replace(/\s/g, "-")}.txt`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-medium transition-colors">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v8M5 7l3 3 3-3M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Local Names (.txt)
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => downloadTxt(result.global.map(c => c.name).join("\n"), `global-competitors.txt`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-medium transition-colors">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v8M5 7l3 3 3-3M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Global Names (.txt)
              </motion.button>

              {/* Add all to watchlist hint */}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const all = [...result.local, ...result.global].map(c => c.name).join("\n");
                  downloadTxt(all, `all-competitors-${country.toLowerCase().replace(/\s/g, "-")}.txt`);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/25 text-violet-300 text-xs font-medium transition-colors">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v8M5 7l3 3 3-3M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                All Names (.txt) — import to watchlist
              </motion.button>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.07] rounded-xl w-fit">
              <button onClick={() => setActiveList("local")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all relative ${activeList === "local" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                {activeList === "local" && <motion.div layoutId="listTab" className="absolute inset-0 bg-emerald-500/10 rounded-lg border border-emerald-500/20" />}
                <span className="relative z-10 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  Local · {result.local.length}
                </span>
              </button>
              <button onClick={() => setActiveList("global")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all relative ${activeList === "global" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                {activeList === "global" && <motion.div layoutId="listTab" className="absolute inset-0 bg-blue-500/10 rounded-lg border border-blue-500/20" />}
                <span className="relative z-10 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                  Global · {result.global.length}
                </span>
              </button>
            </div>

            {/* Competitor list */}
            <AnimatePresence mode="wait">
              {activeList === "local" && (
                <motion.div key="local" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Local Competitors</p>
                      <p className="text-zinc-600 text-xs">Companies operating in {country} in your space</p>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full font-medium">
                      {result.local.length} found
                    </span>
                  </div>
                  {result.local.length === 0 ? (
                    <p className="text-zinc-600 text-xs text-center py-8">No local competitors found. Try a more detailed business description.</p>
                  ) : (
                    result.local.map((c, i) => <CompetitorCard key={i} c={c} i={i} type="local" />)
                  )}
                </motion.div>
              )}

              {activeList === "global" && (
                <motion.div key="global" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Global Competitors</p>
                      <p className="text-zinc-600 text-xs">International companies competing in your space</p>
                    </div>
                    <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full font-medium">
                      {result.global.length} found
                    </span>
                  </div>
                  {result.global.length === 0 ? (
                    <p className="text-zinc-600 text-xs text-center py-8">No global competitors found. Try a more detailed business description.</p>
                  ) : (
                    result.global.map((c, i) => <CompetitorCard key={i} c={c} i={i} type="global" />)
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tip: import to watchlist */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-500/[0.05] border border-violet-500/15">
              <span className="text-violet-400 text-base flex-shrink-0">💡</span>
              <div>
                <p className="text-violet-300 text-xs font-medium">Import to Watchlist</p>
                <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">
                  Download the "All Names" .txt file and use the <strong className="text-zinc-400">Upload .txt</strong> button on your Dashboard to instantly add all discovered competitors to your watchlist for live analysis.
                </p>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!result && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-3xl">🌍</div>
          <p className="text-zinc-400 text-sm font-medium">Describe your business to get started</p>
          <p className="text-zinc-600 text-xs max-w-[300px]">
            We'll search the web using Apify to find companies competing in your space — both locally in your country and globally.
          </p>
        </motion.div>
      )}

    </main>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-[#070709] text-white">
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: `linear-gradient(#a78bfa 1px,transparent 1px),linear-gradient(90deg,#a78bfa 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
      <div className="fixed top-0 right-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(59,130,246,0.04) 0%,transparent 70%)" }} />

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070709]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-xs">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L4 8l6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Dashboard
            </a>
            <span className="text-zinc-700">/</span>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[10px]">🌍</div>
              <span className="font-semibold text-sm">Discover Competitors</span>
            </div>
          </div>
          <a href="/strategy-analyzer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/25 bg-violet-500/10 text-violet-300 text-xs hover:bg-violet-500/20 transition-colors">
            <span>🧠</span> Strategy Analyzer
          </a>
        </div>
      </nav>

      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500" />
        </div>
      }>
        <DiscoverInner />
      </Suspense>
    </div>
  );
}