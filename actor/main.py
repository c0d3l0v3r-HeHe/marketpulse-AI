# ═══════════════════════════════════════════════════════
# CREDIT COST GUIDE (you have $100 credits)
# ─────────────────────────────────────────────────────
# Testing (max_results=5)  → ~$0.02 per run  ✅ Use this
# Small demo (results=10)  → ~$0.05 per run  ✅ Safe
# Full demo  (results=20)  → ~$0.10 per run  ✅ Fine
# Large run  (results=50)  → ~$0.25 per run  ⚠️ Only for final
#
# Bottom line: with $100 credits you can run 500+ full demos!
# ═══════════════════════════════════════════════════════

"""
MarketPulse AI - Apify Actor
Tracks competitors, monitors prices, and generates market intelligence reports
using Apify scrapers + OpenRouter LLM.
"""

import asyncio
import json
import os
from dotenv import load_dotenv
from apify_client import ApifyClient
from openai import OpenAI

# Load .env file
load_dotenv()

# ── Apify + OpenRouter clients ──────────────────────────────────────────────
APIFY_TOKEN = os.environ.get("APIFY_TOKEN", "YOUR_APIFY_TOKEN")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "YOUR_OPENROUTER_KEY")

apify = ApifyClient(APIFY_TOKEN)
llm = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

# ── Step 1: Scrape competitor data via Apify ─────────────────────────────────
def scrape_google_shopping(query: str, max_results: int = 5) -> list[dict]:
    """
    Uses official Apify Google Search scraper to find product prices.
    Actor: apify/google-search-scraper (FREE - no rental needed)

    Cost: ~$0.002 per query (first 10 results free per search!)
    Searches Google for shopping results using a price-focused query.
    """
    print(f"Scraping Google for prices: '{query}' (max {max_results} results)...")

    # Search Google with shopping-focused query to get price data
    run_input = {
        "queries": f"{query} price buy",
        "maxPagesPerQuery": 1,        # 1 page = ~10 results, minimal cost
        "resultsPerPage": 10,
        "countryCode": "us",
        "languageCode": "en",
        "includeUnfilteredResults": False,
    }

    run = apify.actor("apify/google-search-scraper").call(run_input=run_input)
    items = []

    for item in apify.dataset(run["defaultDatasetId"]).iterate_items():
        # Extract organic results which contain product/price info
        for result in item.get("organicResults", [])[:max_results]:
            items.append({
                "title": result.get("title", "N/A"),
                "price": result.get("price", result.get("description", "N/A")),
                "seller": result.get("displayedUrl", "N/A"),
                "rating": result.get("rating", "N/A"),
                "reviews": result.get("reviewsCount", "N/A"),
                "url": result.get("url", "N/A"),
            })

    print(f"Found {len(items)} results.")
    return items

def scrape_google_search(query: str, max_results: int = 5) -> list[dict]:
    """
    Uses Apify's Google Search scraper for news/competitor mentions.
    Actor: apify/google-search-scraper

    Cost: ~$0.01 per run at default max_results=5
    """
    print(f"🔍  Scraping Google Search for: '{query}'...")

    run_input = {
        "queries": query,
        "maxPagesPerQuery": 1,
        "resultsPerPage": max_results,
        "languageCode": "en",
    }

    run = apify.actor("apify/google-search-scraper").call(run_input=run_input)
    items = []

    for item in apify.dataset(run["defaultDatasetId"]).iterate_items():
        for result in item.get("organicResults", []):
            items.append({
                "title": result.get("title", "N/A"),
                "description": result.get("description", "N/A"),
                "url": result.get("url", "N/A"),
            })

    print(f"✅  Found {len(items)} search results.")
    return items


