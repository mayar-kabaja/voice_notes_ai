try:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable
except ImportError:
    # Fallback for older versions
    from youtube_transcript_api import YouTubeTranscriptApi
    TranscriptsDisabled = Exception
    NoTranscriptFound = Exception
    VideoUnavailable = Exception
import re

def extract_video_id(url):
    """Extract YouTube video ID from various URL formats"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?]*)',
        r'youtube\.com\/embed\/([^&\n?]*)',
        r'youtube\.com\/v\/([^&\n?]*)'
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    # If it's just the video ID
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url):
        return url

    return None

def get_youtube_transcript(video_url):
    """
    Get transcript from YouTube video URL
    Returns the transcript text and video title
    """
    try:
        video_id = extract_video_id(video_url)

        if not video_id:
            raise ValueError("Invalid YouTube URL format")

        # Try multiple language options (including auto-generated)
        languages_to_try = [
            ['en'],       # English
            ['a.en'],     # Auto-generated English
            ['ar'],       # Arabic
            ['a.ar'],     # Auto-generated Arabic
            ['es'],       # Spanish
            ['fr'],       # French
            ['de'],       # German
            ['pt'],       # Portuguese
            ['ru'],       # Russian
            ['hi'],       # Hindi
            ['ja'],       # Japanese
            ['ko'],       # Korean
        ]

        transcript_data = None
        last_error = None

        for languages in languages_to_try:
            try:
                api_result = YouTubeTranscriptApi().fetch(video_id, languages=languages)
                transcript_data = api_result.segments if hasattr(api_result, 'segments') else api_result
                break
            except TranscriptsDisabled:
                return {
                    'success': False,
                    'error': "⚠️ This video has transcripts disabled.\n\n"
                             "Please try:\n"
                             "1. A different video with captions enabled\n"
                             "2. Uploading the video file directly"
                }
            except NoTranscriptFound as e:
                last_error = e
                continue
            except VideoUnavailable:
                return {
                    'success': False,
                    'error': "⚠️ This video is unavailable.\n\n"
                             "It might be:\n"
                             "• Private or deleted\n"
                             "• Region-restricted\n"
                             "• Age-restricted\n\n"
                             "Try a different public video."
                }
            except Exception as e:
                last_error = e
                continue

        if not transcript_data:
            return {
                'success': False,
                'error': "⚠️ No captions/transcripts available for this video.\n\n"
                         "Please try:\n"
                         "1. A video with auto-generated captions\n"
                         "2. Uploading the video file directly\n\n"
                         "💡 Most YouTube videos have auto-captions!"
            }

        # Combine all text - handle both dict and object formats
        transcript_text = " ".join([
            item.text if hasattr(item, 'text') else item['text']
            for item in transcript_data
        ])

        return {
            'video_id': video_id,
            'transcript': transcript_text,
            'success': True
        }

    except Exception as e:
        return {
            'success': False,
            'error': f"Could not retrieve transcript: {str(e)}"
        }

def get_video_title_from_url(video_url):
    """Extract video title from URL (simplified version)"""
    video_id = extract_video_id(video_url)
    if video_id:
        return f"YouTube Video ({video_id})"
    return "YouTube Video"
