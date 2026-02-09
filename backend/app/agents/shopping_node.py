"""
Shopping Agent Node

Agentic node that:
1. Analyzes the perspective image to describe each furniture item's style
2. Allocates the total room budget across items by importance/size
3. Searches Google Shopping (via SerpAPI) for each item
4. Returns structured product recommendations

This is the most "agentic" part of the pipeline — it autonomously decides
search queries, evaluates results, and retries with refined queries if needed.

FULLY TRACED with LangSmith.
"""

import json
import base64
import asyncio
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

from app.config import get_settings
from app.models.room import RoomObject
from app.tools.serp_search import SerpSearchTool

try:
    from langsmith import traceable
    LANGSMITH_ENABLED = True
except ImportError:
    LANGSMITH_ENABLED = False
    def traceable(*args, **kwargs):
        def decorator(func):
            return func
        return decorator


class ShoppingAgent:
    """
    AI agent that finds real products matching the furniture in a room render.
    """

    def __init__(self):
        settings = get_settings()
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY not set")
        self.client = genai.Client(api_key=settings.google_api_key)
        self.model = settings.planning_model_name
        self.search_tool = SerpSearchTool()

    @traceable(
        name="shopping_agent.find_products",
        run_type="chain",
        tags=["shopping", "agent", "pipeline"],
        metadata={"description": "Full shopping agent pipeline"}
    )
    async def find_products(
        self,
        current_layout: List[RoomObject],
        total_budget: float,
        perspective_image_base64: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point. Analyzes room, allocates budget, searches products.

        Args:
            current_layout: List of RoomObject from the current layout.
            total_budget: Total room budget in USD.
            perspective_image_base64: Optional perspective render for style analysis.

        Returns:
            Dict with "items" list and "total_estimated" cost.
        """
        # Step 1: Get only movable furniture labels
        movable_items = [
            {"id": obj.id, "label": obj.label}
            for obj in current_layout
            if obj.type.value == "movable"
        ]

        if not movable_items:
            return {"items": [], "total_estimated": 0, "message": "No movable furniture found."}

        # Step 2: Use Gemini to describe each item's style + allocate budget
        item_descriptions = await self._describe_and_allocate(
            movable_items, total_budget, perspective_image_base64
        )

        # Step 3: Search for each item in parallel
        search_tasks = []
        for item in item_descriptions:
            search_tasks.append(
                self._search_for_item(item)
            )
        search_results = await asyncio.gather(*search_tasks, return_exceptions=True)

        # Step 4: Assemble final results
        items = []
        total_estimated = 0.0
        for i, result in enumerate(search_results):
            desc = item_descriptions[i]
            if isinstance(result, Exception):
                items.append({
                    "furniture_id": desc["id"],
                    "furniture_label": desc["label"],
                    "search_query": desc.get("search_query", ""),
                    "budget_allocated": desc.get("budget", 0),
                    "products": [],
                    "error": str(result),
                })
            else:
                best_price = result[0]["price"] if result and result[0].get("price") else 0
                total_estimated += best_price
                items.append({
                    "furniture_id": desc["id"],
                    "furniture_label": desc["label"],
                    "search_query": desc.get("search_query", ""),
                    "budget_allocated": desc.get("budget", 0),
                    "products": result,
                })

        return {
            "items": items,
            "total_estimated": round(total_estimated, 2),
            "total_budget": total_budget,
            "message": f"Found products for {len([i for i in items if i['products']])} of {len(movable_items)} items.",
        }

    @traceable(
        name="gemini_describe_and_allocate",
        run_type="llm",
        tags=["gemini", "shopping", "description", "budget"],
        metadata={"model_type": "gemini-pro", "task": "style_description_and_budget"}
    )
    async def _describe_and_allocate(
        self,
        movable_items: List[Dict[str, str]],
        total_budget: float,
        image_base64: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Use Gemini to:
        1. Convert generic furniture labels into specific product search queries
        2. Allocate the total budget across items proportionally by size/cost

        Returns list of dicts with id, label, search_query, budget.
        """
        item_list_str = json.dumps(movable_items, indent=2)
        num_items = len(movable_items)

        prompt = f"""You are a furniture shopping assistant. A user has designed a room and wants to buy real furniture matching their design.

TOTAL BUDGET: ${total_budget:.2f}
NUMBER OF ITEMS: {num_items}

FURNITURE ITEMS (these are generic labels from floor plan detection — you must convert them to specific product names):
{item_list_str}

YOUR TASKS:

TASK 1 — CONVERT GENERIC LABELS TO SPECIFIC PRODUCT SEARCH QUERIES:
Each label above is generic (e.g. "bed", "desk", "nightstand"). Convert each into a specific, realistic Google Shopping search query that describes the actual product type, style, material, and size. Examples:
- "bed" → "queen size walnut wood platform bed frame"
- "desk" → "48 inch modern white writing desk with drawers"  
- "nightstand" → "mid-century 2-drawer bedside table walnut"
- "sofa" → "3-seater gray linen modern sofa"
- "lamp" → "brass adjustable desk lamp"
- "rug" → "5x7 ft neutral wool area rug"
- "wardrobe" → "2-door oak wardrobe closet 72 inch"
- "chair" → "ergonomic mesh office chair"
Keep search queries concise: 5-10 words, no brand names.

TASK 2 — ALLOCATE THE BUDGET (${total_budget:.2f}) PROPORTIONALLY:
Larger, more expensive furniture gets a BIGGER share. Smaller items get LESS.
Typical real-world price ratios:
- Bed/Sofa: 25-35% of budget each
- Desk/Wardrobe/Dresser: 15-20% each
- Dining table: 10-15%
- Chair/Nightstand: 5-10% each
- Lamp/Rug/Plant: 3-5% each

The budgets MUST add up to EXACTLY ${total_budget:.2f}. Not less, not more.

For example, with a $2000 budget and items [bed, desk, nightstand, lamp]:
- bed: $900 (45%)
- desk: $550 (27.5%)
- nightstand: $350 (17.5%)
- lamp: $200 (10%)
Total: $2000 ✓

Return a JSON array with exactly {num_items} objects:
[
  {{
    "id": "furniture_id_from_list_above",
    "label": "original_label_from_list_above",
    "search_query": "specific product search query",
    "budget": 450.00
  }}
]

RULES:
- Every item from the furniture list MUST appear in the output.
- "id" and "label" must match EXACTLY from the input list.
- Budgets must be reasonable dollar amounts (not $91 for everything).
- Budgets MUST sum to EXACTLY ${total_budget:.2f}.
- Return ONLY the JSON array."""

        contents = [prompt]

        # If we have a perspective image, include it for style context
        if image_base64:
            clean_b64 = image_base64.split(",")[1] if "," in image_base64 else image_base64
            try:
                img_data = base64.b64decode(clean_b64)
                contents.insert(0, types.Part.from_bytes(data=img_data, mime_type="image/png"))
            except Exception:
                pass  # Continue without image if decode fails

        try:
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.4,
                )
            )
            result = json.loads(response.text)

            # Validate — must be a list
            if not isinstance(result, list):
                raise ValueError("Gemini returned non-list response")

            # Validate budget sum — fix if off
            budget_sum = sum(item.get("budget", 0) for item in result)
            if abs(budget_sum - total_budget) > 1.0:
                # Redistribute proportionally to match total_budget
                if budget_sum > 0:
                    ratio = total_budget / budget_sum
                    for item in result:
                        item["budget"] = round(item.get("budget", 0) * ratio, 2)
                else:
                    # All zeros — do equal split
                    per_item = round(total_budget / max(len(result), 1), 2)
                    for item in result:
                        item["budget"] = per_item

                # Fix rounding to hit exact total
                new_sum = sum(item["budget"] for item in result)
                diff = round(total_budget - new_sum, 2)
                if result and diff != 0:
                    result[0]["budget"] = round(result[0]["budget"] + diff, 2)

            return result

        except Exception as e:
            print(f"[ShoppingAgent] Gemini describe/allocate failed: {e}")
            # Fallback: proportional budget split based on item type
            return self._fallback_allocate(movable_items, total_budget)

    def _fallback_allocate(
        self,
        movable_items: List[Dict[str, str]],
        total_budget: float,
    ) -> List[Dict[str, Any]]:
        """
        Fallback budget allocation when Gemini fails.
        Uses predefined weight tiers based on furniture type.
        """
        # Weight tiers: large=5, medium=3, small=1
        weight_map = {
            "bed": 5, "sofa": 5, "couch": 5,
            "desk": 3, "wardrobe": 3, "dresser": 3, "dining_table": 3, "table": 3,
            "chair": 2, "nightstand": 2, "bookshelf": 2, "office_chair": 2,
            "lamp": 1, "rug": 1, "plant": 1, "artwork": 1, "coffee_table": 2,
        }

        weights = []
        for item in movable_items:
            label = item["label"].lower().split("_")[0]
            weights.append(weight_map.get(label, 2))

        total_weight = sum(weights) or 1
        result = []
        running_total = 0.0

        for i, item in enumerate(movable_items):
            if i == len(movable_items) - 1:
                # Last item gets remainder to ensure exact sum
                budget = round(total_budget - running_total, 2)
            else:
                budget = round(total_budget * weights[i] / total_weight, 2)
                running_total += budget

            label = item["label"].lower().split("_")[0]
            result.append({
                "id": item["id"],
                "label": item["label"],
                "search_query": f"modern {label} furniture",
                "budget": budget,
            })

        return result

    @traceable(
        name="search_for_item",
        run_type="tool",
        tags=["serpapi", "shopping", "search"],
    )
    async def _search_for_item(
        self,
        item: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Search Google Shopping for a single item within its allocated budget.
        If first search returns no results, retries with a simpler query.
        """
        query = item.get("search_query", f"modern {item['label']} furniture")
        budget = item.get("budget", 500)

        # First attempt with specific query
        products = await self.search_tool.search_shopping(
            query=query,
            max_price=budget,
            num_results=3,
        )

        # Agentic retry: if no results, try a simpler/broader query
        if not products:
            simple_query = f"{item['label']} furniture"
            products = await self.search_tool.search_shopping(
                query=simple_query,
                max_price=budget * 1.2,  # slightly relax budget on retry
                num_results=3,
            )

        return products