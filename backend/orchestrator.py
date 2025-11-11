from typing import TypedDict, Optional, List
from langgraph.graph import StateGraph
import os
import json
from dotenv import load_dotenv
import google.generativeai as genai
from backend.database import fetch_schema, execute_query

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

