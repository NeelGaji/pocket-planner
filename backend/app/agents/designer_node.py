"""
Designer Node (The "Architect Brain")

LLM-powered interior design agent that generates 2-3 distinct, 
architecturally sound layout variations using semantic reasoning
AND generates photorealistic preview images by editing the original floor plan.
"""

import os
import json
import asyncio
import base64
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

from app.models.state import AgentState
from app.models.room import RoomObject, RoomDimensions, ObjectType
from app.core.constraints import check_all_hard_constraints
from app.core.scoring import score_layout


# =============================================================================
# DETAILED STYLE SPECIFICATIONS
# =============================================================================

LAYOUT_STYLES = {
    "work_focused": {
        "name": "Work Focused",
        "description": "Optimized for productivity with desk near natural light",
        "design_rules": [
            "Position DESK perpendicular to window (not facing it) to avoid screen glare while maximizing natural light",
            "DESK should have clear sightline to room entry for psychological comfort",
            "Create minimum 3-foot clearance around desk chair for movement",
            "Place BOOKSHELF or storage within arm's reach of desk (24-36 inches)",
            "Position BED against wall opposite from desk to separate work/rest zones",
            "NIGHTSTAND goes on the side of bed closest to door for accessibility",
            "Maintain 36+ inch walkways between all furniture",
            "RUG should define the work zone OR bed zone, not span both"
        ],
        "furniture_placement": {
            "desk": "Near window, perpendicular orientation, right side of room (60-80% x, 20-40% y)",
            "bed": "Against left wall or back wall, away from desk (15-35% x, 55-75% y)", 
            "nightstand": "Adjacent to bed on accessible side (within 5% of bed edge)",
            "bookshelf": "Near desk, against wall (75-90% x, 20-40% y)",
            "chair": "Paired with desk, facing desk",
            "dresser": "Near closet/wardrobe area or opposite wall from bed",
            "rug": "Under desk area OR under bed, not spanning both zones"
        }
    },
    "cozy": {
        "name": "Cozy & Relaxing", 
        "description": "Warm intimate layout prioritizing comfort and relaxation",
        "design_rules": [
            "BED is the focal point - center it against the main solid wall (not under window)",
            "Create symmetry with NIGHTSTANDS on both sides of bed if space allows",
            "Large RUG should anchor the bed area, extending 18-24 inches beyond bed sides",
            "DESK tucked into corner, minimal visual presence (15-25% x, 10-25% y)",
            "Soft seating (chair/ottoman) angled toward bed or window for reading nook",
            "BOOKSHELF near reading area for accessibility",
            "Furniture can be closer together (24 inch walkways acceptable for intimate feel)",
            "Layer the space - rug under bed grouping creates cozy boundary"
        ],
        "furniture_placement": {
            "bed": "Centered on main wall, headboard against solid wall (40-60% x, 55-75% y)",
            "nightstand": "Flanking bed symmetrically (bed_x ± 15%, same y as bed)",
            "desk": "Tucked in corner, secondary importance (10-25% x, 10-25% y)",
            "rug": "Large, centered under bed extending beyond sides",
            "chair": "Angled 30° toward bed or window, creating reading nook (20-35% x, 30-45% y)",
            "bookshelf": "Near chair/reading area (80-95% x, 40-60% y)",
            "dresser": "Against secondary wall (80-95% x, 15-30% y)"
        }
    },
    "creative": {
        "name": "Creative & Bold",
        "description": "Unconventional artistic arrangement with diagonal elements",
        "design_rules": [
            "Break the grid - angle at least ONE major piece 30-45 degrees",
            "BED can float away from walls or be placed diagonally in room",
            "Create diagonal sight lines through the room for visual interest",
            "DESK facing unexpected direction (toward room center or art wall)",
            "Use asymmetrical balance - visual weight distributed creatively",
            "RUG angled to reinforce diagonal layout theme",
            "BOOKSHELF can act as room divider, not just wall furniture",
            "Maintain 30 inch minimum walkways despite creative placement",
            "Create at least 2 distinct visual zones"
        ],
        "furniture_placement": {
            "bed": "Diagonal or floating, not against obvious wall (35-55% x, 45-65% y, rotation: 30-45°)",
            "desk": "Angled orientation, possibly facing into room (65-80% x, 20-35% y, rotation: 45°)",
            "rug": "Angled 30° to reinforce diagonal theme (center of room)",
            "nightstand": "Asymmetrical - only one side, modern look (bed_x + 20%, bed_y)",
            "bookshelf": "Can be room divider position (35-50% x, 30-45% y, rotation: 90°)",
            "chair": "Unexpected placement, angled (20-35% x, 20-35% y, rotation: -20°)",
            "dresser": "Corner anchor (5-15% x, 75-90% y)"
        }
    }
}


