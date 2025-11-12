from typing import TypedDict, Optional, List, Literal
from langgraph.graph import StateGraph, END
import os
import json
from dotenv import load_dotenv
import google.generativeai as genai
from backend.database import fetch_schema, execute_query
from backend.vector_store import semantic_search
from backend.tools import wikipedia_lookup, get_definition

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
    error: Optional[str]
    insights: Optional[str]


async def enhance_query_with_context(query: str, memory_context: dict) -> str:
    """
    Enhance a user query with conversation context to understand follow-up queries.
    
    This function uses Gemini to expand and contextualize queries based on previous
    conversation history. For example, if a user previously asked about "good reviews"
    and then says "bad review", it will understand this means "products with bad reviews".
    
    Args:
        query: The current user query
        memory_context: Dictionary containing conversation history from Supermemory
        
    Returns:
        Enhanced query string that includes context from previous conversations
    """
    # If no memory context, return the original query
    if not memory_context or not isinstance(memory_context, dict):
        return query
    
    # Check if memory_context has any meaningful content
    # It might be an empty dict or have keys like 'messages', 'context', etc.
    context_str = json.dumps(memory_context, indent=2)
    if not context_str or context_str == "{}":
        return query
    
    # Create prompt for Gemini to enhance the query
    prompt = f"""You are a query enhancement system for a Brazilian e-commerce database.

Your task is to expand and contextualize the user's current query based on previous conversation history.

CONVERSATION CONTEXT (from previous messages):
{context_str}

CURRENT USER QUERY:
"{query}"

INSTRUCTIONS:
- If the current query is a follow-up or continuation of a previous query, expand it to include the full context
- For example, if previous context mentions "products with good reviews" and current query is "bad review", 
  expand it to "products with bad reviews"
- If the query is standalone and doesn't reference previous context, return it as-is
- Preserve the original intent and meaning of the query
- Make the enhanced query clear and complete for semantic search or SQL generation

Return ONLY the enhanced query string, no explanations, no markdown formatting, no additional text.
Just return the enhanced query as plain text."""

    try:
        # Initialize the Gemini model
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Generate response
        response = model.generate_content(prompt)
        
        # Extract text from response
        enhanced_query = response.text.strip()
        
        # Remove any markdown code blocks if present
        if enhanced_query.startswith('```'):
            # Find the end of the code block marker
            lines = enhanced_query.split('\n')
            if lines[0].startswith('```'):
                lines = lines[1:]
            if lines and lines[-1].strip() == '```':
                lines = lines[:-1]
            enhanced_query = '\n'.join(lines).strip()
        
        # If the enhanced query is empty or just whitespace, return original
        if not enhanced_query:
            return query
        
        print(f"Query enhanced: '{query}' -> '{enhanced_query}'")
        return enhanced_query
        
    except Exception as e:
        # On any error, return the original query
        print(f"Error enhancing query with context: {e}")
        return query


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
    
    # Fast path: Check for analytical keywords first (before LLM call)
    # This ensures queries like "Top 5 highest products" are always classified as analytical
    query_lower = query.lower()
    analytical_keywords = [
        'top', 'highest', 'lowest', 'most', 'least', 'best', 'worst',
        'count', 'sum', 'average', 'total', 'list', 'show me', 'number of',
        'how many', 'which', 'what are', 'expensive', 'cheap', 'sellers by',
        'products by', 'orders by', 'revenue', 'sales'
    ]
    
    # Check if query contains analytical keywords
    if any(keyword in query_lower for keyword in analytical_keywords):
        # Additional check: make sure it's not a tool query (definitions, translations)
        tool_indicators = ['what is', 'what does', 'define', 'meaning of', 'translate']
        if not any(indicator in query_lower for indicator in tool_indicators):
            print(f"Fast path: Classifying query as analytical based on keywords: {query}")
            state['intent'] = 'analytical'
            return state
    
    # Create detailed prompt for intent classification
    prompt = f"""You are an intent classification system for a Brazilian e-commerce database query system.

Your task is to classify the user's query into one of four intents based on the query text and conversation context.

INTENT CATEGORIES:

1. **analytical**: Queries that require SQL database queries to retrieve numerical data, aggregations, rankings, or statistical information.
   
   CRITICAL: If the query contains ANY of these keywords, it MUST be classified as analytical:
   - "top", "highest", "lowest", "most", "least", "best", "worst"
   - "count", "sum", "average", "total", "number of", "list"
   - "show me", "what are", "which", "how many"
   - Any query asking for rankings, aggregations, or comparisons
   
   Examples (ALL of these are analytical):
   - "Top 5 best selling products" -> analytical
   - "Top 10 products with highest prices" -> analytical
   - "Top 5 highest products" -> analytical (MUST be analytical)
   - "Top 5 products" -> analytical (MUST be analytical)
   - "Show me top 10 products by sales" -> analytical
   - "Total sales last month" -> analytical
   - "Average customer review score" -> analytical
   - "Show me revenue by state" -> analytical
   - "What are the most expensive orders?" -> analytical
   - "Count orders by payment type" -> analytical
   - "Revenue trends over time" -> analytical
   - "Products with highest prices" -> analytical
   - "Highest products" -> analytical (MUST be analytical)
   - "Top N products" (where N is any number) -> analytical (MUST be analytical)
   - "List the top 10 sellers by number of orders" -> analytical (MUST be analytical)
   - "Show me the top 5 most expensive products" -> analytical (MUST be analytical)
   
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
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Generate response
        response = model.generate_content(prompt)
        
        # Extract text from response
        response_text = response.text.strip()
        
        # Debug: Print raw response
        print(f"Router agent raw response: {response_text[:500]}")
        
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
        
        # Debug: Print parsed intent
        intent = parsed_response.get('intent', 'conversational')
        print(f"Router agent classified intent: {intent} for query: {query}")
        
        # Update state with the classified intent
        state['intent'] = intent
        
    except json.JSONDecodeError as e:
        # Fallback to conversational if JSON parsing fails
        print(f"Error parsing JSON response in router_agent: {e}")
        try:
            print(f"Response text was: {response_text[:200]}")
        except:
            print("Could not print response text")
        # If query contains analytical keywords, force analytical intent
        query_lower = query.lower()
        analytical_keywords = ['top', 'highest', 'lowest', 'most', 'least', 'best', 'worst', 'count', 'sum', 'average', 'total', 'list', 'show me', 'number of']
        if any(keyword in query_lower for keyword in analytical_keywords):
            print(f"Force-setting intent to analytical based on keywords in query: {query}")
            state['intent'] = 'analytical'
        else:
            state['intent'] = 'conversational'
    except Exception as e:
        # Fallback to conversational on any error
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in router_agent: {error_trace}")
        # If query contains analytical keywords, force analytical intent
        query_lower = query.lower()
        analytical_keywords = ['top', 'highest', 'lowest', 'most', 'least', 'best', 'worst', 'count', 'sum', 'average', 'total', 'list', 'show me', 'number of']
        if any(keyword in query_lower for keyword in analytical_keywords):
            print(f"Force-setting intent to analytical based on keywords after error: {query}")
            state['intent'] = 'analytical'
        else:
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
    memory_context = state.get('memory_context', {})
    
    # Enhance query with conversation context to understand follow-ups
    enhanced_query = await enhance_query_with_context(query, memory_context)
    
    # Build context string for the prompt
    context_section = ""
    if memory_context and isinstance(memory_context, dict):
        context_str = json.dumps(memory_context, indent=2)
        if context_str and context_str != "{}":
            context_section = f"""

