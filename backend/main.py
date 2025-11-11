from fastapi import FastAPI
from pydantic import BaseModel
from backend.orchestrator import app as workflow_app

app = FastAPI()


class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    user_id: str


@app.post("/api/chat/query")
async def chat_query(request: ChatRequest):
    # Create initial state
    initial_state = {
        "query": request.message,
        "intent": "",
        "sql_query": None,
        "results": None,
        "visualization_config": None,
        "memory_context": {},  # TODO: Load from conversation_id if needed
        "db_schema": ""
    }
    
    # Invoke the workflow
    final_state = await workflow_app.ainvoke(initial_state)
    
    # Return the final state
    return final_state

