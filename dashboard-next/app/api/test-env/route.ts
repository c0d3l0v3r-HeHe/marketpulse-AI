import { NextResponse } from "next/server";

export async function GET() {
  const apifyToken = process.env.APIFY_TOKEN;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  // Test Apify token
  let apifyStatus = "not tested";
  if (!apifyToken) {
    apifyStatus = "❌ APIFY_TOKEN is undefined";
  } else {
    try {
      const res = await fetch(`https://api.apify.com/v2/users/me?token=${apifyToken}`);
      const data = await res.json();
      apifyStatus = res.ok
        ? `✅ Valid — user: ${data.data?.username ?? "unknown"}`
        : `❌ Invalid token — ${res.status}: ${JSON.stringify(data).slice(0, 100)}`;
    } catch (e) {
      apifyStatus = `❌ Network error: ${e}`;
    }
  }

  // Test OpenRouter key
  let openrouterStatus = "not tested";
  if (!openrouterKey) {
    openrouterStatus = "❌ OPENROUTER_API_KEY is undefined";
  } else {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${openrouterKey}` },
      });
      openrouterStatus = res.ok
        ? `✅ Valid — status ${res.status}`
        : `❌ Invalid key — status ${res.status}`;
    } catch (e) {
      openrouterStatus = `❌ Network error: ${e}`;
    }
  }

  return NextResponse.json({
    apify: apifyStatus,
    openrouter: openrouterStatus,
    env_file_loaded: !!apifyToken && !!openrouterKey,
  });
}