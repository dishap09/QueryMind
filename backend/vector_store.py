import chromadb
from openai import OpenAI
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure OpenAI client for embeddings
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY must be set in .env file")

openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Use the same embedding model that was used to create the ChromaDB embeddings
EMBEDDING_MODEL = "text-embedding-3-small"

# Initialize ChromaDB client
client = chromadb.PersistentClient(path="./chroma_db")

# Collection will be loaded lazily
_collection = None

def get_collection():
    """Get the products collection, creating it if it doesn't exist."""
    global _collection
    if _collection is None:
        try:
            _collection = client.get_collection(name="products")
        except Exception:
            # If collection doesn't exist, create it
            _collection = client.get_or_create_collection(name="products")
    return _collection

async def semantic_search(query_text: str, n_results: int = 5):
    """
    Perform semantic search on the products collection.
    
    Uses OpenAI embeddings (text-embedding-3-small) to match the embeddings
    used when creating the ChromaDB collection.
    
    Args:
        query_text: The query text to search for
        n_results: Number of results to return (default: 5)
    
    Returns:
        List of product_ids from the search results
    """
    try:
        # Get the query embedding using OpenAI (same model as used for ChromaDB)
        response = openai_client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=query_text
        )
        
        # Extract embedding from response
        query_embedding = response.data[0].embedding
        
        # Query ChromaDB with the embedding
        collection = get_collection()
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results
        )
        
        # Extract and return the list of product_ids from the results['metadatas']
        product_ids = []
        if results and results.get('metadatas') and len(results['metadatas']) > 0:
            for metadata in results['metadatas'][0]:
                if 'product_id' in metadata:
                    product_ids.append(metadata['product_id'])
        
        return product_ids
    except Exception as e:
        error_msg = str(e)
        # Check if it's a quota/rate limit error
        if "quota" in error_msg.lower() or "429" in error_msg.lower() or "rate limit" in error_msg.lower():
            raise Exception(f"OpenAI API quota/rate limit exceeded. Please check your OpenAI API usage and billing. Error: {error_msg}")
        # Check if it's an authentication error
        elif "api key" in error_msg.lower() or "authentication" in error_msg.lower() or "401" in error_msg:
            raise Exception(f"OpenAI API authentication failed. Please check your OPENAI_API_KEY in .env file. Error: {error_msg}")
        # Check if collection is empty
        elif "empty" in error_msg.lower() or "not found" in error_msg.lower():
            raise Exception(f"Vector database is empty or not initialized. Please run the database/build_vector_db.py script to populate the vector database. Error: {error_msg}")
        else:
            raise Exception(f"Error performing semantic search: {error_msg}")

