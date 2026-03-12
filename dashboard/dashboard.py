"""
MarketPulse AI - Streamlit Dashboard
A clean UI to demo the Apify Actor results for the hackathon judges.
Run with: streamlit run dashboard.py
"""

import streamlit as st
import json
import os
import sys

# Add actor directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'actor'))

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="MarketPulse AI",
    page_icon="📊",
    layout="wide",
)

# ── Header ───────────────────────────────────────────────────────────────────
st.markdown("""
    <h1 style='text-align:center; color:#6C63FF;'>📊 MarketPulse AI</h1>
    <p style='text-align:center; color:gray; font-size:1.1rem;'>
        AI-powered competitor & price intelligence — powered by Apify + OpenRouter
    </p>
    <hr/>
""", unsafe_allow_html=True)

# ── Sidebar inputs ────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Configuration")
    st.markdown("---")

    apify_token = st.text_input("🔑 Apify API Token", type="password",
                                 help="Get from console.apify.com/account/integrations")
    openrouter_key = st.text_input("🤖 OpenRouter API Key", type="password",
                                    help="Get from openrouter.ai/keys")
    st.markdown("---")

    product_query = st.text_input(
        "🔍 Product / Market to Analyze",
        value="wireless noise cancelling headphones",
        placeholder="e.g. 'project management SaaS', 'electric bikes'"
    )
    max_results = st.slider("📦 Max Products to Scrape", 5, 50, 20)
    st.markdown("---")

    run_btn = st.button("🚀 Run Analysis", type="primary", use_container_width=True)

    st.markdown("---")
    st.markdown("### 📂 Or Load Sample Output")
    load_sample = st.button("Load Sample Report", use_container_width=True)

# ── Load sample data for demo ─────────────────────────────────────────────────
SAMPLE_ANALYSIS = {
    "market_summary": "The wireless noise-cancelling headphones market is highly competitive with major players like Sony, Bose, and Apple dominating. Premium segment prices range from $250–$450 with strong consumer demand driven by remote work trends.",
    "price_analysis": {
        "lowest_price": "$49.99",
        "highest_price": "$449.99",
        "average_price": "$187.50",
        "price_trend": "stable"
    },
    "top_competitors": [
        {"name": "Sony WH-1000XM5", "price": "$349.99", "strength": "Best-in-class ANC", "weakness": "Premium price point"},
        {"name": "Bose QuietComfort 45", "price": "$329.99", "strength": "Comfort & brand trust", "weakness": "Older design"},
        {"name": "Apple AirPods Max", "price": "$449.99", "strength": "Apple ecosystem", "weakness": "Very expensive"},
        {"name": "Anker Soundcore Q45", "price": "$59.99", "strength": "Budget-friendly", "weakness": "ANC quality"},
    ],
    "key_insights": [
        "Sony and Bose capture 60%+ of premium market share",
        "Budget segment ($50–$100) is growing rapidly with Asian brands",
        "Battery life (30+ hrs) is now a baseline consumer expectation",
    ],
    "opportunities": [
        "Mid-range gap ($150–$250) is underserved with quality options",
        "Gaming-focused ANC headphones is an emerging niche",
    ],
    "alerts": [
        "Sony WH-1000XM6 rumored for Q2 2026 — could shift pricing",
    ],
    "recommendation": "Target the $150–$200 price range with 35hr battery and multipoint connection to capture the underserved mid-market segment."
}

# ── Main content ──────────────────────────────────────────────────────────────
if load_sample:
    st.success("✅ Loaded sample report for: 'wireless noise cancelling headphones'")
    analysis = SAMPLE_ANALYSIS
    query = "wireless noise cancelling headphones"
    show_results = True
elif run_btn:
    if not apify_token or not openrouter_key:
        st.error("⚠️ Please enter your Apify Token and OpenRouter API Key in the sidebar.")
        show_results = False
    else:
        os.environ["APIFY_TOKEN"] = apify_token
        os.environ["OPENROUTER_API_KEY"] = openrouter_key

        with st.spinner(f"🕷️ Scraping live data for '{product_query}'... (this takes ~30-60 seconds)"):
            try:
                from main import run_actor
                result = run_actor(product_query, max_results)
                analysis = result["analysis"]
                query = result["query"]
                show_results = True
                st.success("✅ Analysis complete!")
            except Exception as e:
                st.error(f"❌ Error: {e}")
                show_results = False
else:
    show_results = False
    st.info("👈 Enter your API keys and a product query in the sidebar, then click **Run Analysis**.\n\nOr click **Load Sample Report** to see a demo.")

# ── Results display ───────────────────────────────────────────────────────────
if show_results:
    pa = analysis.get("price_analysis", {})
    competitors = analysis.get("top_competitors", [])

    # KPI metrics row
    st.markdown("### 📈 Price Overview")
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("💰 Lowest Price", pa.get("lowest_price", "N/A"))
    col2.metric("💎 Highest Price", pa.get("highest_price", "N/A"))
    col3.metric("📊 Average Price", pa.get("average_price", "N/A"))
    col4.metric("📉 Price Trend", pa.get("price_trend", "N/A").capitalize())

    st.markdown("---")

    # Two column layout
    col_left, col_right = st.columns([1.2, 1])

    with col_left:
        st.markdown("### 🌍 Market Summary")
        st.info(analysis.get("market_summary", "N/A"))

        st.markdown("### 🏆 Top Competitors")
        for c in competitors:
            with st.expander(f"**{c.get('name')}** — {c.get('price')}"):
                st.markdown(f"✅ **Strength:** {c.get('strength')}")
                st.markdown(f"⚠️ **Weakness:** {c.get('weakness')}")

    with col_right:
        st.markdown("### 💡 Key Insights")
        for insight in analysis.get("key_insights", []):
            st.markdown(f"- {insight}")

        st.markdown("### 🚀 Opportunities")
        for opp in analysis.get("opportunities", []):
            st.markdown(f"- 🟢 {opp}")

        alerts = analysis.get("alerts", [])
        if alerts:
            st.markdown("### ⚠️ Alerts")
            for alert in alerts:
                st.warning(alert)

    st.markdown("---")
    st.markdown("### ✅ Recommendation")
    st.success(f"💼 {analysis.get('recommendation', 'N/A')}")

    st.markdown("---")
    st.markdown("### 📄 Export Report")
    report_md = f"# MarketPulse AI Report\n**Query:** {query}\n\n" + \
                f"## Market Summary\n{analysis.get('market_summary')}\n\n" + \
                f"## Recommendation\n{analysis.get('recommendation')}"
    st.download_button("⬇️ Download Markdown Report", report_md,
                       file_name="marketpulse_report.md", mime="text/markdown")
    st.download_button("⬇️ Download JSON Data", json.dumps(analysis, indent=2),
                       file_name="marketpulse_data.json", mime="application/json")

# ── Footer ────────────────────────────────────────────────────────────────────
st.markdown("---")
st.markdown(
    "<p style='text-align:center; color:gray;'>MarketPulse AI · Built for GenAI Zürich Hackathon 2026 · Powered by Apify + OpenRouter</p>",
    unsafe_allow_html=True
)
