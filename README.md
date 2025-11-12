# QueryMind

QueryMind is an intelligent data analytics application that allows users to query a Brazilian e-commerce database using natural language. The system intelligently routes queries to appropriate handlers (SQL generation, semantic search, or external tools) and automatically generates visualizations based on the results.

## Screenshots

### Main Interface
![QueryMind Main Interface](docs/screenshots/main-interface.png)
*The main QueryMind interface showing the chat panel, visualization panel, and AI-generated insights*

### Query Results with Visualization
![Query Results](docs/screenshots/query-results.png)
*Example query results showing interactive bar charts and data insights*

> **Note:** Additional screenshots (dark mode, export menu, AI insights) can be added to showcase more features. See `docs/screenshots/README.md` for guidance on taking and adding more screenshots.

## Features

### Core Capabilities
- **Natural Language Querying** - Ask questions in plain English, no SQL knowledge required
- **Intelligent Query Routing** - Automatically classifies and routes queries to the appropriate handler
- **SQL Generation** - Converts natural language to optimized SQL queries using AI
- **Semantic Search** - Find products using meaning and context, not just keywords
- **Automatic Visualization** - Smart chart generation based on your data
- **AI-Powered Insights** - Get professional analysis and recommendations from your results

### User Experience
- **Dark Mode** - Beautiful dark theme with full UI support
- **Export Functionality** - Download data in CSV, JSON, PNG, or PDF formats
- **Voice Input** - Speak your queries using browser speech recognition
- **Conversation Memory** - Context-aware follow-up queries
- **Multi-language Support** - Portuguese to English translation built-in

## Architecture

### System Overview

QueryMind follows a microservices-inspired architecture with clear separation between frontend, backend, and data layers. The system uses LangGraph for intelligent workflow orchestration, routing queries through specialized agents based on intent classification.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE LAYER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        React Frontend (TypeScript)                   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │  │ Chat Panel   │  │ Viz Panel    │  │  Insights Panel          │  │   │
│  │  │              │  │              │  │  (AI-Generated)          │  │   │
│  │  │ • Messages   │  │ • Charts     │  │                          │  │   │
│  │  │ • Voice Input│  │ • Tables     │  │ • Pattern Analysis       │  │   │
│  │  │ • Examples   │  │ • Export     │  │ • Trend Detection        │  │   │
│  │  │              │  │   (CSV/JSON/ │  │ • Recommendations        │  │   │
│  │  │              │  │    PNG/PDF)  │  │                          │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │   │
│  │                                                                       │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │              Theme Toggle (Light/Dark Mode)                  │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    │ HTTP/REST API                           │
│                                    ▼                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FastAPI Backend (Python)                          │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │  POST /api/chat/query  │  POST /api/translate                │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    │ LangGraph Workflow                      │
│                                    ▼                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        WORKFLOW ORCHESTRATION LAYER                          │
│                          (LangGraph State Machine)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Query Entry Point                            │   │
│  │                    (Initial State Creation)                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    INTENT CLASSIFIER AGENT                           │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │  Uses Google Gemini to classify query into:                  │   │   │
│  │  │  • analytical  → SQL queries needed                          │   │   │
│  │  │  • semantic    → Vector search needed                        │   │   │
│  │  │  • tool        → External API needed                         │   │   │
│  │  │  • conversational → General chat                             │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                    ┌───────────────┼───────────────┐                        │
│                    │               │               │                        │
│                    ▼               ▼               ▼                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  ANALYTICAL  │  │   SEMANTIC   │  │     TOOL     │  │CONVERSATIONAL│  │
│  │    AGENT     │  │    AGENT     │  │    AGENT     │  │    AGENT     │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤  │
│  │ 1. Enhance   │  │ 1. Enhance   │  │ 1. Enhance   │  │ 1. Enhance   │  │
│  │    Query     │  │    Query     │  │    Query     │  │    Query     │  │
│  │    (Memory)  │  │    (Memory)  │  │    (Memory)  │  │    (Memory)  │  │
│  │              │  │              │  │              │  │              │  │
│  │ 2. Generate  │  │ 2. Generate  │  │ 2. Call      │  │ 2. Generate  │  │
│  │    SQL       │  │    Embedding │  │    External  │  │    Response  │  │
│  │    (Gemini)  │  │    (OpenAI)  │  │    Tool      │  │    (Gemini)  │  │
│  │              │  │              │  │              │  │              │  │
│  │ 3. Execute   │  │ 3. Vector    │  │              │  │              │  │
│  │    Query     │  │    Search    │  │              │  │              │  │
│  │    (Postgres)│  │    (ChromaDB)│  │              │  │              │  │
│  │              │  │              │  │              │  │              │  │
│  │ 4. Get       │  │ 4. Get       │  │              │  │              │  │
│  │    Results   │  │    Results   │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                 │                 │                 │            │
│         └─────────────────┴─────────────────┴─────────────────┘            │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      VISUALIZER AGENT                                │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │  Analyzes results and generates visualization config:         │   │   │
│  │  │  • Chart type (bar, line, table, map, text)                  │   │   │
│  │  │  • Axis mappings                                             │   │   │
│  │  │  • Color schemes                                             │   │   │
│  │  │  Uses Google Gemini for intelligent chart selection          │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    INSIGHTS GENERATOR AGENT                          │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │  Generates AI-powered insights from query results:            │   │   │
│  │  │  • Pattern detection                                         │   │   │
│  │  │  • Trend analysis                                            │   │   │
│  │  │  • Anomaly identification                                    │   │   │
│  │  │  • Actionable recommendations                                │   │   │
│  │  │  Uses Google Gemini for professional business insights       │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Response Assembly                            │   │
│  │  Combines: results + visualization_config + insights + message      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Update Conversation Memory                      │   │
│  │                    (Supermemory - Optional)                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│                         Return Final State to API                           │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA & SERVICE LAYER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ PostgreSQL   │  │  ChromaDB    │  │ Google       │  │   OpenAI     │   │
│  │  Database    │  │  Vector Store│  │ Gemini       │  │  Embeddings  │   │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤   │
│  │ • Products   │  │ • Product    │  │ • Intent     │  │ • Text       │   │
│  │ • Orders     │  │   Embeddings │  │   Classify   │  │   Embeddings │   │
│  │ • Sellers    │  │ • Semantic   │  │ • SQL Gen    │  │ • Semantic   │   │
│  │ • Customers  │  │   Search     │  │ • Viz Config │  │   Search     │   │
│  │ • Reviews    │  │ • Similarity │  │ • Insights   │  │   Support    │   │
│  │ • Payments   │  │   Matching   │  │ • Chat       │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │ Supermemory  │  │  Wikipedia   │  │ Translation  │                      │
│  │   (Memory)   │  │    API       │  │   Services   │                      │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤                      │
│  │ • Context    │  │ • Definitions│  │ • PT → EN    │                      │
│  │ • History    │  │ • Knowledge  │  │ • Multi-lang │                      │
│  │ • Follow-ups │  │   Base       │  │   Support    │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