CONVERSATION CONTEXT (from previous messages):
{context_str}

Note: The user question below may be a follow-up to previous queries. Consider the context when generating the SQL query.
"""
    
    # Create prompt for Gemini to generate SQL query
    prompt = f"""Given this PostgreSQL schema: {db_schema}{context_section}

Write a single, valid PostgreSQL query to answer this user question: {enhanced_query}

IMPORTANT RULES:
1. When joining products, also join product_category_translation on product_category_name to get English names.
2. When calculating price, revenue, or sales, use the price column from order_items table.
3. For "top N" queries, use ORDER BY with DESC and LIMIT N.
4. For sales calculations, SUM the price from order_items grouped by product.
5. Always include product_id and product information when querying products.
6. Use proper JOINs: order_items -> products, order_items -> orders, products -> product_category_translation.
7. **CRITICAL**: When the query mentions "highest products", "top products", or just "products" without specifying what metric, DEFAULT TO HIGHEST PRICES. Use MAX(oi.price) or AVG(oi.price) per product.
8. For "highest products" or ambiguous "top products" queries, join order_items to get prices and group by product to find the highest priced products.
9. Handle NULL values appropriately - use COALESCE or WHERE clauses to filter NULLs when needed.
10. Always use LEFT JOIN for product_category_translation since some products might not have translations.

