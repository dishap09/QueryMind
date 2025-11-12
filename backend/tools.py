import wikipediaapi
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# GEMINI_API_KEY will be checked when get_definition is called


def wikipedia_lookup(topic: str) -> str:
    """
    Fetch a Wikipedia summary for a given topic.
    
    Args:
        topic: The topic to look up on Wikipedia
        
    Returns:
        A summary string from Wikipedia, or an error message if not found
    """
    try:
        # Wikipedia requires a user agent - use a descriptive one
        user_agent = "QueryMind-EcommerceBot/1.0 (https://github.com/your-repo; your-email@example.com) Python"
        wiki_wiki = wikipediaapi.Wikipedia(
            language='en',
            user_agent=user_agent
        )
        page = wiki_wiki.page(topic)
        
        if page.exists():
            # Return the summary (first few paragraphs, limit to 500 chars)
            summary = page.summary
            if len(summary) > 500:
                summary = summary[:500] + "..."
            return summary
        else:
            return f"Wikipedia article not found for '{topic}'. Please try a different search term."
    except Exception as e:
        return f"Error fetching Wikipedia data: {str(e)}"


async def get_definition(term: str) -> str:
    """
    Get a definition of a term in the context of Brazilian e-commerce using Gemini.
    
    Args:
        term: The term to define
        
    Returns:
        A simple definition of the term in Brazilian e-commerce context
    """
    try:
        # Check for API key when function is called
        GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
        if not GEMINI_API_KEY:
            return "Error: GEMINI_API_KEY must be set in .env file"
        
        # Configure genai (idempotent - safe to call multiple times)
        genai.configure(api_key=GEMINI_API_KEY)
        
        prompt = f"In the context of Brazilian e-commerce, define this term simply: {term}. For example, 'boleto' is a Brazilian payment method."
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        return response.text.strip()
    except Exception as e:
        return f"Error getting definition: {str(e)}"


async def translate_to_english(text: str) -> str:
    """
    Translate text from Portuguese (or any language) to English using Gemini.
    
    Args:
        text: The text to translate
        
    Returns:
        Translated text in English
    """
    try:
        # Check for API key when function is called
        GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
        if not GEMINI_API_KEY:
            return "Error: GEMINI_API_KEY must be set in .env file"
        
        # Configure genai (idempotent - safe to call multiple times)
        genai.configure(api_key=GEMINI_API_KEY)
        
        prompt = f"Translate the following text to English. If it's already in English, return it as is. Only return the translation, no explanations:\n\n{text}"
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        return response.text.strip()
    except Exception as e:
        return f"Translation error: {str(e)}"

