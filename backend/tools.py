import wikipediaapi
import os
from dotenv import load_dotenv
import google.generativeai as genai
import asyncio

# Load environment variables
load_dotenv()

# GEMINI_API_KEY will be checked when get_definition is called


async def wikipedia_lookup(topic: str, fallback_to_gemini: bool = True) -> str:
    """
    Fetch a Wikipedia summary for a given topic with retry logic and fallback.
    
    Args:
        topic: The topic to look up on Wikipedia
        fallback_to_gemini: If True, fall back to Gemini's get_definition if Wikipedia fails
        
    Returns:
        A summary string from Wikipedia, or a fallback definition if Wikipedia fails
    """
    max_retries = 3
    retry_delay = 2  # Start with 2 seconds
    
    for attempt in range(max_retries):
        try:
            # Wikipedia requires a user agent - use a descriptive one
            user_agent = "QueryMind-EcommerceBot/1.0 (https://github.com/your-repo; your-email@example.com) Python"
            
            # Create Wikipedia instance with timeout settings
            wiki_wiki = wikipediaapi.Wikipedia(
                language='en',
                user_agent=user_agent,
                extract_format=wikipediaapi.ExtractFormat.WIKI
            )
            
            # Set a timeout for the page fetch operation
            # Run the blocking operation in an executor to allow timeout
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                # Fallback if no running loop (shouldn't happen in async function)
                loop = asyncio.get_event_loop()
            
            page = await asyncio.wait_for(
                loop.run_in_executor(None, lambda: wiki_wiki.page(topic)),
                timeout=15.0  # 15 second timeout
            )
            
            if page.exists():
                # Get summary with timeout
                summary = await asyncio.wait_for(
                    loop.run_in_executor(None, lambda: page.summary),
                    timeout=10.0  # 10 second timeout for summary
                )
                
                if summary:
                    # Return the summary (first few paragraphs, limit to 500 chars)
                    if len(summary) > 500:
                        summary = summary[:500] + "..."
                    return summary
                else:
                    # Empty summary, try fallback
                    break
            else:
                # Page doesn't exist, try fallback
                break
                
        except asyncio.TimeoutError:
            if attempt < max_retries - 1:
                wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                print(f"Wikipedia lookup timeout for '{topic}', retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(wait_time)
            else:
                print(f"Wikipedia lookup timed out for '{topic}' after {max_retries} attempts")
                break
        except Exception as e:
            error_msg = str(e).lower()
            # Check if it's a timeout or connection error
            if 'timeout' in error_msg or 'connection' in error_msg or 'max retries' in error_msg:
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                    print(f"Wikipedia connection error for '{topic}', retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(wait_time)
                else:
                    print(f"Wikipedia connection failed for '{topic}' after {max_retries} attempts: {e}")
                    break
            else:
                # Non-timeout error, don't retry
                print(f"Wikipedia lookup error for '{topic}': {e}")
                break
    
    # If we get here, Wikipedia lookup failed - try fallback if enabled
    if fallback_to_gemini:
        print(f"Falling back to Gemini definition for '{topic}'")
        try:
            return await get_definition(topic)
        except Exception as e:
            return f"Unable to fetch information about '{topic}'. Wikipedia lookup timed out and fallback also failed: {str(e)}"
    else:
        return f"Wikipedia article not found or connection timed out for '{topic}'. Please try again or use a different search term."


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

