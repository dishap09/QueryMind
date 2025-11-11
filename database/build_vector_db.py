import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os
import chromadb
from openai import OpenAI
import time

# Load environment variables from .env file
load_dotenv()

# Read database connection URL from .env
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in .env file. Please set DATABASE_URL in your .env file.")

# Configure OpenAI client
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found in .env file. Please set OPENAI_API_KEY in your .env file.")

openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# SQL query to fetch product data with reviews
sql_query = """
SELECT 
    p.product_id, 
    p.product_category_name, 
    t.product_category_name_english, 
    STRING_AGG(r.review_comment_message, ' ') as reviews 
FROM products p 
LEFT JOIN product_category_translation t ON p.product_category_name = t.product_category_name 
LEFT JOIN order_items oi ON p.product_id = oi.product_id 
LEFT JOIN order_reviews r ON oi.order_id = r.order_id 
WHERE r.review_comment_message IS NOT NULL 
GROUP BY p.product_id, p.product_category_name, t.product_category_name_english
"""

print("Executing SQL query to fetch product data...")
# Execute query and load into pandas DataFrame
with engine.connect() as conn:
    df = pd.read_sql(text(sql_query), conn)

print(f"Loaded {len(df)} products with reviews into DataFrame")

# Initialize ChromaDB client
print("Initializing ChromaDB client...")
client = chromadb.PersistentClient(path="./chroma_db")

# Create or get collection
print("Creating 'products' collection...")
collection = client.get_or_create_collection(name="products")

# Initialize OpenAI EmbeddingModel
print("Initializing OpenAI EmbeddingModel...")
# Use OpenAI text-embedding-3-small for embeddings
embedding_model = "text-embedding-3-small"

# Iterate through DataFrame and add to ChromaDB
print("Processing products and creating embeddings...")
for idx, row in df.iterrows():
    # Create text document
    reviews_text = str(row['reviews'])[:1000] if pd.notna(row['reviews']) else ""
    category = str(row['product_category_name_english']) if pd.notna(row['product_category_name_english']) else ""
    document = f"Product ID: {row['product_id']}\nCategory: {category}\nReviews: {reviews_text}"
    
    # Create embedding using OpenAI with retry logic
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            response = openai_client.embeddings.create(
                model=embedding_model,
                input=document
            )
            
            # Extract embedding values from result
            embedding = response.data[0].embedding
            
            # Add to ChromaDB
            collection.add(
                documents=[document],
                metadatas=[{'product_id': str(row['product_id'])}],
                embeddings=[embedding],
                ids=[str(row['product_id'])]
            )
            
            break  # Success, exit retry loop
            
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                print(f"Error on product {idx + 1}, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
            else:
                print(f"Failed to process product {idx + 1} after {max_retries} attempts: {e}")
                raise
    
    # Rate limiting: small delay between requests
    time.sleep(0.1)
    
    if (idx + 1) % 100 == 0:
        print(f"Processed {idx + 1}/{len(df)} products...")

print(f"\nSuccessfully built vector database with {len(df)} products!")
print(f"ChromaDB collection 'products' is ready at ./chroma_db")

