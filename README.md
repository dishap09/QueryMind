# QueryMind

QueryMind is an intelligent data analytics application that allows users to query a Brazilian e-commerce database using natural language. The system intelligently routes queries to appropriate handlers (SQL generation, semantic search, or external tools) and automatically generates visualizations based on the results.

## Features

- **Natural Language Querying**: Ask questions in plain English about your data
- **Intelligent Query Routing**: Automatically classifies queries into analytical, semantic, tool-based, or conversational intents
- **SQL Generation**: Converts natural language questions into SQL queries using LLM
- **Semantic Search**: Uses vector embeddings to find products based on meaning and context
- **Automatic Visualization**: Generates appropriate charts (bar, line, table) based on query results
- **Conversation Memory**: Maintains context across conversations using Supermemory
- **Voice Input**: Supports voice queries through the browser's Web Speech API
- **Multi-language Support**: Can translate Portuguese queries to English

## Architecture

### System Overview

QueryMind follows a microservices-inspired architecture with clear separation between frontend, backend, and data layers:

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│   FastAPI    │─────▶│ PostgreSQL  │
│  (React)    │      │   Backend    │      │  Database   │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ├─────▶ ChromaDB (Vector Store)
                            │
                            ├─────▶ Google Gemini (LLM)
                            │
                            ├─────▶ OpenAI (Embeddings)
                            │
                            └─────▶ Supermemory (Memory)
```

### Design Decisions

#### 1. **LangGraph Workflow Orchestration**
- Uses LangGraph's `StateGraph` to create a state machine for query processing
- Enables clear separation of concerns with dedicated agents for each intent type
- Makes the workflow easy to extend and debug

#### 2. **Intent-Based Routing**
The system classifies queries into four categories:
- **Analytical**: Queries requiring SQL execution (e.g., "Top 5 products", "Total sales")
- **Semantic**: Queries requiring RAG retrieval (e.g., "good products", "bad reviews")
- **Tool**: Queries requiring external APIs (e.g., "what is boleto?", translations)
- **Conversational**: General conversation queries

#### 3. **Hybrid Search Strategy**
- **Structured queries** → SQL generation with LLM
- **Unstructured queries** → Semantic search using ChromaDB vector store
- This hybrid approach ensures both precise analytical queries and fuzzy semantic queries work well

#### 4. **Context-Aware Query Enhancement**
- Uses conversation memory to enhance follow-up queries
- Example: If user asks "good reviews" then "bad reviews", the system understands the context

#### 5. **Automatic Visualization Generation**
- LLM analyzes query results and recommends appropriate visualization types
- Supports bar charts, line charts, tables, and text displays
- Frontend uses Plotly.js and Recharts for rendering

#### 6. **Graceful Degradation**
- Memory features are optional (works without Supermemory API key)
- Error handling ensures the system continues to function even if individual components fail
- Always returns consistent response structures

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

## Usage

1. **Start a Query**: Type or speak a question about the e-commerce data
   - Example: "Top 5 highest products"
   - Example: "Show me products with good reviews"
   - Example: "What is boleto?"

2. **View Results**: The system will:
   - Classify your query
   - Execute the appropriate handler
   - Display results in a chat interface
   - Generate an appropriate visualization

3. **Follow-up Queries**: Ask follow-up questions that reference previous queries
   - Example: After asking about "good reviews", ask "what about bad reviews?"

## Project Structure

```
QueryMind/
├── backend/              # FastAPI backend
│   ├── main.py          # FastAPI app and API endpoints
│   ├── orchestrator.py  # LangGraph workflow definition
│   ├── database.py      # Database connection and queries
│   ├── vector_store.py  # ChromaDB semantic search
│   ├── memory.py        # Supermemory integration
│   └── tools.py         # External tools (Wikipedia, definitions)
├── frontend/            # React frontend
│   ├── src/
│   │   ├── App.tsx      # Main application component
│   │   ├── components/
│   │   │   ├── VizRenderer.tsx    # Visualization component
│   │   │   ├── VoiceInput.tsx     # Voice input component
│   │   │   └── UserGuide.tsx      # User guide modal
│   │   └── lib/         # Utility functions
├── database/            # Database setup scripts
│   ├── schema.sql       # Database schema
│   ├── setup_schema.py  # Schema creation script
│   ├── load_data.py     # Data loading script
│   └── build_vector_db.py  # Vector DB creation
├── data/                # CSV data files
├── chroma_db/           # ChromaDB storage (generated)
└── requirements.txt     # Python dependencies
```

## API Endpoints

### POST `/api/chat/query`
Process a natural language query.

**Request:**
```json
{
  "message": "Top 5 highest products",
  "conversation_id": "default",
  "user_id": "default"
}
```

**Response:**
```json
{
  "query": "Top 5 highest products",
  "intent": "analytical",
  "sql_query": "SELECT ...",
  "results": [...],
  "visualization_config": {
    "type": "bar",
    "x_axis": "product_id",
    "y_axis": "highest_price"
  },
  "message": "Found 5 results for your query."
}
```

### POST `/api/translate`
Translate text to English.

**Request:**
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

## Future Improvements

If you had more time to spend on this project, here are some recommended enhancements:

### 1. **Enhanced Query Understanding**
- Implement query refinement: allow users to clarify ambiguous queries
- Add support for multi-step analytical queries (e.g., "compare sales this month vs last month")
- Better handling of complex aggregations and time-series queries

### 2. **Advanced Visualizations**
- Add more chart types: scatter plots, heatmaps, geographic visualizations
- Interactive charts with drill-down capabilities
- Customizable visualization parameters (colors, axes, etc.)
- Export visualizations as images or PDFs

### 3. **Performance Optimizations**
- Implement query result caching for frequently asked questions
- Add database query optimization and indexing strategies
- Implement pagination for large result sets
- Add streaming responses for long-running queries

### 4. **User Experience**
- Add query history and saved queries
- Implement user authentication and multi-user support
- Add query suggestions/autocomplete
- Improve error messages with actionable suggestions
- Add dark mode support

### 5. **Data Quality & Validation**
- Add SQL query validation before execution
- Implement query result validation and sanitization
- Add data quality checks and warnings
- Better handling of NULL values and edge cases

### 6. **Advanced Features**
- Support for custom SQL queries (with safety checks)
- Add data export functionality (CSV, JSON, Excel)
- Implement query templates for common use cases
- Add scheduled queries and alerts
- Support for multiple databases/data sources

### 7. **Testing & Reliability**
- Add comprehensive unit tests for all agents
- Integration tests for the full workflow
- End-to-end tests for the frontend
- Load testing and performance benchmarking
- Better error logging and monitoring

### 8. **Documentation**
- Add API documentation with Swagger/OpenAPI
- Create user documentation with examples
- Add developer documentation for extending the system
- Document the database schema and relationships

### 9. **Deployment**
- Docker containerization for easy deployment
- CI/CD pipeline setup
- Production-ready configuration management
- Environment-specific configurations (dev, staging, prod)

### 10. **Security**
- Add rate limiting to prevent abuse
- Implement SQL injection prevention (already partially done, but can be enhanced)
- Add authentication and authorization
- Secure API key management
- Input sanitization and validation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Add your license here]

## Acknowledgments

- Olist for providing the Brazilian e-commerce dataset
- LangChain/LangGraph for workflow orchestration
- Google Gemini for LLM capabilities
- OpenAI for embedding models

