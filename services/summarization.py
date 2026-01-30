"""
AI summarization service for meeting notes using Groq
"""
from openai import OpenAI
from config import Config

# Groq uses OpenAI-compatible API
client = OpenAI(
    api_key=Config.GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)


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

    1. Summary

    Write 2-3 clear sentences summarizing the main topic and purpose. Each sentence should be on its own line.


    2. Key Points Discussed

    2.1 First key point

    2.2 Second key point

    2.3 Third key point


    3. Action Items

    3.1 Action item (with responsible party if mentioned)

    3.2 Second action item

    (If none, write: "None mentioned in the transcript.")


    4. Decisions Made

    4.1 First decision

    4.2 Second decision

    (If none, write: "None mentioned in the transcript.")


    5. Next Steps

    5.1 First next step

    5.2 Second next step

    (If none, write: "None mentioned in the transcript.")


    IMPORTANT:
    - DO NOT use ## markdown headers, just use plain numbering
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
        raise


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
        raise
