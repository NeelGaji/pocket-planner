# Pocket Planner - Complete Build Guide for Antigravity IDE

## Project Overview

**Pocket Planner** is a human-in-the-loop agentic system that combines spatial optimization with surgical image editing for small bedrooms. It uses Gemini 2.5 Flash Image for vision extraction and localized image editing, while keeping spatial reasoning, constraint validation, and layout optimization deterministic through external logic.

**Key Features:**
- Vision extraction from bedroom photos → structured JSON
- Layout optimization with constraint validation (collision, clearance, door access)
- Single-object locking with re-optimization
- Surgical region-based image edits (wall repaint, furniture restyle)
- Visual overlays for explanation (walking paths, clearance zones)

---

## API Choice: Gemini Developer API

This project uses the **Gemini Developer API** (not Vertex AI) for simplicity:

| Aspect | Gemini Developer API (This Project) |
|--------|-------------------------------------|
| Auth | API Key only |
| Setup | Simple, instant |
| Best for | Prototyping, MVP, Development |
| SDK | `google-genai` |

---
IMPORTANT : Verify all the code files that are currently avaialble in the folder before writing code for any of the tasks in 
any of the phases.
## Git Workflow (Simple)


### After Completing Each Phase
```bash
# Stage all changes
git add .

# Commit with phase description
git commit -m "Complete Phase X: [description]"

# Push to GitHub
git push origin main
```

### Example Commits
```bash
# After Phase 1
git add .
git commit -m "Complete Phase 1: MVP with backend schemas, FastAPI routes, Gemini vision, constraint engine, and frontend components"
git push origin main

# After Phase 2
git add .
git commit -m "Complete Phase 2: Image editing integration, mask drawing, error handling"
git push origin main
```

---

## PHASE 1: MVP Foundation

### Task 1.1: Initialize Project Structure

**Prompt for Antigravity:**
```
Create a monorepo project structure for "Pocket Planner" with the following:

/pocket-planner
├── /backend
│   ├── /app
│   │   ├── /agents          # Vision, Constraint, Solver, Render nodes
│   │   ├── /core            # Geometry helpers, validators, scoring
│   │   ├── /models          # Pydantic schemas
│   │   ├── /api             # FastAPI route handlers
│   │   └── __init__.py
│   ├── main.py              # FastAPI entrypoint
│   ├── requirements.txt
│   └── .env.example
├── /frontend
│   ├── /components
│   ├── /hooks
│   ├── /pages
│   ├── /lib
│   ├── package.json
│   └── next.config.js
├── .gitignore
└── README.md

Initialize:
1. Backend: Python 3.11+ virtual environment
2. Frontend: Next.js 14 with TypeScript, Tailwind CSS
3. Add appropriate .gitignore for Python and Node
```

---

### Task 1.2: Backend - Pydantic Schemas

**Prompt for Antigravity:**
```
In /backend/app/models/, create the following Pydantic schemas in a file called schemas.py:

1. RoomObject - Represents a single object in the room:
   - id: str (unique identifier like "bed_1", "desk_1")
   - label: str (object type: "bed", "desk", "chair", "wall", "door", "window")
   - bbox: List[float] with 4 elements [x, y, width, height] as percentages (0-100)
   - type: Literal["movable", "structural"]
   - orientation: Optional[Literal["north", "south", "east", "west"]]
   - locked: bool = False

2. RoomDimensions - Room size estimate:
   - width: float (in feet)
   - height: float (in feet)

3. AnalyzeRequest - Input for /analyze endpoint:
   - image: str (base64 encoded image string)

4. AnalyzeResponse - Output from /analyze:
   - room_dimensions: RoomDimensions
   - objects: List[RoomObject]
   - image_id: str (UUID for tracking)

5. OptimizeRequest - Input for /optimize:
   - current_layout: List[RoomObject]
   - locked_object_ids: List[str] (exactly 1 for MVP)
   - room_dimensions: RoomDimensions

6. OptimizeResponse - Output from /optimize:
   - new_layout: List[RoomObject]
   - explanation: str (reasoning for changes)
   - constraint_violations: List[str] (any warnings)
   - overlays: Dict containing:
     - walking_paths: List[List[float]] (line segments)
     - clearance_zones: List[Dict] (rectangles around objects)

7. EditMask - Single edit instruction:
   - region_mask: str (base64 PNG with alpha channel)
   - instruction: str (e.g., "Repaint wall navy blue")

8. RenderRequest - Input for /render:
   - base_image: str (base64)
   - masks: List[EditMask]
   - layout_changes: Optional[List[RoomObject]]

9. RenderResponse - Output from /render:
   - edited_image: str (base64 of result)

10. AgentState (TypedDict for internal state):
    - image_base64: str
    - current_layout: List[RoomObject]
    - locked_object_ids: List[str]
    - edit_masks: List[Dict]
    - constraint_violations: List[str]
    - iteration_count: int

Include proper validation, examples in model_config, and clear docstrings.
```