Examples:

Example 1 - "top 10 products by sales":
SELECT 
    p.product_id,
    p.product_category_name,
    t.product_category_name_english,
    SUM(oi.price) as total_sales
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
LEFT JOIN product_category_translation t ON p.product_category_name = t.product_category_name
GROUP BY p.product_id, p.product_category_name, t.product_category_name_english
ORDER BY total_sales DESC
LIMIT 10;

Example 2 - "top 5 highest products" or "top 5 products" (ambiguous, default to prices):
SELECT 
    p.product_id,
    p.product_category_name,
    t.product_category_name_english,
    MAX(oi.price) as highest_price,
    AVG(oi.price) as avg_price
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
LEFT JOIN product_category_translation t ON p.product_category_name = t.product_category_name
WHERE oi.price IS NOT NULL
GROUP BY p.product_id, p.product_category_name, t.product_category_name_english
ORDER BY highest_price DESC
LIMIT 5;

Example 3 - "products with highest prices":
SELECT 
    p.product_id,
    p.product_category_name,
    t.product_category_name_english,
    MAX(oi.price) as max_price,
    COUNT(oi.order_item_id) as order_count
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
LEFT JOIN product_category_translation t ON p.product_category_name = t.product_category_name
WHERE oi.price IS NOT NULL
GROUP BY p.product_id, p.product_category_name, t.product_category_name_english
ORDER BY max_price DESC
LIMIT 10;

