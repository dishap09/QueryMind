import asyncpg
import os
from dotenv import load_dotenv
from typing import List, Dict, Any

# Load environment variables from .env file
load_dotenv()

# Create connection pool
_pool: asyncpg.Pool = None


def _get_db_config():
    """Get database configuration from environment variables."""
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 5432))
    DB_NAME = os.getenv('DB_NAME')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    
    if not DB_NAME or not DB_PASSWORD:
        raise ValueError("DB_NAME and DB_PASSWORD must be set in .env file")
    
    return DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD


async def get_pool() -> asyncpg.Pool:
    """Get or create the database connection pool."""
    global _pool
    if _pool is None:
        # Get database config (will raise error if not set)
        DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD = _get_db_config()
        
        _pool = await asyncpg.create_pool(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            min_size=1,
            max_size=10
        )
    return _pool


async def close_pool():
    """Close the database connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def fetch_schema() -> str:
    """
    Query information_schema.columns to get table names, column names, and data types
    for all 'public' schema tables. Returns a clean, readable string formatted for AI prompts.
    """
    pool = await get_pool()
    
    query = """
        SELECT 
            table_name,
            column_name,
            data_type,
            is_nullable,
            character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
    """
    
    rows = await pool.fetch(query)
    
    # Group by table name
    tables = {}
    for row in rows:
        table_name = row['table_name']
        if table_name not in tables:
            tables[table_name] = []
        
        col_info = {
            'name': row['column_name'],
            'type': row['data_type'],
            'nullable': row['is_nullable'] == 'YES',
            'max_length': row['character_maximum_length']
        }
        tables[table_name].append(col_info)
    
    # Format as readable string
    schema_str = "Database Schema:\n\n"
    for table_name, columns in sorted(tables.items()):
        schema_str += f"Table: {table_name}\n"
        schema_str += "-" * (len(table_name) + 7) + "\n"
        for col in columns:
            type_str = col['type']
            if col['max_length']:
                type_str += f"({col['max_length']})"
            nullable_str = "NULL" if col['nullable'] else "NOT NULL"
            schema_str += f"  - {col['name']}: {type_str} {nullable_str}\n"
        schema_str += "\n"
    
    return schema_str


async def execute_query(sql_query: str) -> List[Dict[str, Any]]:
    """
    Execute a read-only SQL query using asyncpg pool and return results as a list of dictionaries.
    Converts Decimal types to float for JSON serialization.
    """
    from decimal import Decimal
    import datetime
    
    pool = await get_pool()
    
    async with pool.acquire() as connection:
        rows = await connection.fetch(sql_query)
        
        # Convert rows to list of dictionaries
        results = []
        for row in rows:
            row_dict = {}
            for key, value in dict(row).items():
                # Convert Decimal to float for JSON serialization
                if isinstance(value, Decimal):
                    row_dict[key] = float(value)
                # Convert datetime objects to ISO format strings
                elif isinstance(value, (datetime.datetime, datetime.date)):
                    row_dict[key] = value.isoformat()
                # Keep other types as-is
                else:
                    row_dict[key] = value
            results.append(row_dict)
        
        return results