**Expected Schema Code:**
```python
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
```

---

### Task 1.3: Backend - FastAPI Setup & Routes

**Prompt for Antigravity:**
```
Create the FastAPI application in /backend/main.py with these specifications:

1. Create a FastAPI app with:
   - Title: "Pocket Planner API"
   - Version: "1.0.0"
   - CORS middleware allowing localhost:3000

2. Create three POST endpoints in /backend/app/api/routes.py:
   - POST /analyze - Accepts AnalyzeRequest, returns AnalyzeResponse
   - POST /optimize - Accepts OptimizeRequest, returns OptimizeResponse  
   - POST /render - Accepts RenderRequest, returns RenderResponse

3. For MVP, create placeholder implementations that return mock data:
   - /analyze: Return hardcoded room with bed, desk, chair, door, window
   - /optimize: Return slightly modified layout with explanation
   - /render: Return the same base_image (placeholder for now)

4. Add health check endpoint: GET /health

5. Include proper error handling with HTTPException for:
   - Invalid base64 images (400)
   - Empty layouts (400)
   - Server errors (500)

Include the router in main.py with prefix "/api/v1"
```

**Expected main.py:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router

app = FastAPI(
    title="Pocket Planner API",
    version="1.0.0",
    description="Spatial optimization and surgical editing for bedroom layouts"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

---

### Task 1.4: Backend - Gemini Vision Integration

**Prompt for Antigravity:**
```
Create /backend/app/agents/vision_node.py that integrates with Gemini 2.5 Flash for vision extraction.

IMPORTANT: We are using the Gemini Developer API (not Vertex AI) with simple API key authentication.

Requirements:
1. Use the google-genai SDK: pip install google-genai
2. Create a VisionExtractor class with method: async def extract_objects(image_base64: str) -> AnalyzeResponse

3. Initialize the client with API key:
   from google import genai
   client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

4. Use model: "gemini-2.5-flash" for vision extraction

5. The Gemini prompt should request structured JSON output with:
   - Room dimensions estimate in feet
   - All visible objects with:
     - Unique IDs (label + index like "bed_1")
     - Bounding boxes as percentages [x, y, width, height]
     - Type classification (movable vs structural)
     - Orientation estimate

6. Use response_mime_type="application/json" in GenerateContentConfig for structured output

7. Include error handling for:
   - API failures
   - Invalid JSON responses
   - Rate limiting

8. Add retry logic with exponential backoff (3 attempts)

Environment variable: GEMINI_API_KEY

The extraction prompt should be:
"Analyze this bedroom image and extract all objects. Return JSON with exact schema:
{
  'room_dimensions': {'width': float, 'height': float},
  'objects': [
    {
      'id': 'label_index',
      'label': 'bed|desk|chair|door|window|wall|dresser|nightstand',
      'bbox': [x_percent, y_percent, width_percent, height_percent],
      'type': 'movable|structural',
      'orientation': 'north|south|east|west|null'
    }
  ]
}
Estimate room dimensions in feet based on typical furniture sizes.
Bounding boxes should be percentages (0-100) of image dimensions."
```

**Expected Code Structure:**
```python
import os
import json
import base64
from typing import Optional
from google import genai
from google.genai import types
import asyncio
from app.models.schemas import AnalyzeResponse, RoomObject, RoomDimensions

class VisionExtractor:
    def __init__(self):
        # Using Gemini Developer API with API key
        self.client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        self.model = "gemini-2.5-flash"  # Vision model
    
    async def extract_objects(self, image_base64: str, max_retries: int = 3) -> AnalyzeResponse:
        prompt = """Analyze this bedroom image and extract all objects. Return JSON with exact schema:
{
  "room_dimensions": {"width": float, "height": float},
  "objects": [
    {
      "id": "label_index",
      "label": "bed|desk|chair|door|window|wall|dresser|nightstand",
      "bbox": [x_percent, y_percent, width_percent, height_percent],
      "type": "movable|structural",
      "orientation": "north|south|east|west|null"
    }
  ]
}
Estimate room dimensions in feet. Bounding boxes as percentages (0-100)."""

        image_data = base64.b64decode(image_base64)
        
        for attempt in range(max_retries):
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=[
                        prompt,
                        types.Part.from_bytes(data=image_data, mime_type="image/jpeg")
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                
                data = json.loads(response.text)
                
                return AnalyzeResponse(
                    room_dimensions=RoomDimensions(**data["room_dimensions"]),
                    objects=[RoomObject(**obj) for obj in data["objects"]]
                )
                
            except Exception as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise RuntimeError(f"Vision extraction failed: {e}")
```

---

### Task 1.5: Backend - Spatial Constraint Engine with Shapely

**Prompt for Antigravity:**
```
Create /backend/app/core/constraints.py with spatial constraint validation using Shapely.

Requirements:
1. Install shapely: pip install shapely

2. Create a ConstraintEngine class with these methods:

   a) bbox_to_polygon(bbox: List[float], room_dims: RoomDimensions) -> Polygon
      - Convert percentage bbox to Shapely Polygon in feet
   
   b) check_collision(obj1: RoomObject, obj2: RoomObject, room_dims) -> bool
      - Return True if objects overlap
   
   c) check_clearance(obj: RoomObject, all_objects: List[RoomObject], room_dims, min_clearance: float = 2.0) -> bool
      - Return True if object has minimum 2ft (24 inches) clearance around it
      - Use buffer() to create clearance zone
   
   d) check_door_access(door: RoomObject, all_objects: List[RoomObject], room_dims) -> bool
      - Create a 3ft x 3ft access zone in front of door
      - Return True if zone is clear
   
   e) validate_layout(objects: List[RoomObject], room_dims: RoomDimensions) -> List[str]
      - Run all constraint checks
      - Return list of violation strings (empty if all pass)
   
   f) generate_clearance_zones(objects: List[RoomObject], room_dims) -> List[Dict]
      - Return list of rectangles representing clearance zones for visualization

3. Constants:
   - MIN_WALKING_CLEARANCE = 2.0 (feet)
   - DOOR_ACCESS_WIDTH = 3.0 (feet)
   - DOOR_ACCESS_DEPTH = 3.0 (feet)
```

**Expected Code:**
```python
from typing import List, Dict, Tuple
from shapely.geometry import Polygon, box
from shapely.prepared import prep
from app.models.schemas import RoomObject, RoomDimensions

MIN_WALKING_CLEARANCE = 2.0  # feet
DOOR_ACCESS_WIDTH = 3.0  # feet
DOOR_ACCESS_DEPTH = 3.0  # feet

class ConstraintEngine:
    
    def bbox_to_polygon(self, bbox: List[float], room_dims: RoomDimensions) -> Polygon:
        """Convert percentage bbox [x, y, w, h] to Shapely Polygon in feet."""
        x_pct, y_pct, w_pct, h_pct = bbox
        x = (x_pct / 100) * room_dims.width
        y = (y_pct / 100) * room_dims.height
        w = (w_pct / 100) * room_dims.width
        h = (h_pct / 100) * room_dims.height
        return box(x, y, x + w, y + h)
    
    def check_collision(self, obj1: RoomObject, obj2: RoomObject, room_dims: RoomDimensions) -> bool:
        """Return True if objects overlap."""
        poly1 = self.bbox_to_polygon(obj1.bbox, room_dims)
        poly2 = self.bbox_to_polygon(obj2.bbox, room_dims)
        return poly1.intersects(poly2) and not poly1.touches(poly2)
    
    def check_clearance(self, obj: RoomObject, all_objects: List[RoomObject], 
                        room_dims: RoomDimensions, min_clearance: float = MIN_WALKING_CLEARANCE) -> bool:
        """Return True if object has minimum clearance around it."""
        obj_poly = self.bbox_to_polygon(obj.bbox, room_dims)
        clearance_zone = obj_poly.buffer(min_clearance)
        
        for other in all_objects:
            if other.id == obj.id:
                continue
            other_poly = self.bbox_to_polygon(other.bbox, room_dims)
            if clearance_zone.intersects(other_poly):
                return False
        return True
    
    def check_door_access(self, door: RoomObject, all_objects: List[RoomObject], 
                          room_dims: RoomDimensions) -> bool:
        """Return True if door access zone is clear."""
        door_poly = self.bbox_to_polygon(door.bbox, room_dims)
        centroid = door_poly.centroid
        
        # Create access zone in front of door (simplified)
        access_zone = box(
            centroid.x - DOOR_ACCESS_WIDTH / 2,
            centroid.y,
            centroid.x + DOOR_ACCESS_WIDTH / 2,
            centroid.y + DOOR_ACCESS_DEPTH
        )
        
        for obj in all_objects:
            if obj.id == door.id or obj.type == "structural":
                continue
            obj_poly = self.bbox_to_polygon(obj.bbox, room_dims)
            if access_zone.intersects(obj_poly):
                return False
        return True
    
    def validate_layout(self, objects: List[RoomObject], room_dims: RoomDimensions) -> List[str]:
        """Run all constraint checks, return list of violations."""
        violations = []
        movable = [o for o in objects if o.type == "movable"]
        doors = [o for o in objects if o.label == "door"]
        
        # Check collisions
        for i, obj1 in enumerate(movable):
            for obj2 in movable[i+1:]:
                if self.check_collision(obj1, obj2, room_dims):
                    violations.append(f"Collision: {obj1.id} overlaps with {obj2.id}")
        
        # Check clearance
        for obj in movable:
            if not self.check_clearance(obj, objects, room_dims):
                violations.append(f"Clearance: {obj.id} lacks 24-inch walking clearance")
        
        # Check door access
        for door in doors:
            if not self.check_door_access(door, objects, room_dims):
                violations.append(f"Door blocked: Access to {door.id} is obstructed")
        
        return violations
    
    def generate_clearance_zones(self, objects: List[RoomObject], room_dims: RoomDimensions) -> List[Dict]:
        """Generate clearance zone rectangles for visualization."""
        zones = []
        for obj in objects:
            if obj.type == "movable":
                poly = self.bbox_to_polygon(obj.bbox, room_dims)
                buffered = poly.buffer(MIN_WALKING_CLEARANCE)
                bounds = buffered.bounds  # (minx, miny, maxx, maxy)
                zones.append({
                    "object_id": obj.id,
                    "bounds": list(bounds),
                    "type": "clearance"
                })
        return zones
```

---

### Task 1.6: Backend - Layout Solver

**Prompt for Antigravity:**
```
Create /backend/app/agents/solver_node.py with a heuristic layout optimizer.

Requirements:
1. Create a LayoutSolver class with method:
   async def optimize(request: OptimizeRequest) -> OptimizeResponse

2. The solver should:
   a) Keep locked objects in place
   b) For unlocked movable objects, try to:
      - Maintain minimum clearance (24 inches)
      - Keep desk near window (soft preference)
      - Keep nightstand near bed (soft preference)
      - Keep door access clear (hard constraint)
   
3. Use a simple iterative approach:
   - Generate candidate positions by shifting objects
   - Score each layout based on constraints + preferences
   - Keep best valid layout
   - Max 100 iterations

4. Scoring function:
   - -100 points per collision
   - -50 points per clearance violation
   - -200 points if door is blocked
   - +20 points if desk is within 3ft of window
   - +10 points if nightstand is within 2ft of bed

5. Return explanation of changes made

6. Integrate with ConstraintEngine for validation
```

---

### Task 1.7: Backend - Requirements & Environment

**Prompt for Antigravity:**
```
Create /backend/requirements.txt with all dependencies:

fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0
python-dotenv>=1.0.0
google-genai>=0.4.0
shapely>=2.0.0
pillow>=10.0.0
python-multipart>=0.0.6
httpx>=0.26.0

Also create /backend/.env.example:
# Gemini Developer API
GEMINI_API_KEY=your_api_key_here

# Model names
MODEL_NAME=gemini-2.5-flash
IMAGE_MODEL_NAME=gemini-2.5-flash-image

# Logging
LOG_LEVEL=INFO
```

---

### Task 1.8: Frontend - Next.js Setup

**Prompt for Antigravity:**
```
Initialize the Next.js frontend in /frontend with:

1. Next.js 14 with App Router
2. TypeScript strict mode
3. Tailwind CSS
4. These dependencies:
   - react-konva and konva for canvas
   - axios for API calls
   - lucide-react for icons
   - @radix-ui/react-dialog for modals
   - react-dropzone for file upload

Create package.json with scripts:
- dev: next dev
- build: next build
- start: next start
- lint: next lint

Create tailwind.config.ts with custom colors:
- primary: blue-600
- secondary: slate-600
- accent: emerald-500
- danger: red-500
```

---

### Task 1.9: Frontend - TypeScript Types

**Prompt for Antigravity:**
```
Create /frontend/lib/types.ts with TypeScript interfaces matching the backend schemas:

export interface RoomObject {
  id: string;
  label: string;
  bbox: [number, number, number, number]; // [x, y, width, height] percentages
  type: 'movable' | 'structural';
  orientation?: 'north' | 'south' | 'east' | 'west' | null;
  locked: boolean;
}

export interface RoomDimensions {
  width: number;
  height: number;
}

export interface AnalyzeResponse {
  room_dimensions: RoomDimensions;
  objects: RoomObject[];
  image_id: string;
}

export interface OptimizeRequest {
  current_layout: RoomObject[];
  locked_object_ids: string[];
  room_dimensions: RoomDimensions;
}

export interface OptimizeResponse {
  new_layout: RoomObject[];
  explanation: string;
  constraint_violations: string[];
  overlays: {
    walking_paths?: number[][];
    clearance_zones?: ClearanceZone[];
  };
}

export interface ClearanceZone {
  object_id: string;
  bounds: [number, number, number, number];
  type: string;
}

export interface EditMask {
  region_mask: string; // base64 PNG
  instruction: string;
}

export interface RenderRequest {
  base_image: string;
  masks: EditMask[];
  layout_changes?: RoomObject[];
}

export interface RenderResponse {
  edited_image: string;
}

// App state
export interface AppState {
  image: string | null;
  imageId: string | null;
  roomDimensions: RoomDimensions | null;
  objects: RoomObject[];
  selectedObjectId: string | null;
  lockedObjectId: string | null;
  isAnalyzing: boolean;
  isOptimizing: boolean;
  isRendering: boolean;
  editMasks: EditMask[];
  explanation: string;
  violations: string[];
}
```

---

### Task 1.10: Frontend - API Hooks

**Prompt for Antigravity:**
```
Create API hooks in /frontend/hooks/:

1. useAnalyze.ts:
   - POST to /api/v1/analyze
   - Accept image as base64
   - Return { analyze, isLoading, error, data }
   - Handle loading and error states

2. useOptimize.ts:
   - POST to /api/v1/optimize
   - Accept OptimizeRequest
   - Return { optimize, isLoading, error, data }

3. useRender.ts:
   - POST to /api/v1/render
   - Accept RenderRequest
   - Return { render, isLoading, error, data }

Use axios with base URL from environment variable NEXT_PUBLIC_API_URL (default: http://localhost:8000)

Each hook should:
- Use React useState for loading/error/data
- Return an async function to trigger the API call
- Handle errors gracefully with try/catch
- Set loading states properly
```

**Expected useAnalyze.ts:**
```typescript
import { useState, useCallback } from 'react';
import axios from 'axios';
import { AnalyzeResponse } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useAnalyze() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResponse | null>(null);

  const analyze = useCallback(async (imageBase64: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post<AnalyzeResponse>(
        `${API_URL}/api/v1/analyze`,
        { image: imageBase64 }
      );
      setData(response.data);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Analysis failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { analyze, isLoading, error, data };
}
```

---

### Task 1.11: Frontend - Image Upload Component

**Prompt for Antigravity:**
```
Create /frontend/components/ImageUpload.tsx:

A drag-and-drop image upload component using react-dropzone with:

1. Visual states:
   - Default: Dashed border box with upload icon and "Drop bedroom image here"
   - Drag active: Blue border, light blue background
   - Has image: Show thumbnail preview with "Change image" overlay on hover

2. Functionality:
   - Accept only images (jpg, png, webp)
   - Max file size: 10MB
   - Convert to base64 on upload
   - Call onImageSelect callback with base64 string

3. Styling:
   - Centered in container
   - Min height 300px
   - Rounded corners
   - Smooth transitions

Props:
- onImageSelect: (base64: string) => void
- currentImage?: string | null
- disabled?: boolean

Use Tailwind CSS and lucide-react for icons (Upload, Image, X)
```

---

### Task 1.12: Frontend - Canvas Overlay Component

**Prompt for Antigravity:**
```
Create /frontend/components/CanvasOverlay.tsx using react-konva:

A canvas component that overlays on the room image showing:

1. Object bounding boxes:
   - Rectangle for each RoomObject
   - Color coding:
     - Locked object: Green border (3px), green fill (10% opacity)
     - Selected object: Blue border (2px), blue fill (10% opacity)  
     - Movable objects: Yellow border (1px)
     - Structural objects: Gray border (1px dashed)
   - Label text above each box

2. Interactivity:
   - Click on object to select it
   - Double-click to toggle lock (only one object can be locked)
   - Hover effect: slight border thickness increase

3. Overlay visualizations (when available):
   - Clearance zones: Semi-transparent orange rectangles
   - Walking paths: Dashed green lines

4. Mask painting mode (for surgical edits):
   - When enabled, allow freehand drawing on canvas
   - Semi-transparent red brush
   - Generate mask as PNG with alpha channel

Props:
- imageUrl: string (the room image as data URL)
- objects: RoomObject[]
- selectedObjectId: string | null
- lockedObjectId: string | null
- overlays?: { clearance_zones?: ClearanceZone[], walking_paths?: number[][] }
- onObjectSelect: (id: string) => void
- onObjectLock: (id: string) => void
- maskMode?: boolean
- onMaskComplete?: (maskBase64: string) => void

Use Stage and Layer from react-konva.
Image dimensions should be responsive to container.
```

---

### Task 1.13: Frontend - Main Page Layout

**Prompt for Antigravity:**
```
Create /frontend/app/page.tsx as the main application page:

Layout (using Tailwind CSS grid):
┌─────────────────────────────────────────────────────────────┐
│  Header: "Pocket Planner" logo + subtitle                   │
├────────────────────────────────────┬────────────────────────┤
│                                    │   Control Panel        │
│                                    │   ─────────────────    │
│   Canvas Area (70%)                │   1. Upload Section    │
│   - ImageUpload (when no image)    │   2. Object List       │
│   - CanvasOverlay (when image)     │   3. Lock Controls     │
│                                    │   4. Edit Actions      │
│                                    │   5. Explanation Box   │
│                                    │                        │
├────────────────────────────────────┴────────────────────────┤
│  Footer: Constraint violations / status bar                 │
└─────────────────────────────────────────────────────────────┘

State management:
- Use React useState for AppState
- Initialize with empty state

Flow:
1. User uploads image → call analyze API → populate objects
2. User selects object → highlight in canvas
3. User locks object (double-click) → update lockedObjectId
4. User clicks "Optimize" → call optimize API → update layout
5. User draws mask + enters instruction → call render API → update image

Include loading spinners and error toasts.
```

---

### Task 1.14: Frontend - Control Panel Component

**Prompt for Antigravity:**
```
Create /frontend/components/ControlPanel.tsx:

A sidebar panel with these sections:

1. Upload Section (when no image):
   - Embed ImageUpload component
   - "Analyze Room" button (disabled until image selected)

2. Object List (when objects available):
   - Scrollable list of detected objects
   - Each item shows:
     - Icon based on label (bed, desk, chair, etc.)
     - Object ID and type badge (movable/structural)
     - Lock icon (🔒) if locked
   - Click to select, shows selected state
   - Small "Lock" button next to movable objects

3. Optimization Controls:
   - "Optimize Layout" button
   - Disabled if no object is locked
   - Shows loading spinner when optimizing

4. Surgical Edit Section:
   - Toggle for "Mask Mode" to enable drawing
   - Text input for edit instruction
   - "Apply Edit" button
   - List of pending edits with remove option

5. Explanation Panel:
   - Collapsible section showing solver explanation
   - Bullet points for changes made

Props:
- state: AppState
- onAnalyze: () => void
- onOptimize: () => void
- onObjectSelect: (id: string) => void
- onObjectLock: (id: string) => void
- onMaskModeToggle: () => void
- onAddEdit: (instruction: string, mask: string) => void
- onApplyEdits: () => void
- onRemoveEdit: (index: number) => void
```

---

## PHASE 1 COMPLETE - Push to Git

```bash
git add .
git commit -m "Complete Phase 1: MVP with backend API, Gemini vision, constraint engine, and React frontend"
git push origin main
```

**Review checklist before pushing:**
- [ ] Backend server runs: `uvicorn main:app --reload`
- [ ] Frontend runs: `npm run dev`
- [ ] /health endpoint returns OK
- [ ] Image upload works
- [ ] Canvas displays bounding boxes
- [ ] Object selection works

---

## PHASE 2: Integration & Polish

### Task 2.1: Gemini Image Editing Integration

**Prompt for Antigravity:**
```
Create /backend/app/agents/render_node.py for surgical image editing:

IMPORTANT: We are using the Gemini Developer API with gemini-2.5-flash-image model.

Requirements:
1. Use google-genai SDK with API key authentication
2. Create an ImageEditor class with method:
   async def apply_edits(base_image: str, masks: List[EditMask]) -> str

3. Initialize client:
   from google import genai
   client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

4. Use model: "gemini-2.5-flash-image" for image generation/editing

5. For each mask:
   - Combine base image with mask
   - Send to Gemini with edit instruction
   - The mask should indicate which region to edit

6. For image generation, use:
   config=types.GenerateContentConfig(
       response_modalities=["IMAGE"],
   )

7. If Gemini doesn't support direct mask-based editing:
   - Implement a fallback using inpainting-style prompts
   - Describe the region to edit based on mask location
   - Use prompt like: "Edit the [region description] area: [instruction]"

8. Return the final edited image as base64

Note: Test whether gemini-2.5-flash-image supports mask-based editing directly.
If not, document the fallback approach used.
```

---

### Task 2.2: Frontend Mask Drawing Enhancement

**Prompt for Antigravity:**
```
Enhance CanvasOverlay.tsx with proper mask drawing:

1. When maskMode is true:
   - Show a brush size selector (small/medium/large)
   - Mouse/touch drawing creates semi-transparent red strokes
   - Store strokes as an array of points

2. "Complete Mask" button:
   - Creates a new canvas with white background
   - Draws all strokes in black
   - Exports as PNG with alpha channel
   - Black areas = edit region, white = preserve
   - Calls onMaskComplete with base64 string

3. "Clear Mask" button to reset strokes

4. Visual feedback:
   - Cursor changes to circle matching brush size
   - Preview of mask area as you draw

Use Konva's Line component for strokes.
```

---

### Task 2.3: Error Handling & Loading States

**Prompt for Antigravity:**
```
Add comprehensive error handling throughout the app:

Backend:
1. Create /backend/app/core/exceptions.py with custom exceptions:
   - VisionExtractionError
   - ConstraintViolationError
   - RenderingError

2. Add exception handlers in main.py that return proper HTTP status codes

3. Add request validation middleware for base64 images

Frontend:
1. Create /frontend/components/ErrorBoundary.tsx
2. Add toast notifications for errors (use react-hot-toast)
3. Add skeleton loaders for:
   - Image analysis (pulsing boxes)
   - Optimization (spinner with "Calculating...")
   - Rendering (progress indicator)
```

---

### Task 2.4: Visualization Enhancements

**Prompt for Antigravity:**
```
Enhance the visual feedback in CanvasOverlay.tsx:

1. Add animated transitions when objects move during optimization:
   - Smooth position interpolation over 500ms
   - Fade effect for constraint zone updates

2. Add constraint violation highlights:
   - Red pulsing border on objects with violations
   - Tooltip showing specific violation

3. Add door access zone visualization:
   - When door is selected, show 3x3ft access zone
   - Color: green if clear, red if blocked

4. Add measurement display:
   - Show dimensions in feet when hovering objects
   - Show clearance distances between objects
```

---

## PHASE 2 COMPLETE - Push to Git

```bash
git add .
git commit -m "Complete Phase 2: Image editing, mask drawing, error handling, enhanced visualizations"
git push origin main
```

---

## Frontend Visual Design Reference

```
┌──────────────────────────────────────────────────────────────────────┐
│  🏠 Pocket Planner                              [Dark Mode Toggle]   │
│  Spatial Optimization for Small Bedrooms                             │
├─────────────────────────────────────────┬────────────────────────────┤
│                                         │  📤 UPLOAD                 │
│                                         │  ┌──────────────────────┐  │
│                                         │  │   Drop image here    │  │
│                                         │  │   or click to browse │  │
│                                         │  └──────────────────────┘  │
│                                         │  [Analyze Room]            │
│      ┌─────────────────────────┐        │                            │
│      │                         │        │  📦 OBJECTS (5)            │
│      │    Room Image with      │        │  ├─ 🛏️ bed_1 [movable] 🔒  │
│      │    Bounding Boxes       │        │  ├─ 🪑 desk_1 [movable]    │
│      │    and Overlays         │        │  ├─ 💺 chair_1 [movable]   │
│      │                         │        │  ├─ 🚪 door_1 [structural] │
│      │   ┌───┐                 │        │  └─ 🪟 window_1 [structural]│
│      │   │bed│  ┌────┐         │        │                            │
│      │   │ 🔒│  │desk│         │        │  🔧 OPTIMIZE               │
│      │   └───┘  └────┘         │        │  Lock one object, then:    │
│      │          ┌──┐           │        │  [Optimize Layout]         │
│      │    [door]│  │[window]   │        │                            │
│      │          └──┘           │        │  ✏️ SURGICAL EDITS         │
│      │                         │        │  [ ] Enable mask drawing   │
│      └─────────────────────────┘        │  Instruction:              │
│                                         │  [________________]        │
│      Scale: 12ft x 10ft                 │  [Add Edit] [Apply All]    │
│                                         │                            │
│                                         │  💬 EXPLANATION            │
│                                         │  • Moved desk near window  │
│                                         │  • Maintained 24" clearance│
│                                         │  • Door access preserved   │
├─────────────────────────────────────────┴────────────────────────────┤
│  ⚠️ Warnings: None  │  ✅ All constraints satisfied                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Key API Contracts

### POST /api/v1/analyze
```json
// Request
{
  "image": "base64_encoded_image_string"
}

// Response 200
{
  "room_dimensions": { "width": 12.0, "height": 10.0 },
  "objects": [
    {
      "id": "bed_1",
      "label": "bed",
      "bbox": [10.0, 20.0, 40.0, 30.0],
      "type": "movable",
      "orientation": "north",
      "locked": false
    }
  ],
  "image_id": "uuid-string"
}
```

### POST /api/v1/optimize
```json
// Request
{
  "current_layout": [...],
  "locked_object_ids": ["bed_1"],
  "room_dimensions": { "width": 12.0, "height": 10.0 }
}

// Response 200
{
  "new_layout": [...],
  "explanation": "Moved desk to window for natural light...",
  "constraint_violations": [],
  "overlays": {
    "walking_paths": [[0,0,5,5], [5,5,10,10]],
    "clearance_zones": [{"object_id": "bed_1", "bounds": [8,18,44,34]}]
  }
}
```

### POST /api/v1/render
```json
// Request
{
  "base_image": "base64_encoded_image",
  "masks": [
    {
      "region_mask": "base64_png_with_alpha",
      "instruction": "Repaint this wall navy blue"
    }
  ],
  "layout_changes": null
}

// Response 200
{
  "edited_image": "base64_encoded_result"
}
```

---

## Environment Variables

### Backend (.env)
```bash
# Gemini Developer API
GEMINI_API_KEY=your_api_key_here

# Model names
MODEL_NAME=gemini-2.5-flash
IMAGE_MODEL_NAME=gemini-2.5-flash-image

# Logging
LOG_LEVEL=INFO
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Running the Development Servers

### Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and add your API key
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Run the server
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Run the development server
npm run dev
```

### Testing the API
```bash
# Health check
curl http://localhost:8000/health

# Test analyze endpoint (with mock)
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_string_here"}'
```