Return ONLY the SQL string, no explanations, no markdown code blocks."""

    try:
        # Initialize the Gemini model
        model = genai.GenerativeModel('gemini-2.5-flash')
        
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
        
        # Remove any trailing semicolons and trim
        sql_query = sql_query.rstrip(';').strip()
        
        # Log the generated SQL for debugging
        print(f"Generated SQL query: {sql_query}")
        
        # Save SQL query to state
        state['sql_query'] = sql_query
        
        # Execute the query
        results = await execute_query(sql_query)
        
        # Ensure results is always a list (never None)
        if results is None:
            results = []
        
        # Log results count for debugging
        print(f"Query returned {len(results)} results")
        
        # Save results to state
        state['results'] = results
        
        # Clear any previous errors
        if 'error' in state:
            state['error'] = None
        
    except Exception as e:
        # Handle errors gracefully
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in analytical_agent: {error_trace}")
        print(f"SQL query that failed: {state.get('sql_query', 'N/A')}")
        
        # Set results to empty array instead of None
        state['results'] = []
        state['sql_query'] = state.get('sql_query', None)  # Keep the SQL for debugging
        
        # Store error message in a separate field for frontend
        error_message = f"Error executing query: {str(e)}"
        if "syntax error" in str(e).lower() or "invalid" in str(e).lower():
            error_message = f"SQL syntax error: {str(e)}"
        elif "does not exist" in str(e).lower() or "relation" in str(e).lower():
            error_message = f"Database error - table or column not found: {str(e)}"
        
        state['error'] = error_message
    
    return state


async def semantic_agent(state: QueryState) -> QueryState:
    """
    Semantic agent that performs semantic search on products and retrieves
    full product details for the matching products.
    """
    query = state.get('query', '')
    memory_context = state.get('memory_context', {})
    
    try:
        # Enhance query with conversation context to understand follow-ups
        enhanced_query = await enhance_query_with_context(query, memory_context)
        
        # Call semantic_search with the enhanced query
        product_ids = await semantic_search(enhanced_query)
        
        # If no product_ids are found, return an empty state
        if not product_ids:
            state['results'] = []
            return state
        
        # Construct SQL query to get the full details for these products
        product_ids_str = ', '.join(f"'{pid}'" for pid in product_ids)
        sql_query = f"""SELECT 
    p.product_id,
    p.product_category_name,
    p.product_name_lenght,
    p.product_description_lenght,
    p.product_photos_qty,
    p.product_weight_g,
    p.product_length_cm,
    p.product_height_cm,
    p.product_width_cm,
    t.product_category_name_english, 
    AVG(r.review_score) as avg_score,
    COUNT(DISTINCT oi.order_id) as order_count,
    STRING_AGG(DISTINCT r.review_comment_message, ' | ') FILTER (WHERE r.review_comment_message IS NOT NULL) as reviews
FROM products p 
LEFT JOIN product_category_translation t ON p.product_category_name = t.product_category_name 
LEFT JOIN order_items oi ON p.product_id = oi.product_id 
LEFT JOIN order_reviews r ON oi.order_id = r.order_id 
WHERE p.product_id IN ({product_ids_str}) 
GROUP BY 
    p.product_id,
    p.product_category_name,
    p.product_name_lenght,
    p.product_description_lenght,
    p.product_photos_qty,
    p.product_weight_g,
    p.product_length_cm,
    p.product_height_cm,
    p.product_width_cm,
    t.product_category_name_english"""
        
        # Execute the SQL query
        results = await execute_query(sql_query)
        
        # Ensure results is always a list (never None)
        if results is None:
            results = []
        
        # Save the data to state['results']
        state['results'] = results
        
        # Clear any previous errors
        if 'error' in state:
            state['error'] = None
        
    except Exception as e:
        # Handle errors gracefully
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in semantic_agent: {error_trace}")
        state['results'] = []
        state['error'] = f"Error performing semantic search: {str(e)}"
    
    return state


async def tool_agent(state: QueryState) -> QueryState:
    """
    Tool agent that handles external API calls, definitions, and information
    not in the database. It uses Gemini to parse the query and determine
    which tool to use and with what parameters.
    """
    query = state.get('query', '')
    
    # Create prompt for Gemini to parse the query and extract tool name and parameters
    prompt = f"""Given this user query: "{query}"

Determine which tool to use and extract the necessary parameters.

Available tools:
1. **wikipedia_lookup**: For looking up general information on Wikipedia
   - Parameter: topic (the topic to look up)
   - Example: "what is boleto?" -> tool: "wikipedia_lookup", topic: "boleto"
   
2. **get_definition**: For defining terms in the context of Brazilian e-commerce
   - Parameter: term (the term to define)
   - Example: "what does 'frete' mean?" -> tool: "get_definition", term: "frete"

Return ONLY a valid JSON object with this exact structure:
{{
  "tool": "wikipedia_lookup" | "get_definition",
  "parameters": {{
    "topic": "string" (for wikipedia_lookup) OR
    "term": "string" (for get_definition)
  }}
}}

