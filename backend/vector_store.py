import chromadb
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Google Generative AI client
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY must be set in .env file")

genai.configure(api_key=GEMINI_API_KEY)

# Initialize ChromaDB client
client = chromadb.PersistentClient(path="./chroma_db")

# Get the "products" collection
collection = client.get_collection(name="products")

# Initialize the EmbeddingModel (using Gemini embedding model)
# The model is accessed via genai.embed_content() with model='models/embedding-001'


async def semantic_search(query_text: str, n_results: int = 5):
    """
    Perform semantic search on the products collection.
    
    Args:
        query_text: The query text to search for
        n_results: Number of results to return (default: 5)
    
    Returns:
        List of product_ids from the search results
    """
    # Get the query embedding
    result = genai.embed_content(
        model='models/embedding-001',
        content=query_text,
        task_type="RETRIEVAL_QUERY"
    )
    query_embedding = result['embedding']
    
    # Query ChromaDB
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

