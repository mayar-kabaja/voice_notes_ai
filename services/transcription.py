
"""
Audio transcription service using AssemblyAI API
"""
import assemblyai as aai
from config import Config
import httpx

aai.settings.api_key = Config.ASSEMBLYAI_API_KEY

# Create custom HTTP client with longer timeout
http_client = httpx.Client(timeout=300.0)  # 5 minutes timeout


def transcribe_audio(audio_file_path):
    """
    Transcribe audio file using AssemblyAI API
    Supports automatic language detection for 100+ languages

    Args:
        audio_file_path (str): Path to the audio file

    Returns:
        str: Transcribed text
    """
    try:
        # Enable automatic language detection
        config = aai.TranscriptionConfig(
            language_detection=True
        )

        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(audio_file_path, config=config)

        if transcript.status == aai.TranscriptStatus.error:
            raise Exception(f"Transcription failed: {transcript.error}")

        return transcript.text
    except Exception as e:
        print(f"Transcription error: {e}")
        raise


def transcribe_audio_with_timestamps(audio_file_path):
    """
    Transcribe audio file with timestamps and speaker detection

    Args:
        audio_file_path (str): Path to the audio file

    Returns:
        dict: Transcribed text with timestamps and speaker labels
    """
    try:
        config = aai.TranscriptionConfig(speaker_labels=True)
        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(audio_file_path, config=config)

        if transcript.status == aai.TranscriptStatus.error:
            raise Exception(f"Transcription failed: {transcript.error}")

        # Return structured data with timestamps and speakers
        return {
            'text': transcript.text,
            'utterances': [
                {
                    'text': utterance.text,
                    'start': utterance.start,
                    'end': utterance.end,
                    'speaker': utterance.speaker
                }
                for utterance in transcript.utterances
            ] if transcript.utterances else []
        }
    except Exception as e:
        print(f"Transcription error: {e}")
        raise
