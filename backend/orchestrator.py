from typing import TypedDict, Optional, List, Literal
from langgraph.graph import StateGraph, END
import os
import json
from dotenv import load_dotenv
import google.generativeai as genai
from backend.database import fetch_schema, execute_query
from backend.vector_store import semantic_search

# Load environment variables
load_dotenv()

# Configure Google Generative AI client
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY must be set in .env file")

genai.configure(api_key=GEMINI_API_KEY)


class QueryState(TypedDict):
    query: str
    intent: str
    sql_query: Optional[str]
    results: Optional[List[dict]]
    visualization_config: Optional[dict]
    memory_context: dict
    db_schema: str


async def router_agent(state: QueryState) -> QueryState:
    """
    Router agent that classifies user queries into one of four intents:
    - analytical: queries requiring SQL execution (e.g., "Top 5", "Total sales", "Average score")
    - semantic: queries requiring RAG retrieval (e.g., "good products", "bad reviews")
    - tool: queries requiring external API calls (e.g., "what is 'boleto'?", "translate")
    - conversational: general conversation queries
    """
    query = state.get('query', '')
    memory_context = state.get('memory_context', {})
    
    # Create detailed prompt for intent classification
    prompt = f"""You are an intent classification system for a Brazilian e-commerce database query system.

Your task is to classify the user's query into one of four intents based on the query text and conversation context.

INTENT CATEGORIES:

1. **analytical**: Queries that require SQL database queries to retrieve numerical data, aggregations, rankings, or statistical information.
   Examples:
   - "Top 5 best selling products"
   - "Total sales last month"
   - "Average customer review score"
   - "Show me revenue by state"
   - "What are the most expensive orders?"
   - "Count orders by payment type"
   - "Revenue trends over time"
   
2. **semantic**: Queries that require semantic search or RAG (Retrieval Augmented Generation) to find information based on meaning, context, or qualitative descriptions.
   Examples:
   - "good products"
   - "bad reviews"
   - "products with quality issues"
   - "satisfied customers"
   - "reliable sellers"
   - "popular product categories"
   - "customer complaints about delivery"
   
3. **tool**: Queries that require external API calls, translations, definitions, or information not in the database.
   Examples:
   - "what is 'boleto'?"
   - "translate this to English"
   - "what does 'frete' mean?"
   - "explain payment method 'credit_card'"
   - "convert BRL to USD"
   - "what is the weather in São Paulo?"
   
4. **conversational**: General conversation, greetings, or queries that don't fit the above categories.
   Examples:
   - "Hello"
   - "How are you?"
   - "Thank you"
   - "Can you help me?"
   - "What can you do?"

CONVERSATION CONTEXT:
{json.dumps(memory_context, indent=2) if memory_context else "No previous conversation context."}

USER QUERY:
"{query}"

INSTRUCTIONS:
- Analyze the query carefully considering both the query text and conversation context
- Classify it into exactly one of the four intents: analytical, semantic, tool, or conversational
- Return ONLY a valid JSON object with this exact structure:
{{
  "intent": "analytical" | "semantic" | "tool" | "conversational",
  "reasoning": "Brief explanation of why this intent was chosen"
}}

Return only the JSON object, no additional text or markdown formatting."""

    try:
        # Initialize the Gemini model
        model = genai.GenerativeModel('gemini-pro')
        
        # Generate response
        response = model.generate_content(prompt)
        
        # Extract text from response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Parse JSON response
        parsed_response = json.loads(response_text)
        
        # Update state with the classified intent
        state['intent'] = parsed_response.get('intent', 'conversational')
        
    except json.JSONDecodeError as e:
        # Fallback to conversational if JSON parsing fails
        print(f"Error parsing JSON response: {e}")
        state['intent'] = 'conversational'
    except Exception as e:
        # Fallback to conversational on any error
        print(f"Error in router_agent: {e}")
        state['intent'] = 'conversational'
    
    return state


async def analytical_agent(state: QueryState) -> QueryState:
    """
    Analytical agent that generates SQL queries from natural language questions
    and executes them against the database.
    """
    # Fetch and save database schema
    db_schema = await fetch_schema()
    state['db_schema'] = db_schema
    
    query = state.get('query', '')
    
    # Create prompt for Gemini to generate SQL query
    prompt = f"""Given this PostgreSQL schema: {db_schema}

Write a single, valid PostgreSQL query to answer this user question: {query}

When joining products, also join product_category_translation on product_category_name to get English names.

When calculating price or revenue, use the price column from order_items.

Return ONLY the SQL string."""

    try:
        # Initialize the Gemini model
        model = genai.GenerativeModel('gemini-pro')
        
        # Generate response
        response = model.generate_content(prompt)
        
        # Extract text from response
        sql_query = response.text.strip()
        
        # Remove markdown code blocks if present
        if sql_query.startswith('```sql'):
            sql_query = sql_query[6:]
        elif sql_query.startswith('```'):
            sql_query = sql_query[3:]
        if sql_query.endswith('```'):
            sql_query = sql_query[:-3]
        sql_query = sql_query.strip()
        
        # Save SQL query to state
        state['sql_query'] = sql_query
        
        # Execute the query
        results = await execute_query(sql_query)
        
        # Save results to state
        state['results'] = results
        
    except Exception as e:
        # Handle errors gracefully
        print(f"Error in analytical_agent: {e}")
        state['sql_query'] = None
        state['results'] = None
    
    return state


