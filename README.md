# 🏠 Pocket Planner

**AI-Powered Interior Design Assistant** — Upload a floor plan, get instant layout suggestions, and visualize your space in 3D.

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Gemini](https://img.shields.io/badge/Google-Gemini%20AI-4285F4?logo=google)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

### 🔍 AI Vision Analysis
Upload a floor plan or room photo. Gemini Vision detects walls, windows, doors, and furniture — creating a digital twin of your space.

### 🧠 Generative Layout Designer
Get **3 distinct layout variations** tailored to your needs:
- **Work Focused** — Optimized for productivity with desk near natural light
- **Cozy & Relaxing** — Intimate arrangement prioritizing comfort
- **Creative & Bold** — Unconventional diagonal layouts for visual interest

### 🎨 Photorealistic Previews
Each layout variation includes an AI-edited preview of your actual floor plan with furniture repositioned.

### 🏗️ 3D Perspective View
Select a layout and generate a photorealistic 3D perspective render to feel the space before moving furniture.

### 💬 Conversational Editor
Chat with your design! Natural language commands like:
- *"Move the desk closer to the window"*
- *"Rotate the bed 90 degrees"*
- *"Make it more cozy"*

---

## 🖼️ How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Upload Floor   │────▶│  AI Analyzes    │────▶│  Generate 3     │
│  Plan Image     │     │  & Detects      │     │  Layout Options │
└─────────────────┘     │  Objects        │     └────────┬────────┘
                        └─────────────────┘              │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Chat Editor    │◀────│  3D Perspective │◀────│  Select Your    │
│  Fine-tune      │     │  Visualization  │     │  Favorite       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** — High-performance Python API
- **LangGraph** — Stateful agent orchestration
- **Google Gemini** — Vision analysis, layout reasoning, image generation
- **Shapely** — Geometric operations & collision detection
- **Pydantic** — Data validation

### Frontend
- **Next.js 16** — React framework with App Router
- **React 19** — UI components
- **Konva** — Canvas-based floor plan rendering
- **Tailwind CSS 4** — Styling
- **Axios** — API communication

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Google AI API Key ([Get one here](https://aistudio.google.com/apikey))

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/pocket-planner.git
cd pocket-planner
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Edit `.env` with your API key:

```bash
# .env
GOOGLE_API_KEY=your_google_api_key_here
MODEL_NAME=gemini-2.5-pro
IMAGE_MODEL_NAME=gemini-2.5-flash-image
LOG_LEVEL=INFO
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 📁 Project Structure

```
pocket-planner/
├── backend/
│   ├── app/
│   │   ├── agents/           # LangGraph agent nodes
│   │   │   ├── designer_node.py      # Layout generation
│   │   │   ├── vision_node.py        # Image analysis
│   │   │   ├── perspective_node.py   # 3D rendering
│   │   │   ├── chat_editor_node.py   # Conversational editing
│   │   │   └── graph.py              # LangGraph workflow
│   │   ├── core/             # Business logic
│   │   │   ├── constraints.py        # Spatial rules
│   │   │   ├── geometry.py           # Collision detection
│   │   │   └── scoring.py            # Layout quality scoring
│   │   ├── models/           # Pydantic schemas
│   │   │   ├── api.py                # Request/Response models
│   │   │   ├── room.py               # Room & furniture models
│   │   │   └── state.py              # Agent state
│   │   ├── routes/           # API endpoints
│   │   │   ├── analyze.py            # POST /analyze
│   │   │   ├── optimize.py           # POST /optimize
│   │   │   ├── render.py             # POST /render
│   │   │   └── chat.py               # POST /chat
│   │   ├── tools/            # Gemini tool wrappers
│   │   │   ├── edit_image.py         # Image editing
│   │   │   └── generate_image.py     # Image generation
│   │   ├── config.py         # Settings & configuration
│   │   └── main.py           # FastAPI application
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   │   ├── page.tsx              # Main application
│   │   │   ├── layout.tsx            # Root layout
│   │   │   └── globals.css           # Global styles
│   │   ├── components/       # React components
│   │   │   ├── CanvasOverlay.tsx     # Floor plan canvas
│   │   │   ├── ImageUpload.tsx       # Image upload
│   │   │   ├── LayoutSelector.tsx    # Layout variation cards
│   │   │   ├── PerspectiveView.tsx   # 3D view display
│   │   │   ├── ChatEditor.tsx        # Chat interface
│   │   │   └── Sidebar.tsx           # Object list sidebar
│   │   ├── hooks/            # Custom React hooks
│   │   │   ├── useAnalyze.ts
│   │   │   ├── useOptimize.ts
│   │   │   ├── usePerspective.ts
│   │   │   └── useChatEdit.ts
│   │   └── lib/              # Utilities
│   │       ├── api.ts                # API client
│   │       └── types.ts              # TypeScript types
│   ├── package.json
│   └── .env.example
│
├── docs/
│   └── test_img.jpg          # Sample floor plan for testing
│
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/analyze` | Analyze floor plan, detect objects |
| `POST` | `/api/v1/optimize` | Generate 3 layout variations |
| `POST` | `/api/v1/render/perspective` | Generate 3D perspective view |
| `POST` | `/api/v1/chat/edit` | Process natural language edits |
| `GET` | `/health` | Health check |

### Example: Analyze a Floor Plan

```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "your_base64_encoded_image"}'
```

### Example: Generate Layouts

```bash
curl -X POST http://localhost:8000/api/v1/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "current_layout": [...],
    "room_dimensions": {"width_estimate": 100, "height_estimate": 100},
    "locked_ids": [],
    "image_base64": "your_base64_encoded_image"
  }'
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Google AI API key | Required |
| `MODEL_NAME` | Gemini model for reasoning | `gemini-2.5-flash` |
| `IMAGE_MODEL_NAME` | Gemini model for images | `gemini-2.5-flash-image` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `LANGCHAIN_TRACING_V2` | Enable LangSmith tracing | `false` |
| `LANGCHAIN_API_KEY` | LangSmith API key | Optional |

---

## 🧪 Development

### Running Tests

```bash
cd backend
pytest
```

### Code Formatting

```bash
# Backend
cd backend
black app/
ruff check app/

# Frontend
cd frontend
npm run lint
```

### Type Checking

```bash
# Backend
cd backend
mypy app/

# Frontend
cd frontend
npx tsc --noEmit
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Google Gemini](https://deepmind.google/technologies/gemini/) for AI capabilities
- [LangGraph](https://github.com/langchain-ai/langgraph) for agent orchestration
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [Next.js](https://nextjs.org/) for the frontend framework

---

<p align="center">
  Made with ❤️ for better living spaces
</p>