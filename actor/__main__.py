"""
Apify Actor entrypoint - wraps main.py for deployment on Apify platform.
When deployed, Apify calls this file and passes input via environment/dataset.
"""

from apify import Actor
from main import run_actor
import json

async def main():
    async with Actor:
        # Get input from Apify platform
        actor_input = await Actor.get_input() or {}

        product_query = actor_input.get("productQuery", "wireless headphones")
        max_results = actor_input.get("maxResults", 20)

        Actor.log.info(f"Starting MarketPulse AI for: {product_query}")

        # Run the full pipeline
        result = run_actor(product_query, max_results)

        # Push results to Apify dataset (visible in console)
        await Actor.push_data({
            "query": result["query"],
            "analysis": result["analysis"],
            "report_markdown": result["report_markdown"],
            "total_products_scraped": len(result["raw_shopping_data"]),
        })

        Actor.log.info("✅ MarketPulse AI completed successfully!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
