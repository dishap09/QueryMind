import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Read database connection URL from .env
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in .env file. Please set DATABASE_URL in your .env file.")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Read the schema.sql file
schema_file = os.path.join(os.path.dirname(__file__), 'schema.sql')
with open(schema_file, 'r') as f:
    schema_sql = f.read()

print("Creating database schema...")

# Execute the schema SQL
with engine.begin() as conn:
    # Split by semicolons and execute each statement
    statements = [s.strip() for s in schema_sql.split(';') if s.strip() and not s.strip().startswith('--')]
    
    for statement in statements:
        if statement:
            try:
                conn.execute(text(statement))
            except Exception as e:
                # Ignore errors for "already exists" cases
                if 'already exists' not in str(e).lower() and 'duplicate' not in str(e).lower():
                    print(f"Warning: {e}")

print("Database schema created successfully!")

