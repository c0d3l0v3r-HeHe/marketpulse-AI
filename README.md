# 📊 MarketPulse AI
> AI-powered competitor & price intelligence agent — built for GenAI Zürich Hackathon 2026

[![Apify](https://img.shields.io/badge/Powered%20by-Apify-brightgreen)](https://apify.com)
[![OpenRouter](https://img.shields.io/badge/LLM-OpenRouter-blue)](https://openrouter.ai)
[![Python](https://img.shields.io/badge/Python-3.11+-yellow)](https://python.org)

---

## 🎯 What It Does

MarketPulse AI is a fully autonomous **Apify Actor** that:

1. 🕷️ **Scrapes** live competitor prices and product data from Google Shopping
2. 🔍 **Monitors** competitor mentions and market news via Google Search
3. 🤖 **Analyzes** all data using an LLM (via OpenRouter)
4. 📊 **Generates** a structured market intelligence report — instantly

---

## 🏗️ Architecture

```
User Input (product/market query)
        ↓
  Apify Actor (serverless, reusable)
        ↓
┌─────────────────────────────────────┐
│ Step 1: Google Shopping Scraper     │ ← Live prices & sellers
│ Step 2: Google Search Scraper       │ ← Market news & mentions  
│ Step 3: LLM Analysis (OpenRouter)   │ ← GPT-4o-mini analysis
│ Step 4: Structured Report           │ ← JSON + Markdown output
└─────────────────────────────────────┘
        ↓
  Apify Dataset (results stored)
+ Streamlit Dashboard (visual demo)
```

---

## 🚀 Quick Start

### 1. Clone & install
```bash
git clone https://github.com/YOUR_USERNAME/marketpulse-ai
cd marketpulse-ai
pip install -r actor/requirements.txt
pip install streamlit  # for dashboard only
```

### 2. Set environment variables
```bash
export APIFY_TOKEN="your_apify_token"
export OPENROUTER_API_KEY="your_openrouter_key"
```

### 3. Run locally
```bash
cd actor
python main.py
```

### 4. Run the dashboard
```bash
cd dashboard
streamlit run dashboard.py
```

---

## 🌐 Run as Apify Actor

1. Go to [console.apify.com](https://console.apify.com)
2. Create a new Actor → upload this code
3. Set input: `{ "productQuery": "wireless headphones", "maxResults": 20 }`
4. Run and view results in the dataset

---

## 📦 Input Schema

| Field | Type | Description |
|-------|------|-------------|
| `productQuery` | string | Product/market to analyze (e.g. "wireless headphones") |
| `maxResults` | integer | Max products to scrape (5–50, default: 20) |

---

## 📤 Output

```json
{
  "query": "wireless headphones",
  "analysis": {
    "market_summary": "...",
    "price_analysis": { "lowest": "$49", "highest": "$449", "trend": "stable" },
    "top_competitors": [...],
    "key_insights": [...],
    "opportunities": [...],
    "alerts": [...],
    "recommendation": "..."
  },
  "report_markdown": "# MarketPulse AI Report..."
}
```

---

## 🛠️ Tech Stack

| Component | Tool |
|-----------|------|
| Actor platform | Apify |
| Web scraping | Apify Google Shopping & Search scrapers |
| LLM | GPT-4o-mini via OpenRouter |
| Language | Python 3.11+ |
| Dashboard | Streamlit |

---

## ⚖️ Ethics & Compliance

- Only scrapes **publicly available** product and search data
- No PII or personal data collected
- GDPR & FADP compliant
- Respects robots.txt via Apify's managed scrapers

---

*Built for GenAI Zürich Hackathon 2026 — Apify Challenge*