```

### How It Works

**Intent Classification** → The system analyzes your query and routes it to the appropriate handler:
- **Analytical** queries trigger SQL generation and database execution
- **Semantic** queries use vector search to find relevant products
- **Tool** queries access external APIs for definitions and translations
- **Conversational** queries generate contextual responses

**Hybrid Search** → Combines structured SQL queries with semantic vector search for comprehensive results

**Smart Visualization** → AI analyzes your results and automatically selects the best chart type

**Context Awareness** → Maintains conversation context for natural follow-up queries

### Technology Stack

**Backend:**
- FastAPI: Modern Python web framework
- LangGraph: Workflow orchestration
- PostgreSQL: Relational database
- ChromaDB: Vector database for semantic search
- Google Gemini: LLM for query understanding and SQL generation
- OpenAI: Text embeddings for semantic search
- Supermemory: Conversation memory management
- asyncpg: Async PostgreSQL driver

**Frontend:**
- React 19: UI framework
- TypeScript: Type safety
- Vite: Build tool and dev server
- Plotly.js: Advanced visualizations
- Recharts: React charting library
- Radix UI: Accessible component primitives

## Prerequisites

- Python 3.9+
- Node.js 18+ and npm
- PostgreSQL 12+
- API Keys:
  - Google Gemini API key
  - OpenAI API key (for embeddings)
  - Supermemory API key (optional, for conversation memory)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd QueryMind
```

### 2. Backend Setup

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=postgres
DB_PASSWORD=your_password

# API Keys
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
SUPERMEMORY_API_KEY=your_supermemory_api_key  # Optional
```

#### Set Up Database

1. Create a PostgreSQL database:
```bash
createdb your_database_name
```

2. Set up the database schema:
```bash
cd database
python setup_schema.py
```

3. Load the data:
```bash
python load_data.py
```

4. Build the vector database (for semantic search):
```bash
python build_vector_db.py
```

**Note:** The `build_vector_db.py` script processes all products and creates embeddings, which may take some time depending on the dataset size.

#### Run the Backend Server

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### 3. Frontend Setup

#### Install Dependencies

```bash
cd frontend
npm install
```

#### Run the Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4. Access the Application

Open your browser and navigate to `http://localhost:5173`