async def semantic_agent(state: QueryState) -> QueryState:
    """
    Semantic agent that performs semantic search on products and retrieves
    full product details for the matching products.
    """
    query = state.get('query', '')
    
    try:
        # Call semantic_search to get product_ids
        product_ids = await semantic_search(query)
        
        # If no product_ids are found, return an empty state
        if not product_ids:
            state['results'] = []
            return state
        
        # Construct SQL query to get the full details for these products
        product_ids_str = ', '.join(f"'{pid}'" for pid in product_ids)
        sql_query = f"""SELECT p.*, t.product_category_name_english, AVG(r.review_score) as avg_score 
FROM products p 
JOIN product_category_translation t ON p.product_category_name = t.product_category_name 
LEFT JOIN order_items oi ON p.product_id = oi.product_id 
LEFT JOIN order_reviews r ON oi.order_id = r.order_id 
WHERE p.product_id IN ({product_ids_str}) 
GROUP BY p.product_id, t.product_category_name_english"""
        
        # Execute the SQL query
        results = await execute_query(sql_query)
        
        # Save the data to state['results']
        state['results'] = results
        
    except Exception as e:
        # Handle errors gracefully
        print(f"Error in semantic_agent: {e}")
        state['results'] = []
    
    return state


async def viz_generator(state: QueryState) -> QueryState:
    """
    Visualization generator that recommends the best visualization type
    and configuration based on the query results and user query.
    """
    results = state.get('results', [])
    query = state.get('query', '')
    
    # If no results, set empty visualization config
    if not results:
        state['visualization_config'] = None
        return state
    
    # Get a sample of the results (first 5 rows) for the prompt
    sample_results = results[:5] if len(results) > 5 else results
    
    # Create prompt for Gemini
    prompt = f"""Based on this data: {json.dumps(sample_results, indent=2)}

And the user's query: "{query}"

What is the best visualization? Recommend type: 'bar', 'line', 'table', or 'map' and the columns for x_axis, y_axis, and color.

Return pure JSON with this structure:
{{
  "type": "bar" | "line" | "table" | "map",
  "x_axis": "column_name",
  "y_axis": "column_name",
  "color": "column_name" (optional)
}}

Return only the JSON object, no additional text or markdown formatting."""

    try:
        # Initialize the Gemini model
        model = genai.GenerativeModel('gemini-pro')
        
        # Generate response
        response = model.generate_content(prompt)
        
        # Extract text from response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Parse JSON response
        visualization_config = json.loads(response_text)
        
        # Save to state
        state['visualization_config'] = visualization_config
        
    except json.JSONDecodeError as e:
        # Fallback to table if JSON parsing fails
        print(f"Error parsing JSON response: {e}")
        state['visualization_config'] = {"type": "table"}
    except Exception as e:
        # Fallback to table on any error
        print(f"Error in viz_generator: {e}")
        state['visualization_config'] = {"type": "table"}
    
    return state


def route_after_router(state: QueryState) -> Literal["analytical", "semantic", "tool", "conversational"]:
    """
    Conditional routing function that routes based on intent.
    """
    intent = state.get('intent', 'conversational')
    # Ensure intent is one of the valid values
    valid_intents = ["analytical", "semantic", "tool", "conversational"]
    if intent not in valid_intents:
        intent = "conversational"
    return intent  # type: ignore


# Initialize workflow
workflow = StateGraph(QueryState)

# Add all the nodes
workflow.add_node("router", router_agent)
workflow.add_node("analytical", analytical_agent)
workflow.add_node("semantic", semantic_agent)
workflow.add_node("visualizer", viz_generator)

# Set the router as the entry point
workflow.set_entry_point("router")

# Add conditional edges from router to analytical and semantic
workflow.add_conditional_edges(
    "router",
    route_after_router,
    {
        "analytical": "analytical",
        "semantic": "semantic",
        "tool": END,  # For now, tool goes to END (we'll add tool agent later)
        "conversational": END  # Conversational also goes to END
    }
)

# Add normal edges from analytical to visualizer and semantic to visualizer
workflow.add_edge("analytical", "visualizer")
workflow.add_edge("semantic", "visualizer")

# Add an edge from visualizer to END
workflow.add_edge("visualizer", END)

# Compile the graph
app = workflow.compile()

