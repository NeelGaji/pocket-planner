"""
Pocket Planner - Pydantic Schemas

Complete schema definitions as specified in the README Task 1.2.
These match the API contracts for all endpoints.
"""

from typing import List, Optional, Dict, Literal
from pydantic import BaseModel, Field
from typing_extensions import TypedDict
import uuid


class RoomObject(BaseModel):
    """Represents a single object detected in the room."""
    id: str = Field(..., description="Unique identifier like 'bed_1', 'desk_1'")
    label: str = Field(..., description="Object type: bed, desk, chair, wall, door, window")
    bbox: List[float] = Field(..., min_length=4, max_length=4, description="[x, y, width, height] as percentages 0-100")
    type: Literal["movable", "structural"] = Field(..., description="Whether object can be moved")
    orientation: Optional[Literal["north", "south", "east", "west"]] = None
    locked: bool = Field(default=False, description="Whether object is locked in place")
    
    model_config = {
        "json_schema_extra": {
            "examples": [{
                "id": "bed_1",
                "label": "bed",
                "bbox": [10.0, 20.0, 40.0, 30.0],
                "type": "movable",
                "orientation": "north",
                "locked": False
            }]
        }
    }


class RoomDimensions(BaseModel):
    """Estimated room dimensions in feet."""
    width: float = Field(..., gt=0, description="Room width in feet")
    height: float = Field(..., gt=0, description="Room height/depth in feet")


class AnalyzeRequest(BaseModel):
    """Request body for /analyze endpoint."""
    image: str = Field(..., description="Base64 encoded image string")


class AnalyzeResponse(BaseModel):
    """Response from /analyze endpoint."""
    room_dimensions: RoomDimensions
    objects: List[RoomObject]
    image_id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class OptimizeRequest(BaseModel):
    """Request body for /optimize endpoint."""
    current_layout: List[RoomObject]
    locked_object_ids: List[str] = Field(..., min_length=1, max_length=1, description="Exactly one locked object for MVP")
    room_dimensions: RoomDimensions


class OptimizeResponse(BaseModel):
    """Response from /optimize endpoint."""
    new_layout: List[RoomObject]
    explanation: str
    constraint_violations: List[str] = Field(default_factory=list)
    overlays: Dict = Field(default_factory=dict)


class EditMask(BaseModel):
    """Single region edit instruction."""
    region_mask: str = Field(..., description="Base64 PNG with alpha channel marking edit region")
    instruction: str = Field(..., description="Edit instruction like 'Repaint wall navy blue'")


class RenderRequest(BaseModel):
    """Request body for /render endpoint."""
    base_image: str = Field(..., description="Base64 encoded original image")
    masks: List[EditMask] = Field(default_factory=list)
    layout_changes: Optional[List[RoomObject]] = None


class RenderResponse(BaseModel):
    """Response from /render endpoint."""
    edited_image: str = Field(..., description="Base64 encoded edited image")


class AgentState(TypedDict):
    """Internal state for the agentic workflow."""
    image_base64: str
    current_layout: List[RoomObject]
    locked_object_ids: List[str]
    edit_masks: List[Dict]
    constraint_violations: List[str]
    iteration_count: int
