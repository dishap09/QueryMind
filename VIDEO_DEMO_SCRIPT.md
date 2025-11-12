# QueryMind Video Demo Script
## 5-7 Minute Product Demonstration

---

## [00:00 - 00:45] Introduction & Pitch

Hi, I'm [Your Name], and today I'm excited to show you QueryMind — an intelligent data analytics application that transforms how people interact with databases. 

QueryMind allows users to query a Brazilian e-commerce database using natural language. No SQL knowledge required. You simply ask questions in plain English, and the system intelligently routes your query, retrieves the data, and automatically generates beautiful visualizations with AI-powered insights.

The problem we're solving is that traditional analytics tools require technical expertise, which creates a barrier for many users. QueryMind removes that barrier entirely. Whether you're asking for the top sellers, finding products with good reviews, or getting definitions of terms, the system understands your intent and delivers results instantly.

---

## [00:45 - 03:30] Live Demo - Functional Features

Let me show you how it works in action.

[Start screen recording / demo]

Here's the QueryMind interface. On the left, we have the chat panel where you can type or speak your queries. On the right, you'll see the visualization panel and the insights panel that displays AI-generated analysis.

Let's start with an analytical query. I'll type: "Show me the top 10 sellers by number of orders."

[Type query and submit]

Watch what happens. The system first classifies this as an analytical query — meaning it needs to generate SQL. It then creates an optimized SQL query, executes it against our PostgreSQL database, and returns the results. Notice how it automatically generates a bar chart visualization, and the insights panel provides professional analysis about market concentration and seller performance.

Now let's try a different type of query — a semantic search. I'll ask: "Find products with good reviews."

[Type query and submit]

This time, instead of using SQL, the system uses semantic search. It converts my query into an embedding using OpenAI's text-embedding-3-small model, searches our ChromaDB vector database, and finds products based on meaning rather than exact keywords. The results show products with high average review scores, and again, we get an automatic visualization and insights.

Let's also try a tool query. I'll ask: "What is boleto?"

[Type query and submit]

For this, the system recognizes it needs external information and uses our tool agent to fetch a definition, which it displays as formatted text.

One of my favorite features is voice input. Instead of typing, I can just click the microphone icon and speak my query naturally.

[Click microphone and demonstrate voice input]

The system uses browser speech recognition, so you can literally talk to your data.

You'll also notice we have a dark mode toggle in the top right. This provides a comfortable viewing experience for extended data exploration sessions.

For any results, you can export the data in multiple formats — CSV for spreadsheets, JSON for developers, or PNG and PDF for presentations and reports.

[Show export menu]

The visualizations are fully interactive. You can zoom in, pan around, and explore your data in detail. If you click on a bar in a chart, you can see additional details about that specific item.

[Interact with visualization]

The system also maintains conversation context. If I ask a follow-up question like "What about bad reviews?" it understands I'm still talking about products and will search for products with bad reviews, maintaining the context from our previous conversation.

[End demo section]

---

## [03:30 - 06:00] Technical Architecture Deep Dive

Now let's dive into the technical architecture that makes all of this possible.

QueryMind follows a microservices-inspired architecture with clear separation between the frontend, backend, and data layers.

Starting with the frontend, we built it using React 19 with TypeScript for type safety. We use Vite as our build tool and development server, which provides lightning-fast hot module replacement. For visualizations, we leverage two powerful libraries: Plotly.js for advanced interactive charts and Recharts for React-native charting components. The UI is built on Radix UI primitives, which gives us accessible, customizable components out of the box. We've implemented full dark mode support with a custom theme context that persists user preferences.

The backend is built with FastAPI, a modern Python web framework that provides automatic API documentation and excellent async support. The real intelligence comes from LangGraph, which orchestrates our entire workflow as a state machine.

Here's how a query flows through the system:

When a user submits a query, it first hits our Router Agent. This agent uses Google Gemini 2.5 Flash to classify the query into one of four intents: analytical, semantic, tool, or conversational. The classification is intelligent — it looks for keywords like "top", "highest", or "total" to identify analytical queries, while queries about "good products" or "reliable sellers" are routed to semantic search.