# ── Step 2: Analyze data with LLM via OpenRouter ────────────────────────────
def analyze_market_data(
    product_query: str,
    shopping_data: list[dict],
    search_data: list[dict],
) -> dict:
    """
    Sends scraped data to an LLM via OpenRouter for deep analysis.
    Returns structured market intelligence report.
    """
    print("🤖  Analyzing data with LLM...")

    shopping_json = json.dumps(shopping_data[:15], indent=2)
    search_json = json.dumps(search_data[:8], indent=2)

    prompt = f"""
You are a senior market intelligence analyst. Analyze the following live web data 
for the product/market: "{product_query}"

## Live Shopping Data (prices, sellers, ratings):
{shopping_json}

## Latest Web Mentions & News:
{search_json}

Generate a structured market intelligence report in JSON format with these exact keys:
{{
  "market_summary": "2-3 sentence overview of the market",
  "price_analysis": {{
    "lowest_price": "...",
    "highest_price": "...",
    "average_price": "...",
    "price_trend": "rising/falling/stable"
  }},
  "top_competitors": [
    {{"name": "...", "price": "...", "strength": "...", "weakness": "..."}}
  ],
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "alerts": ["alert 1 if any significant finding"],
  "recommendation": "One clear actionable recommendation"
}}

Return ONLY valid JSON, no markdown, no explanation.
"""

    response = llm.chat.completions.create(
        model="openai/gpt-4o-mini",  # Cost-effective via OpenRouter
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    raw = response.choices[0].message.content.strip()

    # Clean up JSON if wrapped in markdown
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw)


# ── Step 3: Format final report ──────────────────────────────────────────────
def format_report(query: str, analysis: dict, shopping_data: list[dict]) -> str:
    """Formats the analysis into a clean markdown report."""

    pa = analysis.get("price_analysis", {})
    competitors = analysis.get("top_competitors", [])
    insights = analysis.get("key_insights", [])
    opportunities = analysis.get("opportunities", [])
    alerts = analysis.get("alerts", [])

    competitor_table = "\n".join([
        f"| {c.get('name','N/A')} | {c.get('price','N/A')} | {c.get('strength','N/A')} | {c.get('weakness','N/A')} |"
        for c in competitors
    ])

    report = f"""
# 📊 MarketPulse AI Report
**Query:** {query}

---

## 🌍 Market Summary
{analysis.get('market_summary', 'N/A')}

---

## 💰 Price Analysis
| Metric | Value |
|--------|-------|
| Lowest Price | {pa.get('lowest_price', 'N/A')} |
| Highest Price | {pa.get('highest_price', 'N/A')} |
| Average Price | {pa.get('average_price', 'N/A')} |
| Price Trend | {pa.get('price_trend', 'N/A')} |

---

## 🏆 Top Competitors
| Seller | Price | Strength | Weakness |
|--------|-------|----------|----------|
{competitor_table}

---

## 💡 Key Insights
{chr(10).join(f"- {i}" for i in insights)}

---

## 🚀 Opportunities
{chr(10).join(f"- {o}" for o in opportunities)}

---

## ⚠️ Alerts
{chr(10).join(f"- {a}" for a in alerts) if alerts else "- No critical alerts"}

---

## ✅ Recommendation
{analysis.get('recommendation', 'N/A')}

---
*Generated by MarketPulse AI Actor | Powered by Apify + OpenRouter*
"""
    return report.strip()


# ── Main Actor entrypoint ────────────────────────────────────────────────────
def run_actor(product_query: str, max_results: int = 5) -> dict:
    """
    Full pipeline: scrape → analyze → report
    This is the main function called by the Apify Actor.
    """
    print(f"\n🚀 MarketPulse AI starting for: '{product_query}'\n{'='*50}")

    # 1. Scrape live data
    shopping_data = scrape_google_shopping(product_query, max_results)
    search_data = scrape_google_search(f"{product_query} market news competitors 2026")

    # 2. AI analysis
    analysis = analyze_market_data(product_query, shopping_data, search_data)

    # 3. Format report
    report_md = format_report(product_query, analysis, shopping_data)

    # 4. Final output
    output = {
        "query": product_query,
        "raw_shopping_data": shopping_data,
        "raw_search_data": search_data,
        "analysis": analysis,
        "report_markdown": report_md,
    }

    print("\n📋 REPORT GENERATED:\n")
    print(report_md)

    return output


# ── Run locally for testing ──────────────────────────────────────────────────
if __name__ == "__main__":
    # Change this to test with any product/market
    # TEST MODE: max_results=5 costs ~$0.02 per run
    # For final demo, increase to 20 (~$0.10 per run)
    result = run_actor("wireless noise cancelling headphones", max_results=5)

    # Save output locally
    with open("output.json", "w") as f:
        json.dump(result, f, indent=2)
    with open("report.md", "w") as f:
        f.write(result["report_markdown"])

    print("\n✅ Done! Check output.json and report.md")