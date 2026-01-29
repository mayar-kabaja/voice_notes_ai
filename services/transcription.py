"""
Audio transcription service using OpenAI Whisper API
"""
import openai
from config import Config

openai.api_key = Config.OPENAI_API_KEY


def transcribe_audio(audio_file_path):
    """
    Transcribe audio file using OpenAI Whisper API

    Args:
        audio_file_path (str): Path to the audio file

    Returns:
        str: Transcribed text
    """
    try:
        with open(audio_file_path, 'rb') as audio_file:
            transcript = openai.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )
        return transcript
    except Exception as e:
        print(f"Transcription error: {e}")
        raise


def transcribe_audio_with_timestamps(audio_file_path):
    """
    Transcribe audio file with timestamps

    Args:
        audio_file_path (str): Path to the audio file

    Returns:
        dict: Transcribed text with timestamps
    """
    try:
        with open(audio_file_path, 'rb') as audio_file:
            transcript = openai.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json"
            )
        return transcript
    except Exception as e:
        print(f"Transcription error: {e}")
        raise
