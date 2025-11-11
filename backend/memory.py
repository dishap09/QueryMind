import os
from dotenv import load_dotenv
from supermemory import AsyncSupermemory
from typing import Dict, Any

# Load environment variables
load_dotenv()


class MemoryManager:
    """
    Manages conversation memory using Supermemory API.
    """
    
    def __init__(self):
        """Initialize the MemoryManager with API key from environment."""
        self.api_key = os.getenv('SUPERMEMORY_API_KEY')
        if not self.api_key:
            raise ValueError("SUPERMEMORY_API_KEY must be set in .env file")
    
    async def get_context(self, user_id: str, conversation_id: str) -> Dict[str, Any]:
        """
        Retrieve conversation context for a user and conversation.
        
        Args:
            user_id: The user identifier
            conversation_id: The conversation identifier
            
        Returns:
            Dictionary containing the conversation context
        """
        client = AsyncSupermemory(api_key=self.api_key)
        try:
            # Call get_context on the client (using memories.get() as per the API)
            response = await client.memories.get(
                user_id=user_id,
                conversation_id=conversation_id
            )
            # Extract context from response - response might be an object with data attribute
            if hasattr(response, 'data'):
                return response.data if isinstance(response.data, dict) else {}
            elif hasattr(response, 'context'):
                return response.context if isinstance(response.context, dict) else {}
            elif isinstance(response, dict):
                return response
            else:
                # Try to convert response to dict if it has model_dump or similar
                if hasattr(response, 'model_dump'):
                    return response.model_dump()
                return {}
        except Exception as e:
            print(f"Error getting context: {e}")
            return {}
        finally:
            await client.close()
    
    async def store_exchange(
        self, 
        user_id: str, 
        conversation_id: str, 
        query: str, 
        response: str,
        **kwargs
    ) -> None:
        """
        Store a conversation exchange in memory.
        
        Args:
            user_id: The user identifier
            conversation_id: The conversation identifier
            query: The user's query/message
            response: The system's response
            **kwargs: Additional parameters for add_memory
        """
        client = AsyncSupermemory(api_key=self.api_key)
        try:
            # Call add_memory on the client (using memories.add() if that's the actual API)
            await client.memories.add(
                user_id=user_id,
                conversation_id=conversation_id,
                message=query,
                response=response,
                **kwargs
            )
        except Exception as e:
            print(f"Error storing exchange: {e}")
        finally:
            await client.close()