class InteriorDesignerAgent:
    """
    LLM-powered interior design agent that generates multiple layout variations
    with photorealistic preview images.
    """
    
    def __init__(self):
        from app.config import get_settings
        
        settings = get_settings()
        api_key = settings.google_api_key
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not set")
        
        self.client = genai.Client(api_key=api_key)
        self.model = settings.model_name
        self.image_model = settings.image_model_name
    
    async def generate_layout_variations(
        self, 
        current_layout: List[RoomObject],
        room_dims: RoomDimensions,
        locked_ids: List[str],
        image_base64: Optional[str] = None,
        max_retries: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Generate 3 distinct layout options with preview images.
        """
        # Separate movable and structural objects
        movable_objects = []
        structural_objects = []
        
        for obj in current_layout:
            obj_dict = {
                "id": obj.id,
                "label": obj.label,
                "bbox": obj.bbox,
                "orientation": obj.orientation,
                "z_index": getattr(obj, 'z_index', 1),
                "material_hint": getattr(obj, 'material_hint', None)
            }
            
            if obj.id in locked_ids or obj.type == ObjectType.STRUCTURAL:
                structural_objects.append(obj_dict)
            else:
                movable_objects.append(obj_dict)
        
        # Generate layout JSON for each style
        prompt = self._build_layout_generation_prompt(
            movable_objects, structural_objects, room_dims
        )
        
        for attempt in range(max_retries):
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=[prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                
                data = json.loads(response.text)
                variations = []
                
                # Process each variation
                for var in data.get("variations", []):
                    style_key = var.get("style_key", "work_focused")
                    new_layout = self._merge_layout(
                        current_layout, var.get("objects", []), locked_ids
                    )
                    
                    # Validate and fix violations
                    violations = check_all_hard_constraints(
                        new_layout,
                        int(room_dims.width_estimate),
                        int(room_dims.height_estimate)
                    )
                    
                    if violations and len(violations) <= 3:
                        fixed = await self._fix_violations(new_layout, violations, room_dims)
                        if fixed:
                            new_layout = fixed
                    
                    score = score_layout(
                        new_layout,
                        int(room_dims.width_estimate),
                        int(room_dims.height_estimate)
                    )
                    
                    variations.append({
                        "name": var.get("name"),
                        "style_key": style_key,
                        "description": var.get("description"),
                        "layout": new_layout,
                        "score": score.total_score,
                        "violations": violations,
                        "thumbnail_base64": None  # Will be filled below
                    })
                
                # Generate preview images concurrently
                if image_base64:
                    tasks = [
                        self._generate_layout_preview(
                            image_base64,
                            current_layout,
                            var["layout"],
                            var["style_key"],
                            room_dims
                        )
                        for var in variations
                    ]
                    
                    thumbnails = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for i, thumb in enumerate(thumbnails):
                        if isinstance(thumb, str) and thumb:
                            variations[i]["thumbnail_base64"] = thumb
                        elif isinstance(thumb, Exception):
                            print(f"Thumbnail generation failed for {variations[i]['name']}: {thumb}")
                
                return variations[:3]
                
            except Exception as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise RuntimeError(f"Designer failed: {e}")
        
        raise RuntimeError("Designer agent failed after retries")

    def _build_layout_generation_prompt(
        self,
        movable_objects: List[dict],
        structural_objects: List[dict],
        room_dims: RoomDimensions
    ) -> str:
        """Build the LLM prompt for generating layout variations."""
        
        styles_description = ""
        for key, style in LAYOUT_STYLES.items():
            rules = "\n   ".join(f"- {r}" for r in style["design_rules"][:5])
            styles_description += f"""
{style["name"]} (style_key: "{key}"):
   {rules}
"""
        
        return f"""You are a Master Interior Architect specializing in room optimization.

ROOM: {room_dims.width_estimate} x {room_dims.height_estimate} units (coordinates 0-100)

STRUCTURAL ELEMENTS (FIXED - DO NOT MOVE):
{json.dumps(structural_objects, indent=2)}

MOVABLE FURNITURE (REPOSITION THESE):
{json.dumps(movable_objects, indent=2)}

GENERATE 3 DISTINCT LAYOUT VARIATIONS:
{styles_description}

MANDATORY RULES FOR ALL LAYOUTS:
1. Nightstands MUST be within 5% distance of bed edge
2. Chairs MUST be grouped with desks/tables
3. Bed headboard should touch or nearly touch a wall
4. NO overlapping furniture - minimum 5% clearance between all objects
5. ALL objects must stay within bounds (0-100 for both x and y)
6. Preserve object dimensions (width/height in bbox)

OUTPUT FORMAT (JSON):
{{
  "variations": [
    {{
      "name": "Work Focused",
      "style_key": "work_focused",
      "description": "Detailed 2-sentence description of this layout's benefits",
      "objects": [
        {{"id": "object_id", "bbox": [x, y, width, height], "orientation": 0}},
        ...
      ]
    }},
    {{
      "name": "Cozy & Relaxing",
      "style_key": "cozy",
      "description": "...",
      "objects": [...]
    }},
    {{
      "name": "Creative & Bold",
      "style_key": "creative",
      "description": "...",
      "objects": [...]
    }}
  ]
}}

IMPORTANT: Each variation must be SIGNIFICANTLY different from the others.
Return ONLY valid JSON."""

    async def _generate_layout_preview(
        self,
        original_image_b64: str,
        original_layout: List[RoomObject],
        new_layout: List[RoomObject],
        style_key: str,
        room_dims: RoomDimensions
    ) -> Optional[str]:
        """
        Generate a photorealistic preview by editing the original floor plan image.
        """
        style = LAYOUT_STYLES.get(style_key, LAYOUT_STYLES["work_focused"])
        
        # Build detailed movement instructions
        movements = self._describe_movements(original_layout, new_layout, room_dims)
        
        if not movements:
            return None  # No significant changes
        
        movement_text = "\n".join(f"- {m}" for m in movements)
        
        prompt = f"""TASK: Edit this floor plan image to show a new furniture arrangement.

STYLE: {style["name"]} - {style["description"]}

FURNITURE MOVEMENTS TO APPLY:
{movement_text}

CRITICAL INSTRUCTIONS:
1. This is a TOP-DOWN 2D FLOOR PLAN view - maintain this perspective exactly
2. MOVE the furniture pieces to their new positions as described above
3. KEEP the same visual style, colors, line weights, and drawing technique as the original
4. PRESERVE all walls, windows, doors, and room boundaries exactly as they are
5. Furniture should NOT overlap and should have clear spacing
6. The output must look like a professional architectural floor plan
7. Maintain correct furniture proportions and scale relative to the room

OUTPUT: A modified version of this floor plan with furniture repositioned according to the {style["name"]} layout.

Generate the edited floor plan image now."""

        try:
            # Decode original image
            if "," in original_image_b64:
                original_image_b64 = original_image_b64.split(",")[1]
            
            image_bytes = base64.b64decode(original_image_b64)
            
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.image_model,
                contents=[
                    types.Content(parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                        types.Part.from_text(prompt)
                    ])
                ],
                config=types.GenerateContentConfig(
                    temperature=0.6,
                    response_modalities=["IMAGE", "TEXT"]
                )
            )
            
            # Extract generated image
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        return base64.b64encode(part.inline_data.data).decode('utf-8')
            
            print(f"No image returned for {style['name']} layout")
            return None
            
        except Exception as e:
            print(f"Preview generation failed for {style['name']}: {e}")
            return None

    def _describe_movements(
        self,
        original_layout: List[RoomObject],
        new_layout: List[RoomObject],
        room_dims: RoomDimensions
    ) -> List[str]:
        """Generate human-readable movement descriptions for the image editor."""
        movements = []
        original_map = {obj.id: obj for obj in original_layout}
        
        w = room_dims.width_estimate
        h = room_dims.height_estimate
        
        for new_obj in new_layout:
            if new_obj.type == ObjectType.STRUCTURAL:
                continue
                
            orig_obj = original_map.get(new_obj.id)
            if not orig_obj:
                continue
            
            # Calculate position changes
            dx = new_obj.bbox[0] - orig_obj.bbox[0]
            dy = new_obj.bbox[1] - orig_obj.bbox[1]
            d_rot = new_obj.orientation - orig_obj.orientation
            
            # Only report significant movements (> 5% of room dimension)
            if abs(dx) < 5 and abs(dy) < 5 and abs(d_rot) < 10:
                continue
            
            # Describe new position
            new_x_pct = new_obj.bbox[0]
            new_y_pct = new_obj.bbox[1]
            
            # Quadrant description
            x_pos = "left side" if new_x_pct < 33 else ("center" if new_x_pct < 66 else "right side")
            y_pos = "top/front" if new_y_pct < 33 else ("middle" if new_y_pct < 66 else "bottom/back")
            
            # Movement direction
            directions = []
            if dx > 5:
                directions.append(f"right by {abs(dx):.0f}%")
            elif dx < -5:
                directions.append(f"left by {abs(dx):.0f}%")
            if dy > 5:
                directions.append(f"down by {abs(dy):.0f}%")
            elif dy < -5:
                directions.append(f"up by {abs(dy):.0f}%")
            
            move_desc = " and ".join(directions) if directions else "repositioned"
            
            rotation_desc = ""
            if abs(d_rot) >= 10:
                rotation_desc = f", rotated {d_rot:+.0f}°"
            
            movements.append(
                f"Move {new_obj.label.upper()} to {y_pos}, {x_pos} of room ({move_desc}){rotation_desc}"
            )
        
        return movements

    def _merge_layout(
        self, 
        original: List[RoomObject], 
        llm_updates: List[dict],
        locked_ids: List[str]
    ) -> List[RoomObject]:
        """Merge LLM position updates with original object data."""
        updated_map = {obj["id"]: obj for obj in llm_updates}
        new_layout = []
        
        for obj in original:
            new_obj = RoomObject(
                id=obj.id,
                label=obj.label,
                bbox=obj.bbox.copy(),
                type=obj.type,
                orientation=obj.orientation,
                is_locked=obj.is_locked,
                z_index=getattr(obj, 'z_index', 1),
                material_hint=getattr(obj, 'material_hint', None)
            )
            
            if obj.id in updated_map and obj.id not in locked_ids and obj.type != ObjectType.STRUCTURAL:
                llm_obj = updated_map[obj.id]
                if "bbox" in llm_obj:
                    new_obj.bbox = [int(b) for b in llm_obj["bbox"]]
                if "orientation" in llm_obj:
                    new_obj.orientation = int(llm_obj.get("orientation", obj.orientation))
            
            new_layout.append(new_obj)
        
        return new_layout

    async def _fix_violations(
        self, 
        layout: List[RoomObject], 
        violations: List, 
        room_dims: RoomDimensions
    ) -> Optional[List[RoomObject]]:
        """Ask LLM to fix constraint violations."""
        if not violations:
            return layout
            
        violation_desc = "\n".join([f"- {v.description}" for v in violations[:5]])
        
        movable_layout = [
            {"id": o.id, "label": o.label, "bbox": o.bbox, "orientation": o.orientation}
            for o in layout if o.type != ObjectType.STRUCTURAL
        ]
        
        prompt = f"""Fix these CONSTRAINT VIOLATIONS in the room layout:
{violation_desc}

Current movable objects:
{json.dumps(movable_layout, indent=2)}

Room: {room_dims.width_estimate} x {room_dims.height_estimate} (0-100 coordinates)

Rules:
- Move objects to avoid overlaps (minimum 5% clearance)
- Keep all objects within bounds (0-100)
- Preserve furniture dimensions

Return ONLY corrected objects as JSON array:
[{{"id": "...", "bbox": [x, y, w, h], "orientation": 0}}, ...]"""

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            fixes = json.loads(response.text)
            
            if isinstance(fixes, list):
                return self._merge_layout(layout, fixes, [])
            elif isinstance(fixes, dict) and "objects" in fixes:
                return self._merge_layout(layout, fixes["objects"], [])
                
        except Exception as e:
            print(f"Fix violations failed: {e}")
        
        return None


# =============================================================================
# LANGGRAPH NODE FUNCTIONS
# =============================================================================

async def designer_node(state: AgentState) -> Dict[str, Any]:
    """LangGraph node that runs the Designer Agent."""
    designer = InteriorDesignerAgent()
    
    try:
        variations = await designer.generate_layout_variations(
            current_layout=state["current_layout"],
            room_dims=state["room_dimensions"],
            locked_ids=state.get("locked_object_ids", []),
            image_base64=state.get("image_base64")
        )
        
        return {
            "layout_variations": variations,
            "proposed_layout": variations[0]["layout"] if variations else state["current_layout"],
            "explanation": f"Generated {len(variations)} layout variations with AI design principles.",
            "should_continue": False,
            "iteration_count": state.get("iteration_count", 0) + 1
        }
        
    except Exception as e:
        return {
            "error": f"Designer agent failed: {str(e)}",
            "should_continue": False
        }


def designer_node_sync(state: AgentState) -> Dict[str, Any]:
    """Synchronous wrapper for LangGraph compatibility."""
    import asyncio
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(designer_node(state))
    else:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, designer_node(state))
            return future.result()