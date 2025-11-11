from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.orchestrator import app as workflow_app
from backend.memory import MemoryManager
import asyncio
import traceback

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize memory manager (will be created lazily if API key is not set)
memory_manager = None

def get_memory_manager():
    """Get or create the memory manager instance."""
    global memory_manager
    if memory_manager is None:
        try:
            memory_manager = MemoryManager()
        except ValueError as e:
            # If API key is not set, return None (memory features will be disabled)
            print(f"Warning: Memory manager not available: {e}")
            return None
    return memory_manager


class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    user_id: str


@app.post("/api/chat/query")
async def chat_query(request: ChatRequest):
    try:
        # Get memory manager (returns None if not configured)
        mem_manager = get_memory_manager()
        
        # Get memory context before calling the LangGraph app
        memory_context = {}
        if mem_manager:
            try:
                memory_context = await mem_manager.get_context(
                    user_id=request.user_id,
                    conversation_id=request.conversation_id
                )
            except Exception as e:
                print(f"Error getting memory context: {e}")
                memory_context = {}
        
        # Create initial state with memory context
        initial_state = {
            "query": request.message,
            "intent": "",
            "sql_query": None,
            "results": None,
            "visualization_config": None,
            "memory_context": memory_context,
            "db_schema": "",
            "error": None
        }
        
        # Invoke the workflow
        final_state = await workflow_app.ainvoke(initial_state)
        
        # Ensure results is always an array (never None)
        if final_state.get('results') is None:
            final_state['results'] = []
        
        # Generate a user-friendly message based on the state
        message = "Here's what I found."
        if final_state.get('error'):
            message = f"Error: {final_state['error']}"
        elif not final_state.get('results') or len(final_state['results']) == 0:
            if final_state.get('intent') == 'conversational':
                message = "I'm here to help! Ask me about products, sales, or anything related to the e-commerce database."
            else:
                message = "No results found for your query. Please try rephrasing your question."
        elif final_state.get('intent') == 'analytical' and final_state.get('sql_query'):
            message = f"Found {len(final_state['results'])} results for your query."
        elif final_state.get('intent') == 'semantic':
            message = f"Found {len(final_state['results'])} products matching your query."
        elif final_state.get('intent') == 'tool':
            message = "Here's the information you requested."
        
        # Add message to final state
        final_state['message'] = message
        
        # Store the exchange asynchronously (fire and forget) if memory manager is available
        if mem_manager:
            asyncio.create_task(
                mem_manager.store_exchange(
                    user_id=request.user_id,
                    conversation_id=request.conversation_id,
                    query=request.message,
                    response=str(final_state)  # Convert final_state to string representation
                )
            )
        
        # Return the final state
        return final_state
    except Exception as e:
        # Log the full error for debugging
        error_trace = traceback.format_exc()
        print(f"Error in chat_query: {error_trace}")
        
        # Return a proper error response with consistent structure
        error_response = {
            "query": request.message,
            "intent": "",
            "sql_query": None,
            "results": [],  # Always return an array
            "visualization_config": None,
            "memory_context": {},
            "db_schema": "",
            "error": str(e),
            "message": f"Error processing your query: {str(e)}"
        }
        
        return error_response

