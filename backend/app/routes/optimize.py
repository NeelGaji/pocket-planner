"""
Optimize Route

POST /optimize - Generate AI-powered layout variations with preview images.
"""

import asyncio
from fastapi import APIRouter, HTTPException

from app.models.api import OptimizeRequest, OptimizeResponse, LayoutVariation
from app.agents.designer_node import InteriorDesignerAgent
from app.core.scoring import score_layout

# LangSmith tracing
try:
    from langsmith import traceable
    LANGSMITH_ENABLED = True
except ImportError:
    LANGSMITH_ENABLED = False
    def traceable(*args, **kwargs):
        def decorator(func):
            return func
        return decorator


router = APIRouter(prefix="/optimize", tags=["Optimization"])


@router.post("", response_model=OptimizeResponse)
@traceable(name="optimize_layout", run_type="chain")
async def optimize_layout(request: OptimizeRequest) -> OptimizeResponse:
    """
    Generate AI-powered layout variations with preview images.
    
    This endpoint:
    1. Takes current layout, locked objects, and ORIGINAL IMAGE
    2. Generates 3 layout variations (Work Focused, Cozy, Creative)
    3. Creates photorealistic preview images by editing the original floor plan
    4. Returns variations with thumbnails for user selection
    """
    try:
        # Mark locked objects
        for obj in request.current_layout:
            if obj.id in request.locked_ids:
                obj.is_locked = True
        
        # Initialize designer agent
        designer = InteriorDesignerAgent()
        
        # Generate variations WITH preview images
        # The image_base64 is CRITICAL for generating edited previews
        variations_data = await designer.generate_layout_variations(
            current_layout=request.current_layout,
            room_dims=request.room_dimensions,
            locked_ids=request.locked_ids,
            image_base64=request.image_base64  # Pass the original floor plan image!
        )
        
        # Convert to LayoutVariation models
        variations = []
        for var in variations_data:
            # Calculate score if not already done
            layout_score = var.get("score")
            if layout_score is None:
                score_obj = score_layout(
                    var["layout"],
                    int(request.room_dimensions.width_estimate),
                    int(request.room_dimensions.height_estimate)
                )
                layout_score = score_obj.total_score
            
            variations.append(LayoutVariation(
                name=var["name"],
                description=var["description"],
                layout=var["layout"],
                thumbnail_base64=var.get("thumbnail_base64"),  # The edited preview image
                score=layout_score
            ))
        
        # Sort by score (highest first)
        variations.sort(key=lambda v: v.score or 0, reverse=True)
        
        # Get best variation for legacy fields
        best = variations[0] if variations else None
        
        # Count how many have thumbnails
        thumbnails_generated = sum(1 for v in variations if v.thumbnail_base64)
        
        return OptimizeResponse(
            variations=variations,
            message=f"Generated {len(variations)} layouts ({thumbnails_generated} with preview images).",
            # Legacy fields for backwards compatibility
            new_layout=best.layout if best else request.current_layout,
            explanation=best.description if best else "No variations generated",
            layout_score=best.score if best else 0.0,
            iterations=1,
            constraint_violations=[],
            improvement=0.0
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Layout optimization failed: {str(e)}"
        )