Return only the JSON object, no additional text or markdown formatting."""

    try:
        # Initialize the Gemini model
        model = genai.GenerativeModel('gemini-2.5-flash')
        
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
        
        tool_name = parsed_response.get('tool', '')
        parameters = parsed_response.get('parameters', {})
        
        # Call the appropriate tool function
        if tool_name == 'wikipedia_lookup':
            topic = parameters.get('topic', '')
            result_text = wikipedia_lookup(topic)
        elif tool_name == 'get_definition':
            term = parameters.get('term', '')
            result_text = await get_definition(term)
        else:
            result_text = f"Unknown tool: {tool_name}"
        
        # Save results to state as a text result
        # Store as a list with a single dict containing the text result
        state['results'] = [{'text': result_text}]
        state['visualization_config'] = {'type': 'text'}
        
    except json.JSONDecodeError as e:
        # Fallback error handling
        print(f"Error parsing JSON response in tool_agent: {e}")
        state['results'] = [{'text': 'Error: Could not parse tool request'}]
        state['visualization_config'] = {'type': 'text'}
    except Exception as e:
        # Handle errors gracefully
        print(f"Error in tool_agent: {e}")
        state['results'] = [{'text': f'Error: {str(e)}'}]
        state['visualization_config'] = {'type': 'text'}
    
    return state


async def viz_generator(state: QueryState) -> QueryState:
    """
    Visualization generator that recommends the best visualization type
    and configuration based on the query results and user query.
    """
    results = state.get('results', [])
    query = state.get('query', '')
    
    # If there's an error, skip visualization generation
    if state.get('error'):
        state['visualization_config'] = None
        return state
    
    # If no results (empty array), still create a table visualization
    # This allows the frontend to show "No data found" in a table format
    if not results or len(results) == 0:
        # Set a default table visualization for empty results
        state['visualization_config'] = {"type": "table", "x_axis": None, "y_axis": None}
        return state
    
    # Get a sample of the results (first 5 rows) for the prompt
    sample_results = results[:5] if len(results) > 5 else results
    
    # Detect numeric columns that could be good for visualization
    numeric_columns = []
    text_columns = []
    id_columns = []
    
    if len(results) > 0:
        first_row = results[0]
        for key, value in first_row.items():
            if isinstance(value, (int, float)) and value is not None:
                numeric_columns.append(key)
            elif isinstance(value, str) and len(str(value)) > 50:
                text_columns.append(key)
            elif key.endswith('_id') or key == 'product_id':
                id_columns.append(key)
    
    # Check if query mentions ratings, scores, or comparisons
    query_lower = query.lower()
    mentions_ratings = any(word in query_lower for word in ['rating', 'score', 'review score', 'bad rating', 'good rating', 'low rating', 'high rating'])
    mentions_comparison = any(word in query_lower for word in ['compare', 'top', 'best', 'worst', 'highest', 'lowest'])
    
    # Prefer bar charts for queries about ratings/scores when avg_score or similar columns exist
    preferred_chart = None
    if mentions_ratings and 'avg_score' in numeric_columns:
        preferred_chart = "bar"
    elif mentions_comparison and len(numeric_columns) > 0:
        preferred_chart = "bar"
    
    # Create prompt for Gemini with enhanced guidance
    prompt = f"""Based on this data: {json.dumps(sample_results, indent=2)}

And the user's query: "{query}"

IMPORTANT GUIDELINES:
- If the query mentions "ratings", "scores", "bad ratings", "good ratings", or similar, and the data has an "avg_score" or similar numeric column, use a BAR CHART to visualize products by their scores.
- If the query asks for comparisons, rankings, or "top/best/worst", prefer BAR or LINE charts over tables.
- Use BAR charts when comparing numeric values across categories (e.g., products by score, products by order count).
- Use LINE charts only for time-series data or sequential trends.
- Use TABLE only when the data is primarily text-based (like reviews, descriptions) or when there are too many columns to visualize effectively.
- For queries about "bad ratings" or "low scores", create a bar chart with product_id or product_category_name_english on x-axis and avg_score on y-axis.

