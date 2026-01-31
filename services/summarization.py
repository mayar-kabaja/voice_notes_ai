"""
AI summarization service for meeting notes using Groq
"""
from openai import OpenAI
from config import Config
import re

# Groq uses OpenAI-compatible API
client = OpenAI(
    api_key=Config.GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)


def format_api_error(error):
    """
    Format API errors into user-friendly messages

    Args:
        error: Exception from API call

    Returns:
        str: User-friendly error message
    """
    error_str = str(error)

    # Check for rate limit error
    if 'rate_limit' in error_str.lower() or '429' in error_str:
        # Extract wait time if available
        wait_time_match = re.search(r'try again in (\d+)m', error_str)
        if wait_time_match:
            minutes = wait_time_match.group(1)
            return f"⏳ Rate limit reached. Please try again in {minutes} minutes. You can upgrade your plan at https://console.groq.com/settings/billing for higher limits."
        else:
            return "⏳ Rate limit reached. Please wait a few minutes and try again, or upgrade your plan for higher limits."

    # Check for quota/billing errors
    if 'quota' in error_str.lower() or 'insufficient' in error_str.lower():
        return "💳 API quota exceeded. Please check your billing at https://console.groq.com/settings/billing"

    # Check for authentication errors
    if 'auth' in error_str.lower() or '401' in error_str or '403' in error_str:
        return "🔑 Authentication error. Please check your API key configuration."

    # Check for timeout errors
    if 'timeout' in error_str.lower():
        return "⏱️ Request timed out. Please try again."

    # Generic error
    return f"❌ An error occurred: {error_str[:200]}"


def generate_summary(transcript):
    """
    Generate structured meeting notes from transcript

    Args:
        transcript (str): Meeting transcript text

    Returns:
        str: Formatted meeting notes with summary, action items, etc.
    """
    prompt = f"""
    You are an AI assistant that converts meeting transcripts into well-organized, structured notes.

    Please analyze the following transcript and create a summary using this EXACT format:

    📝 1. Summary

    Write 2-3 clear sentences summarizing the main topic and purpose. Each sentence should be on its own line.


    🔑 2. Key Points Discussed

    2.1 First key point

    2.2 Second key point

    2.3 Third key point


    ✅ 3. Action Items

    3.1 Action item (with responsible party if mentioned)

    3.2 Second action item

    (If none, write: "None mentioned in the transcript.")


    💡 4. Decisions Made

    4.1 First decision

    4.2 Second decision

    (If none, write: "None mentioned in the transcript.")


    ⏭️ 5. Next Steps

    5.1 First next step

    5.2 Second next step

    (If none, write: "None mentioned in the transcript.")


    IMPORTANT:
    - Use the emojis shown above before each main section number
    - DO NOT use ## markdown headers, just use the emoji + plain numbering
    - Add blank lines between sections
    - Each sentence and item must be on its own separate line
    - Use hierarchical numbering (1, 2, 3 for main sections; 2.1, 2.2, 3.1, 3.2 for sub-items)
    - Be clear and concise

    Transcript:
    {transcript}
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that creates structured meeting notes."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )

        summary = response.choices[0].message.content
        return summary
    except Exception as e:
        print(f"Summarization error: {e}")
        friendly_error = format_api_error(e)
        raise Exception(friendly_error)


def translate_text(text, target_language):
    """
    Translate text to target language using Groq

    Args:
        text (str): Text to translate
        target_language (str): Target language (e.g., "Spanish", "French", "Arabic")

    Returns:
        str: Translated text
    """
    prompt = f"""
    Translate the following text to {target_language}.
    Maintain the same formatting, structure, and sections.
    Keep headers and bullet points intact.

    Text to translate:
    {text}
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": f"You are a professional translator. Translate text to {target_language} while preserving formatting."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000
        )

        translation = response.choices[0].message.content
        return translation
    except Exception as e:
        print(f"Translation error: {e}")
        friendly_error = format_api_error(e)
        raise Exception(friendly_error)


def extract_action_items(transcript):
    """
    Extract specific action items from transcript

    Args:
        transcript (str): Meeting transcript text

    Returns:
        list: List of action items
    """
    prompt = f"""
    Extract all action items from the following meeting transcript.
    Return them as a bulleted list.

    Transcript:
    {transcript}
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You extract action items from meeting transcripts."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=500
        )

        action_items = response.choices[0].message.content
        return action_items
    except Exception as e:
        print(f"Action item extraction error: {e}")
        friendly_error = format_api_error(e)
        raise Exception(friendly_error)


def summarize_book(book_text, max_length=10000):
    """
    Generate a comprehensive summary of a book

    Args:
        book_text (str): Full text of the book
        max_length (int): Maximum characters to process (to avoid token limits)

    Returns:
        dict: Dictionary with 'summary' and 'key_points'
    """
    # Truncate if too long (Groq has token limits)
    if len(book_text) > max_length:
        book_text = book_text[:max_length] + "..."

    prompt = f"""
    You are an expert book analyst. Analyze the following book text and create a comprehensive summary.

    Please provide:

    📖 1. SUMMARY
    Write 3-5 paragraphs that capture the main themes, arguments, and key ideas of the book.

    🔑 2. KEY POINTS
    List 8-12 of the most important points, insights, or lessons from the book.
    Format each as: "• Point description"

    💡 3. MAIN TAKEAWAYS
    Provide 3-5 actionable takeaways or lessons readers should remember.

    Keep the language clear and accessible.

    Book text:
    {book_text}
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an expert at analyzing and summarizing books."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )

        result = response.choices[0].message.content
        return result
    except Exception as e:
        print(f"Book summarization error: {e}")
        friendly_error = format_api_error(e)
        raise Exception(friendly_error)

def chat_with_context(user_message, summary=None, transcript=None):
    """
    Handle conversational AI with context from processed content
    
    Args:
        user_message (str): User's message/question
        summary (str): Summary of processed content (optional)
        transcript (str): Full transcript/text (optional)
        
    Returns:
        str: AI's response
    """
    # Build context for AI
    context = ""
    if summary:
        context += f"Content Summary:\n{summary}\n\n"
    if transcript:
        # Truncate transcript if too long
        max_transcript_length = 5000
        if len(transcript) > max_transcript_length:
            transcript = transcript[:max_transcript_length] + "..."
        context += f"Full Content:\n{transcript}\n\n"
    
    if context:
        system_prompt = """You are NoteFlow AI, a helpful assistant that helps users understand and work with their content.
You have access to the user's recently processed content (audio transcripts, book summaries, or video summaries).
Your job is to:
- Answer questions about the content
- Provide summaries in different formats (shorter, bullet points, etc.)
- Extract specific information (action items, key points, dates, etc.)
- Translate or rephrase content
- Help users understand and utilize their content

Be concise, helpful, and friendly. Use emojis occasionally to be engaging."""

        prompt = f"{context}User request: {user_message}"
    else:
        # No context - general conversation
        system_prompt = """You are NoteFlow AI, a helpful assistant for note-taking and content processing.
Help users with:
- Questions about NoteFlow AI features
- General questions about content summarization
- Tips on how to use the app effectively

Be concise, helpful, and friendly."""
        
        prompt = user_message
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        ai_response = response.choices[0].message.content
        return ai_response
    except Exception as e:
        print(f"Chat error: {e}")
        friendly_error = format_api_error(e)
        raise Exception(friendly_error)
