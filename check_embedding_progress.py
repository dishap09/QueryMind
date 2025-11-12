#!/usr/bin/env python3
"""
Script to check the progress of embedding generation.
Compares the number of embeddings in ChromaDB with the total products in the database.
"""

import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os
import chromadb

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in .env file.")

# SQL query to count products with reviews (same as in build_vector_db.py)
sql_query = """
SELECT 
    COUNT(DISTINCT p.product_id) as total_products
FROM products p 
LEFT JOIN order_items oi ON p.product_id = oi.product_id 
LEFT JOIN order_reviews r ON oi.order_id = r.order_id 
WHERE r.review_comment_message IS NOT NULL
"""

print("=" * 60)
print("Embedding Progress Check")
print("=" * 60)

# Get total products from database
print("\n1. Checking database for total products with reviews...")
try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text(sql_query))
        total_products = result.fetchone()[0]
    print(f"   ✓ Total products with reviews: {total_products:,}")
except Exception as e:
    print(f"   ✗ Error querying database: {e}")
    total_products = None

# Get current embeddings count from ChromaDB
print("\n2. Checking ChromaDB collection...")
try:
    client = chromadb.PersistentClient(path="./chroma_db")
    collection = client.get_collection(name="products")
    current_embeddings = collection.count()
    print(f"   ✓ Current embeddings in ChromaDB: {current_embeddings:,}")
except Exception as e:
    print(f"   ✗ Error accessing ChromaDB: {e}")
    print("   Note: Collection might not exist yet. Run database/build_vector_db.py to create it.")
    current_embeddings = None

# Calculate progress
print("\n" + "=" * 60)
if total_products is not None and current_embeddings is not None:
    if total_products > 0:
        progress_percent = (current_embeddings / total_products) * 100
        remaining = total_products - current_embeddings
        
        print(f"Progress: {current_embeddings:,} / {total_products:,} products")
        print(f"Completion: {progress_percent:.2f}%")
        print(f"Remaining: {remaining:,} products")
        
        # Progress bar
        bar_length = 40
        filled = int(bar_length * progress_percent / 100)
        bar = "█" * filled + "░" * (bar_length - filled)
        print(f"\n[{bar}] {progress_percent:.1f}%")
        
        if current_embeddings == total_products:
            print("\n✓ Embedding generation is complete!")
        elif current_embeddings > 0:
            print(f"\n⏳ Embedding generation in progress...")
            print(f"   Run 'python database/build_vector_db.py' to continue/complete.")
        else:
            print("\n⚠ No embeddings found. Run 'python database/build_vector_db.py' to start.")
    else:
        print("⚠ No products with reviews found in database.")
elif current_embeddings is not None:
    print(f"Current embeddings: {current_embeddings:,}")
    print("(Could not determine total products for comparison)")
else:
    print("⚠ Could not determine progress. Check your database and ChromaDB setup.")

print("=" * 60)

