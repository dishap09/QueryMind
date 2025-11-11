import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Read database connection URL from .env
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in .env file. Please set DATABASE_URL in your .env file.")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Dictionary mapping table names to CSV file paths
table_csv_mapping = {
    'customers': 'data/olist_customers_dataset.csv',
    'sellers': 'data/olist_sellers_dataset.csv',
    'products': 'data/olist_products_dataset.csv',
    'product_category_translation': 'data/product_category_name_translation.csv',
    'orders': 'data/olist_orders_dataset.csv',
    'order_items': 'data/olist_order_items_dataset.csv',
    'order_payments': 'data/olist_order_payments_dataset.csv',
    'order_reviews': 'data/olist_order_reviews_dataset.csv',
    'geolocation': 'data/olist_geolocation_dataset.csv'
}

# List of all date columns across all files
date_columns = [
    'shipping_limit_date',
    'review_creation_date',
    'review_answer_timestamp',
    'order_purchase_timestamp',
    'order_approved_at',
    'order_delivered_carrier_date',
    'order_delivered_customer_date',
    'order_estimated_delivery_date'
]

# Loop through the dictionary of tables
for table_name, csv_path in table_csv_mapping.items():
    print(f"Loading {table_name} from {csv_path}...")
    
    # Read the CSV into a pandas DataFrame
    df = pd.read_csv(csv_path)
    
    # For any column in the DataFrame that is in our date_columns list, convert it to datetime
    for col in df.columns:
        if col in date_columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')
    
    # Use df.to_sql() to load the data into the correct table
    df.to_sql(
        name=table_name,
        con=engine,
        if_exists='append',
        index=False
    )
    
    print(f"Successfully loaded {len(df)} rows into {table_name}")

print("\nAll data loaded successfully!")