Available numeric columns: {numeric_columns}
Available text columns: {text_columns}
Available ID columns: {id_columns}

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
        model = genai.GenerativeModel('gemini-2.5-flash')
        
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
        
        # Override with bar chart if query mentions ratings/scores and we have avg_score
        # but Gemini chose table instead
        if mentions_ratings and 'avg_score' in numeric_columns:
            if visualization_config.get('type') == 'table':
                # Force bar chart for rating queries
                first_row_keys = list(results[0].keys())
                x_axis_col = "product_id" if "product_id" in first_row_keys else (id_columns[0] if id_columns else first_row_keys[0])
                visualization_config = {
                    "type": "bar",
                    "x_axis": x_axis_col,
                    "y_axis": "avg_score"
                }
                print(f"Overriding visualization to bar chart for ratings query")
        
        # Save to state
        state['visualization_config'] = visualization_config
        
    except json.JSONDecodeError as e:
        # Fallback logic: if query mentions ratings and we have avg_score, use bar chart
        print(f"Error parsing JSON response: {e}")
        if mentions_ratings and 'avg_score' in numeric_columns and len(results) > 0:
            state['visualization_config'] = {
                "type": "bar",
                "x_axis": "product_id" if "product_id" in results[0] else (id_columns[0] if id_columns else list(results[0].keys())[0]),
                "y_axis": "avg_score"
            }
        else:
            state['visualization_config'] = {"type": "table"}
    except Exception as e:
        # Fallback logic: if query mentions ratings and we have avg_score, use bar chart
        print(f"Error in viz_generator: {e}")
        if mentions_ratings and 'avg_score' in numeric_columns and len(results) > 0:
            state['visualization_config'] = {
                "type": "bar",
                "x_axis": "product_id" if "product_id" in results[0] else (id_columns[0] if id_columns else list(results[0].keys())[0]),
                "y_axis": "avg_score"
            }
        else:
            state['visualization_config'] = {"type": "table"}
    
    return state


