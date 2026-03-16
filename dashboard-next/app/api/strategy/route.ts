import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

function getUser(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { strategy, competitorContext, intelligenceBlock } = await req.json();
  if (!strategy?.trim()) return NextResponse.json({ message: "Strategy is required" }, { status: 400 });

  const systemPrompt = `You are a senior strategic analyst and competitive intelligence expert.
Analyze business strategies with deep market knowledge, citing real examples, research, and market data.
Always respond ONLY with valid JSON — no preamble, no markdown fences, no explanation outside the JSON:
{
  "overallScore": <number 0-100>,
  "verdict": <"Strong"|"Moderate"|"Weak"|"Risky">,
  "summary": <2-3 sentence executive summary>,
  "effectiveness": [
    { "dimension": <string>, "score": <number 0-100>, "reasoning": <1-2 sentences> }
  ],
  "supportingEvidence": [
    { "point": <evidence statement>, "source": <real company/research/data source>, "strength": <"Strong"|"Moderate"|"Weak"> }
  ],
  "risks": [<3-5 specific risk strings>],
  "opportunities": [<3-5 specific opportunity strings>],
  "competitorContext": <how this strategy positions against the competitor data provided, or empty string if none>,
  "finalOpinion": <3-5 paragraph honest opinionated assessment with specific real-world parallels>
}
Include 4-6 effectiveness dimensions (e.g. Market Fit, Execution Difficulty, Competitive Moat, Financial Viability, Timing, Customer Acquisition).
Include 4-6 pieces of supporting evidence with real company examples or research.
If competitor intelligence is provided in the user message, deeply reference it in your analysis.`;

  const userMsg = [
    intelligenceBlock
      ? `=== COMPETITOR INTELLIGENCE (use this to contextualize your analysis) ===\n${intelligenceBlock}\n===`
      : "",
    `Strategy to analyze: "${strategy}"`,
    competitorContext ? `Additional context: ${competitorContext}` : "",
  ].filter(Boolean).join("\n\n");

  try {
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        max_tokens: 1500,
      }),
    });

    if (!llmRes.ok) {
      const err = await llmRes.text();
      console.error("OpenRouter error:", err);
      return NextResponse.json({ message: "AI analysis failed" }, { status: 500 });
    }

    const llmData = await llmRes.json();
    const raw = llmData.choices?.[0]?.message?.content ?? "";

    if (!raw) return NextResponse.json({ message: "Empty response from AI" }, { status: 500 });

    // Strip any accidental markdown fences before parsing
    const clean = raw.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(clean);

    return NextResponse.json({ analysis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Strategy analysis error:", message);
    return NextResponse.json({ message: "Analysis failed: " + message }, { status: 500 });
  }
}