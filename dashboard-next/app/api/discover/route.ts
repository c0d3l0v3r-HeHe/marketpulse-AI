import { NextRequest, NextResponse } from "next/server";
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

async function apifySearch(query: string): Promise<string> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120&waitForFinish=120`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries: query,
        maxPagesPerQuery: 1,
        resultsPerPage: 10,
        languageCode: "en",
        countryCode: "us",
      }),
      signal: AbortSignal.timeout(130_000),
    }
  );
  if (!res.ok) return "";
  const items = await res.json();
  return (Array.isArray(items) ? items : [])
    .flatMap((item: { organicResults?: { title: string; snippet: string }[] }) => item.organicResults ?? [])
    .slice(0, 8)
    .map((r: { title: string; snippet: string }) => `Title: ${r.title}\nSnippet: ${r.snippet}`)
    .join("\n\n");
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { businessDescription, country } = await req.json();
  if (!businessDescription?.trim()) return NextResponse.json({ message: "Business description is required" }, { status: 400 });
  if (!country?.trim()) return NextResponse.json({ message: "Country is required" }, { status: 400 });

  try {
    // Run both searches in parallel using the synchronous Apify endpoint
    const [localResults, globalResults] = await Promise.all([
      apifySearch(`competitors "${country}" ${businessDescription} companies 2025 2026`),
      apifySearch(`global competitors ${businessDescription} top companies worldwide 2025 2026`),
    ]);

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
            content: `You are a competitive intelligence expert. Extract and identify competitor companies from search results.
Return ONLY valid JSON with no preamble, no markdown fences:
{
  "local": [
    { "name": <company name>, "description": <1 sentence what they do>, "website": <domain or empty string>, "country": <country> }
  ],
  "global": [
    { "name": <company name>, "description": <1 sentence what they do>, "website": <domain or empty string>, "country": <headquarters country> }
  ],
  "summary": <2-3 sentence overview of the competitive landscape>
}
Extract 5-10 local competitors and 5-10 global competitors. Only include real identifiable companies. Do not duplicate between local and global lists.`,
          },
          {
            role: "user",
            content: `Business: ${businessDescription}\nCountry: ${country}\n\n=== LOCAL SEARCH RESULTS ===\n${localResults || "No results."}\n\n=== GLOBAL SEARCH RESULTS ===\n${globalResults || "No results."}`,
          },
        ],
        max_tokens: 1500,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!llmRes.ok) {
      const err = await llmRes.text();
      console.error("OpenRouter error:", err);
      return NextResponse.json({ message: "AI extraction failed" }, { status: 500 });
    }

    const llmData = await llmRes.json();
    const raw = llmData.choices?.[0]?.message?.content ?? "";
    if (!raw) return NextResponse.json({ message: "Empty AI response" }, { status: 500 });

    const clean = raw.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    return NextResponse.json({
      local: result.local ?? [],
      global: result.global ?? [],
      summary: result.summary ?? "",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Competitor discovery error:", message);
    return NextResponse.json({ message: "Discovery failed: " + message }, { status: 500 });
  }
}