async def insights_agent(state: QueryState) -> QueryState:
    """
    Insights agent that generates AI-powered insights from query results.
    Analyzes patterns, trends, anomalies, and provides actionable recommendations.
    """
    results = state.get('results', [])
    query = state.get('query', '')
    visualization_config = state.get('visualization_config', {})
    
    # Skip insights generation if there's an error or no results
    if state.get('error') or not results or len(results) == 0:
        state['insights'] = None
        return state
    
    # Skip insights for tool queries (they return text, not data)
    if state.get('intent') == 'tool':
        state['insights'] = None
        return state
    
    try:
        # Get a sample of results (first 20 rows) for analysis
        sample_results = results[:20] if len(results) > 20 else results
        
        # Create prompt for Gemini to generate insights
        prompt = f"""You are an expert data analyst for a Brazilian e-commerce platform. Analyze the following query results and generate professional, business-focused insights.

USER QUERY: "{query}"

VISUALIZATION TYPE: {visualization_config.get('type', 'unknown')}

DATA SAMPLE (first {len(sample_results)} of {len(results)} results):
{json.dumps(sample_results, indent=2)}

TOTAL RESULTS: {len(results)}

INSTRUCTIONS:
- Analyze the data for patterns, trends, anomalies, and key findings
- Provide 3-5 concise, professional insights written in a business analyst style
- Focus on business value and actionable recommendations
- Highlight specific numbers, percentages, or statistics from the data
- Use professional language - avoid emojis, casual language, or overly enthusiastic tone
- Format each insight as: **Title:** Description text
- Titles should be concise (3-8 words) and descriptive
- Descriptions should be 1-3 sentences with specific data points
- If the query is about products, focus on product performance, categories, pricing, or reviews
- If the query is about sales/orders, focus on revenue, trends, or customer behavior
- Each insight should be substantive and data-driven

CRITICAL FORMATTING REQUIREMENTS:
- Each insight must start with **Title:** followed by the description
- Use bullet points (•) to separate insights
- Do NOT use emojis anywhere
- Do NOT use markdown code blocks
- Example format:
• **Concentrated Market Leadership:** The top three sellers account for over 5,000 combined orders, representing significant market concentration with the leading seller processing 1,854 orders.

Return ONLY the insights in the exact format specified above. No additional text or explanations."""

        # Initialize the Gemini model
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Generate response
        response = model.generate_content(prompt)
        
        # Extract text from response
        insights_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if insights_text.startswith('```'):
            lines = insights_text.split('\n')
            if lines[0].startswith('```'):
                lines = lines[1:]
            if lines and lines[-1].strip() == '```':
                lines = lines[:-1]
            insights_text = '\n'.join(lines).strip()
        
        # Clean up the insights: remove emojis and improve formatting
        import re
        # Remove common emojis (basic emoji pattern)
        insights_text = re.sub(r'[📈🚀💡🏆📊✨🎯💼🔍⭐🌟]', '', insights_text)
        # Remove emoji patterns more comprehensively
        emoji_pattern = re.compile("["
            u"\U0001F600-\U0001F64F"  # emoticons
            u"\U0001F300-\U0001F5FF"  # symbols & pictographs
            u"\U0001F680-\U0001F6FF"  # transport & map symbols
            u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
            u"\U00002702-\U000027B0"
            u"\U000024C2-\U0001F251"
            "]+", flags=re.UNICODE)
        insights_text = emoji_pattern.sub('', insights_text)
        
        # Clean up extra whitespace
        insights_text = re.sub(r'\n\s*\n\s*\n', '\n\n', insights_text)  # Multiple newlines to double
        insights_text = re.sub(r'^\s+', '', insights_text, flags=re.MULTILINE)  # Leading whitespace
        insights_text = insights_text.strip()
        
        # Ensure proper bullet point formatting
        lines = insights_text.split('\n')
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            # If line doesn't start with bullet, add one if it looks like a new insight
            if not line.startswith(('•', '-', '*', '1.', '2.', '3.', '4.', '5.')):
                # Check if it's a new paragraph/insight (starts with capital or number)
                if line and (line[0].isupper() or line[0].isdigit()):
                    # Check if previous line was also an insight (not empty)
                    if cleaned_lines and cleaned_lines[-1].strip():
                        line = '• ' + line
            cleaned_lines.append(line)
        
        insights_text = '\n'.join(cleaned_lines)
        
        # Save insights to state
        state['insights'] = insights_text
        
        print(f"Generated insights for query: {query}")
        
    except Exception as e:
        # On error, set insights to None (don't fail the whole workflow)
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error generating insights: {error_trace}")
        state['insights'] = None
    
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
workflow.add_node("tool", tool_agent)
workflow.add_node("visualizer", viz_generator)
workflow.add_node("insights_generator", insights_agent)

# Set the router as the entry point
workflow.set_entry_point("router")

# Add conditional edges from router to analytical, semantic, and tool
workflow.add_conditional_edges(
    "router",
    route_after_router,
    {
        "analytical": "analytical",
        "semantic": "semantic",
        "tool": "tool",
        "conversational": END  # Conversational goes to END
    }
)

# Add normal edges from analytical to visualizer and semantic to visualizer
workflow.add_edge("analytical", "visualizer")
workflow.add_edge("semantic", "visualizer")

# Add an edge from tool agent to END (tool results are text, no visualization needed)
workflow.add_edge("tool", END)

# Add an edge from visualizer to insights_generator, then insights_generator to END
workflow.add_edge("visualizer", "insights_generator")
workflow.add_edge("insights_generator", END)

# Compile the graph
app = workflow.compile()

