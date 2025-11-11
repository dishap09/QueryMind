from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    user_id: str


@app.post("/api/chat/query")
async def chat_query(request: ChatRequest):
    return {"response": "Query received", "data": {}}

