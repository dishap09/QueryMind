import asyncio
import os
import chromadb
from dotenv import load_dotenv
import google.generativeai as genai

# --- 1. Configuration ---
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in .env file")

print("Configuring Gemini embedding model...")
genai.configure(api_key=GOOGLE_API_KEY)
gemini_embedder = genai.GenerativeModel('models/embedding-001')

# --- 2. ChromaDB Connection ---
try:
    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    collection = chroma_client.get_collection(name="products")
    print("Connected to ChromaDB collection 'products'.")
except Exception as e:
    print(f"Failed to connect to ChromaDB: {e}")
    print("Did you run 'database/build_vector_db.py' first?")
    exit()


# --- 3. The Test Function ---
async def run_test():
    print("--- Testing Semantic Search ---")
    
    # Use a query in Portuguese, since the reviews are in Portuguese
    test_query = "produto de alta qualidade e duravel" # "a product that is high quality and durable"
    
    print(f"Querying for: '{test_query}'")

    try:
        # Generate embedding for the QUERY
        result = genai.embed_content(
            model='models/embedding-001',
            content=test_query,
            task_type="RETRIEVAL_QUERY" # Use RETRIEVAL_QUERY for searching
        )
        query_embedding = result['embedding']
        
        # Search ChromaDB
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=3
        )
        
        if results and results.get('ids'):
            print("\n[SUCCESS] ChromaDB is working!")
            print("Found the following matching product_ids:")
            for i, product_id in enumerate(results['ids'][0]):
                print(f"  - ID: {product_id}")
                # Optional: print the document text
                # print(f"    Doc: {results['documents'][0][i][:100]}...") 
        else:
            print("\n[FAILURE] No results found. The database is empty or the query didn't match.")

    except Exception as e:
        print(f"\n[ERROR] An error occurred during search: {e}")


if __name__ == "__main__":
    asyncio.run(run_test())