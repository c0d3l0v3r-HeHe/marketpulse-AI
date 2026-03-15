import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Competitor from "@/lib/models/Competitor";
import ActivityLog from "@/lib/models/ActivityLog";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
const APIFY_TOKEN = process.env.APIFY_TOKEN as string;

function getUser(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch { return null; }
}

function parseReport(markdown: string) {
  const lines = markdown.split("\n").map(l => l.trim()).filter(Boolean);
  const summaryLines: string[] = [];
  let inSummary = false;
  for (const line of lines) {
    if (line.startsWith("##") && line.toLowerCase().includes("summary")) { inSummary = true; continue; }
    if (inSummary) { if (line.startsWith("#")) break; summaryLines.push(line); }
  }
  const summary = summaryLines.join(" ").slice(0, 300) || "Analysis complete.";
  let sentiment = "Neutral", sentimentScore = 0.5;
  const sm = markdown.match(/sentiment[:\s]+([A-Za-z]+)/i);
  if (sm) {
    const s = sm[1].toLowerCase();
    if (s.includes("positive")) { sentiment = "Positive"; sentimentScore = 0.75; }
    else if (s.includes("negative")) { sentiment = "Negative"; sentimentScore = 0.25; }
  }
  const topPrices = lines.filter(l => l.includes("$") && l.length < 200).slice(0, 4).map(l => ({
    title: l.replace(/\*+/g, "").slice(0, 80),
    price: (l.match(/\$[\d,]+(?:\.\d{2})?/) ?? ["N/A"])[0],
    url: "",
  }));
  const keyInsights = lines
    .filter(l => l.startsWith("-") || l.startsWith("•") || l.startsWith("*"))
    .map(l => l.replace(/^[-•*]\s*/, "").replace(/\*+/g, "").trim())
    .filter(l => l.length > 10 && l.length < 200).slice(0, 5);
  let recommendation = "";
  const ri = lines.findIndex(l => l.toLowerCase().includes("recommendation"));
  if (ri !== -1 && lines[ri + 1]) recommendation = lines[ri + 1].replace(/\*+/g, "").trim().slice(0, 200);
  return { summary, sentiment, sentimentScore, topPrices, keyInsights, recommendation, rawMarkdown: markdown };
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { competitorId, name, force } = await req.json();
  if (!competitorId || !name) return NextResponse.json({ message: "competitorId and name required" }, { status: 400 });

  // ── Validate env vars first ───────────────────────────────────────────────
  if (!APIFY_TOKEN) {
    console.error("[ANALYZE] ❌ APIFY_TOKEN is not set in .env.local");
    return NextResponse.json({ message: "APIFY_TOKEN not configured" }, { status: 500 });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("[ANALYZE] ❌ OPENROUTER_API_KEY is not set in .env.local");
    return NextResponse.json({ message: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  console.log(`[ANALYZE] Starting analysis for "${name}" (force=${force})`);

  await connectDB();

  const competitor = await Competitor.findOne({ _id: competitorId, userId: user.userId });
  if (!competitor) return NextResponse.json({ message: "Competitor not found" }, { status: 404 });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (!force && competitor.lastAnalyzed && competitor.lastAnalyzed > oneHourAgo) {
    console.log(`[ANALYZE] Skipping "${name}" — analyzed recently`);
    return NextResponse.json({ message: "Already analyzed within the last hour", skipped: true });
  }

  await ActivityLog.create({ userId: user.userId, competitorId, competitorName: name, status: "running", message: `Analysis started for "${name}"` });

  try {
    // ── Step 1: Trigger Apify ─────────────────────────────────────────────
    console.log(`[ANALYZE] Triggering Apify for "${name}"...`);
    const runRes = await fetch(`https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=${APIFY_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries: `${name} competitor market price analysis 2026`,
        maxPagesPerQuery: 1,
        resultsPerPage: 10,
        languageCode: "en",
        countryCode: "us",
      }),
    });

    const runText = await runRes.text();
    console.log(`[ANALYZE] Apify trigger status: ${runRes.status}, body: ${runText.slice(0, 200)}`);

    if (!runRes.ok) throw new Error(`Apify trigger failed (${runRes.status}): ${runText.slice(0, 200)}`);

    const runData = JSON.parse(runText);
    const runId = runData.data?.id;
    if (!runId) throw new Error(`No run ID from Apify. Response: ${runText.slice(0, 200)}`);

    console.log(`[ANALYZE] Apify run started: ${runId}`);

    // ── Step 2: Poll until done ───────────────────────────────────────────
    let status = "RUNNING";
    let attempts = 0;
    while (status === "RUNNING" || status === "READY") {
      if (attempts++ > 18) throw new Error("Apify run timed out after 90s");
      await new Promise(r => setTimeout(r, 5000));
      const s = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
      const sData = await s.json();
      status = sData.data?.status ?? "FAILED";
      console.log(`[ANALYZE] Poll ${attempts}: status=${status}`);
    }
    if (status !== "SUCCEEDED") throw new Error(`Apify run ended with status: ${status}`);

    // ── Step 3: Fetch results ─────────────────────────────────────────────
    console.log(`[ANALYZE] Fetching dataset for run ${runId}...`);
    const datasetRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=10`);
    const items = await datasetRes.json();
    const searchResults = (Array.isArray(items) ? items : [])
      .flatMap((item: { organicResults?: { title: string; snippet: string; url: string }[] }) => item.organicResults ?? [])
      .slice(0, 8)
      .map((r: { title: string; snippet: string }) => `Title: ${r.title}\nSnippet: ${r.snippet}`)
      .join("\n\n");

    console.log(`[ANALYZE] Got ${searchResults.length} chars of search results`);

    // ── Step 4: LLM analysis ──────────────────────────────────────────────
    console.log(`[ANALYZE] Calling OpenRouter LLM...`);
    const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://marketpulse.ai",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a market intelligence analyst. Return a structured markdown report with these exact sections:\n## Summary\n(2-3 sentence overview)\n## Sentiment\n(one word: Positive / Negative / Neutral, then brief reason)\n## Key Prices\n(bullet list of prices found)\n## Key Insights\n(5 bullet points)\n## Recommendation\n(1 actionable sentence)`,
          },
          {
            role: "user",
            content: `Competitor: ${name}\n\nSearch results:\n${searchResults || "No results — provide general analysis based on your knowledge."}`,
          },
        ],
        max_tokens: 800,
      }),
    });

    const llmText = await llmRes.text();
    console.log(`[ANALYZE] LLM status: ${llmRes.status}, response: ${llmText.slice(0, 300)}`);

    if (!llmRes.ok) throw new Error(`LLM failed (${llmRes.status}): ${llmText.slice(0, 200)}`);

    const llmData = JSON.parse(llmText);
    const markdown = llmData.choices?.[0]?.message?.content ?? "Analysis unavailable.";
    const report = parseReport(markdown);

    // ── Step 5: Save to MongoDB ───────────────────────────────────────────
    await Competitor.findByIdAndUpdate(competitorId, { lastAnalyzed: new Date(), latestReport: report });
    await ActivityLog.create({ userId: user.userId, competitorId, competitorName: name, status: "success", message: `Analysis complete for "${name}" — sentiment: ${report.sentiment}` });

    console.log(`[ANALYZE] ✅ Done for "${name}" — sentiment: ${report.sentiment}`);
    return NextResponse.json({ success: true, report });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[ANALYZE] ❌ Error for "${name}":`, message);
    await ActivityLog.create({ userId: user.userId, competitorId, competitorName: name, status: "error", message: `Failed: ${message}` });
    return NextResponse.json({ message }, { status: 500 });
  }
}