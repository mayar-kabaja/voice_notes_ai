"""
AI summarization service for meeting notes
"""
import openai
from config import Config

openai.api_key = Config.OPENAI_API_KEY


def generate_summary(transcript):
    """
    Generate structured meeting notes from transcript

    Args:
        transcript (str): Meeting transcript text

    Returns:
        str: Formatted meeting notes with summary, action items, etc.
    """
    prompt = f"""
    You are an AI assistant that converts meeting transcripts into structured notes.

    Please analyze the following transcript and create:
    1. A brief summary (2-3 sentences)
    2. Key points discussed
    3. Action items (if any)
    4. Decisions made (if any)
    5. Next steps (if any)

    Format the output in clear sections with headers.

    Transcript:
    {transcript}
    """

    try:
        response = openai.chat.completions.create(
            model="gpt-4",
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
        raise


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
        response = openai.chat.completions.create(
            model="gpt-4",
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
        raise
