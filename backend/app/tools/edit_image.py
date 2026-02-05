"""
Edit Image Tool

Tools for editing floor plan images and room renders.
Used by Designer Agent for layout previews and Chat Editor for surgical edits.
"""

import base64
import io
import asyncio
from typing import Optional
from google import genai
from google.genai import types
from PIL import Image

from app.config import get_settings


class EditImageTool:
    """
    Tool for applying edits to floor plan and room images using Gemini.
    """
    
    def __init__(self):
        settings = get_settings()
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set")
        self.client = genai.Client(api_key=settings.google_api_key)
        self.model = settings.image_model_name
    
    async def edit_floor_plan(
        self, 
        base_image: str, 
        furniture_movements: list[dict],
        style_context: Optional[str] = None
    ) -> str:
        """
        Edit a floor plan image to show furniture in new positions.
        
        Args:
            base_image: Base64 encoded floor plan image
            furniture_movements: List of {name, from_pos, to_pos, rotation} dicts
            style_context: Optional style description (e.g., "Work Focused")
            
        Returns:
            Base64 encoded edited floor plan
        """
        if "," in base_image:
            base_image = base_image.split(",")[1]
        
        image_data = base64.b64decode(base_image)
        
        # Build movement instructions
        movement_lines = []
        for move in furniture_movements:
            name = move.get("name", "furniture")
            to_pos = move.get("to_pos", {})
            rotation = move.get("rotation", 0)
            
            pos_desc = f"to position ({to_pos.get('x', 50)}%, {to_pos.get('y', 50)}%)"
            rot_desc = f" rotated {rotation}°" if rotation else ""
            
            movement_lines.append(f"- Move {name.upper()} {pos_desc}{rot_desc}")
        
        movements_text = "\n".join(movement_lines)
        style_text = f"\nLayout Style: {style_context}" if style_context else ""
        
        prompt = f"""Edit this architectural floor plan to reposition furniture.

FURNITURE CHANGES:
{movements_text}
{style_text}

CRITICAL REQUIREMENTS:
1. Maintain the TOP-DOWN 2D floor plan perspective exactly
2. Keep the same visual style, line weights, colors as the original
3. PRESERVE all walls, doors, windows, and room boundaries
4. Move ONLY the furniture items specified above
5. Furniture must not overlap - maintain clear spacing
6. Keep furniture proportions and scale consistent
7. Output should look like a professional architectural drawing

Generate the modified floor plan with furniture repositioned."""

        try:
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model,
                contents=[
                    types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                    temperature=0.5
                )
            )
            
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        return base64.b64encode(part.inline_data.data).decode('utf-8')
            
            raise RuntimeError("No image in response")
            
        except Exception as e:
            raise RuntimeError(f"Floor plan editing failed: {str(e)}")

    async def edit_image(
        self, 
        base_image: str, 
        instruction: str, 
        mask_base64: Optional[str] = None
    ) -> str:
        """
        Apply a general edit to an image based on instruction.
        
        Args:
            base_image: Base64 encoded original image
            instruction: Text instruction for the edit
            mask_base64: Optional base64 mask (unused currently)
            
        Returns:
            Base64 encoded edited image
        """
        if "," in base_image:
            base_image = base_image.split(",")[1]
            
        image_data = base64.b64decode(base_image)
        
        # Detect if this is likely a floor plan or a perspective render
        # based on instruction keywords
        is_floor_plan = any(kw in instruction.lower() for kw in [
            "floor plan", "top-down", "move the", "reposition", "layout"
        ])
        
        if is_floor_plan:
            prompt = f"""Edit this floor plan image.

INSTRUCTION: {instruction}

REQUIREMENTS:
1. Maintain the top-down 2D floor plan perspective
2. Keep the same visual style and line weights
3. Preserve walls, doors, and windows exactly
4. Apply ONLY the requested change
5. Ensure furniture doesn't overlap

Generate the edited floor plan."""
        else:
            prompt = f"""Edit this interior room image.

INSTRUCTION: {instruction}

REQUIREMENTS:
1. Keep everything else exactly the same
2. Maintain photorealistic quality
3. Preserve lighting and perspective
4. Apply ONLY the requested change

Generate the edited image."""

        try:
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model,
                contents=[
                    types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                    temperature=0.5
                )
            )
            
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        return base64.b64encode(part.inline_data.data).decode('utf-8')
            
            raise RuntimeError("No image generated in response")
            
        except Exception as e:
            raise RuntimeError(f"Image editing failed: {str(e)}")

    async def edit_perspective_view(
        self,
        base_image: str,
        instruction: str
    ) -> str:
        """
        Apply cosmetic edits to a perspective room render.
        
        Args:
            base_image: Base64 encoded perspective render
            instruction: Edit instruction (style, color, lighting changes)
            
        Returns:
            Base64 encoded edited image
        """
        if "," in base_image:
            base_image = base_image.split(",")[1]
        
        image_data = base64.b64decode(base_image)
        
        prompt = f"""Edit this interior design photograph.

CHANGE REQUESTED: {instruction}

REQUIREMENTS:
1. Maintain photorealistic quality - this should look like a real photo
2. Keep the same camera angle and perspective
3. Preserve room layout and furniture positions
4. Apply the cosmetic/style change naturally
5. Maintain consistent lighting and shadows

Generate the edited room photograph."""

        try:
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model,
                contents=[
                    types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                    temperature=0.6
                )
            )
            
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        return base64.b64encode(part.inline_data.data).decode('utf-8')
            
            raise RuntimeError("No image in response")
            
        except Exception as e:
            raise RuntimeError(f"Perspective editing failed: {str(e)}")