For analytical queries, the Analytical Agent takes over. It first enhances the query with conversation context from Supermemory, so follow-up questions make sense. Then it uses Gemini to generate optimized SQL queries based on our database schema. The SQL is executed against PostgreSQL using asyncpg, which provides efficient async database operations with connection pooling.

For semantic queries, the Semantic Agent uses OpenAI's text-embedding-3-small model to convert the query into a 1536-dimensional vector. This embedding is then used to search our ChromaDB vector database, which contains pre-computed embeddings for all products in our catalog. ChromaDB performs similarity search and returns the most relevant product IDs, which we then use to fetch full product details from PostgreSQL.

The Tool Agent handles external API calls. For definitions, it uses Gemini to provide contextual explanations. For Wikipedia lookups, it uses the Wikipedia API. This allows the system to answer questions that aren't in our database.

After retrieving results, the Visualizer Agent analyzes the data structure and the original query to recommend the best visualization type. It uses Gemini to intelligently select between bar charts, line charts, tables, or maps, and automatically maps the appropriate columns to axes. This is all done dynamically based on the data characteristics.

Finally, the Insights Generator Agent takes the results and generates professional business insights. It uses Gemini to analyze patterns, detect trends, identify anomalies, and provide actionable recommendations. The insights are formatted as bullet points with specific data points and business value.

Throughout this process, we maintain conversation memory using Supermemory, which allows for natural follow-up queries and context-aware responses.

On the data side, we use PostgreSQL to store all structured data — products, orders, sellers, customers, reviews, and payments. We're working with the Olist Brazilian E-commerce Dataset, which contains real-world data from over 100,000 orders. For semantic search, we use ChromaDB as our vector database, where we've pre-computed and stored embeddings for all products.

The entire system is built with production-ready practices: error handling at every layer, connection pooling for database efficiency, async operations throughout for performance, and comprehensive logging for debugging.

Key technologies in our stack include:
- **Backend**: FastAPI, LangGraph, asyncpg, Google Generative AI, OpenAI API, ChromaDB, Supermemory, and Wikipedia API
- **Frontend**: React 19, TypeScript, Vite, Plotly.js, Recharts, Radix UI, html2canvas, and jsPDF for exports
- **Databases**: PostgreSQL for relational data, ChromaDB for vector search
- **AI Models**: Google Gemini 2.5 Flash for all LLM tasks, OpenAI text-embedding-3-small for embeddings

The architecture is designed to be scalable, maintainable, and extensible. Each agent in the LangGraph workflow is independent, making it easy to add new capabilities or modify existing ones.

---

## [06:00 - 06:30] Closing

QueryMind demonstrates how modern AI can democratize data analytics. By combining natural language processing, intelligent query routing, automatic visualization, and AI-powered insights, we've created a tool that makes data exploration accessible to everyone, regardless of their technical background.

The system intelligently understands user intent, routes queries to the appropriate handler, and delivers results with beautiful visualizations and actionable insights — all in seconds.

Thank you for watching this demonstration. If you have any questions about QueryMind, the architecture, or any of the technologies we've discussed, I'd be happy to answer them.

---

## Recording Notes

**Total Script Length**: ~1,000 words
**Estimated Speaking Time**: 6-7 minutes at normal pace (150-160 words per minute)

**Tips for Recording**:
- Speak naturally and conversationally — this script is written to sound like you're explaining to a colleague
- Pause briefly at section breaks marked by horizontal lines
- During the demo section, actually perform the actions described in brackets
- Adjust your pace as needed — the timestamps are approximate guides
- If you finish early, you can elaborate on any section. If running long, you can condense the technical deep dive slightly

**Key Sections to Emphasize**:
- The intelligent routing system (Router Agent)
- The hybrid approach (SQL + Vector Search)
- Automatic visualization generation
- AI-powered insights

**Demo Actions to Perform**:
- Type and submit at least 2-3 different query types
- Show voice input working
- Demonstrate export functionality
- Toggle dark mode
- Interact with a visualization