## Quick Start

Once the application is running, you can start querying your data immediately:

### Example Queries

**Analytical Queries:**
- `"Top 10 sellers by number of orders"`
- `"Show me the highest priced products"`
- `"What are the total sales by state?"`

**Semantic Search:**
- `"Find products with good reviews"`
- `"Show me reliable sellers"`
- `"Products with quality issues"`

**Definitions & Tools:**
- `"What is boleto?"`
- `"Translate this to English"`

### Using the Interface

1. **Type or Speak** - Enter your query in the chat panel or use the microphone icon
2. **View Results** - See your data visualized with interactive charts
3. **Explore Insights** - Review AI-generated insights and recommendations
4. **Export Data** - Download results in your preferred format
5. **Toggle Theme** - Switch between light and dark mode for comfortable viewing

## Project Structure

```
QueryMind/
├── backend/                    # FastAPI backend
│   ├── main.py                # API endpoints
│   ├── orchestrator.py        # LangGraph workflow
│   ├── database.py            # PostgreSQL integration
│   ├── vector_store.py        # ChromaDB semantic search
│   ├── memory.py              # Conversation memory
│   └── tools.py               # External APIs
│
├── frontend/                   # React + TypeScript
│   ├── src/
│   │   ├── App.tsx            # Main component
│   │   ├── components/
│   │   │   ├── VizRenderer.tsx    # Charts & visualizations
│   │   │   ├── InsightsPanel.tsx  # AI insights display
│   │   │   ├── VoiceInput.tsx     # Voice recognition
│   │   │   └── UserGuide.tsx      # Interactive guide
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx   # Dark mode support
│   │   └── utils/
│   │       └── exportUtils.ts     # Export functionality
│
├── database/                   # Setup scripts
│   ├── schema.sql
│   ├── setup_schema.py
│   ├── load_data.py
│   └── build_vector_db.py
│
├── docs/                       # Documentation
│   └── screenshots/            # App screenshots
│
├── data/                       # CSV data files
├── chroma_db/                  # Vector database (generated)
└── requirements.txt            # Python dependencies
```

## API Reference

### Query Endpoint

**POST** `/api/chat/query`

Process a natural language query and return results with visualization configuration and insights.

**Request Body:**
```json
{
  "message": "Top 10 sellers by number of orders",
  "conversation_id": "default",
  "user_id": "default"
}
```

**Response:**
```json
{
  "query": "Top 10 sellers by number of orders",
  "intent": "analytical",
  "sql_query": "SELECT seller_id, COUNT(*) as num_orders...",
  "results": [
    {"seller_id": "...", "num_orders": 1854},
    ...
  ],
  "visualization_config": {
    "type": "bar",
    "x_axis": "seller_id",
    "y_axis": "num_orders"
  },
  "insights": "• Concentrated Market Leadership: Top 3 sellers...",
  "message": "Found 10 results for your query."
}
```

### Translation Endpoint

**POST** `/api/translate`

Translate Portuguese text to English.

**Request Body:**
```json
{
  "text": "produtos com boas avaliações"
}
```

**Response:**
```json
{
  "translated": "products with good reviews"
}
```

## Key Highlights

- **Intelligent Query Processing** - Automatically routes queries to the right handler based on intent
- **Smart Visualizations** - AI-powered chart selection and generation
- **Actionable Insights** - Get professional business insights from your data
- **Dark Mode** - Beautiful dark theme for comfortable viewing
- **Export Options** - Download results in CSV, JSON, PNG, or PDF formats
- **Voice Input** - Speak your queries naturally
- **Multi-language** - Supports Portuguese to English translation

## Built With

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [LangGraph](https://github.com/langchain-ai/langgraph) - Workflow orchestration
- [React](https://react.dev/) - UI framework
- [PostgreSQL](https://www.postgresql.org/) - Relational database
- [ChromaDB](https://www.trychroma.com/) - Vector database
- [Google Gemini](https://deepmind.google/technologies/gemini/) - LLM for query understanding
- [OpenAI](https://openai.com/) - Text embeddings
- [Plotly.js](https://plotly.com/javascript/) & [Recharts](https://recharts.org/) - Data visualization

## Data Source

This project uses the [Olist Brazilian E-commerce Dataset](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce), which contains real e-commerce data from Brazilian orders.

---

**QueryMind** - Transform your data into insights with natural language queries.

