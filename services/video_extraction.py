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
import os
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

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


def get_transcript_via_youtube_api(video_id):
    """
    Get transcript using official YouTube Data API v3
    More reliable in production environments
    """
    api_key = os.getenv('YOUTUBE_API_KEY')

    if not api_key:
        return None  # Fall back to transcript API

    try:
        # Build YouTube API client
        youtube = build('youtube', 'v3', developerKey=api_key)

        # Get caption tracks for the video
        captions_response = youtube.captions().list(
            part='snippet',
            videoId=video_id
        ).execute()

        if not captions_response.get('items'):
            return None

        # Find English caption or first available
        caption_id = None
        for item in captions_response['items']:
            lang = item['snippet']['language']
            if lang in ['en', 'en-US', 'en-GB']:
                caption_id = item['id']
                break

        if not caption_id and captions_response['items']:
            caption_id = captions_response['items'][0]['id']

        if not caption_id:
            return None

        # Download the caption
        caption_response = youtube.captions().download(
            id=caption_id,
            tfmt='srt'  # SubRip format
        ).execute()

        # Parse SRT format and extract text
        import re
        # Remove timing and numbering from SRT
        text = re.sub(r'\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n', '', caption_response)
        text = re.sub(r'^\d+$', '', text, flags=re.MULTILINE)
        text = ' '.join(text.split())

        return text

    except HttpError as e:
        # API quota exceeded or other API error
        if e.resp.status == 403:
            print(f"YouTube API quota exceeded or permissions issue: {e}")
        return None
    except Exception as e:
        print(f"YouTube Data API error: {e}")
        return None

def get_youtube_transcript(video_url):
    """
    Get transcript from YouTube video URL using hybrid approach:
    1. Try official YouTube Data API (works in production)
    2. Fall back to transcript scraping API (works locally)
    """
    import time

    try:
        video_id = extract_video_id(video_url)

        if not video_id:
            raise ValueError("Invalid YouTube URL format")

        # Try official YouTube Data API first (production-safe)
        transcript_text = get_transcript_via_youtube_api(video_id)
        if transcript_text:
            return {
                'video_id': video_id,
                'transcript': transcript_text,
                'success': True,
                'method': 'youtube_data_api'
            }

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
        max_retries = 3

        # Try multiple times with delays
        for retry in range(max_retries):
            for languages in languages_to_try:
                try:
                    # Try with cookies first for better compatibility
                    try:
                        transcript_list = YouTubeTranscriptApi.get_transcript(
                            video_id,
                            languages=languages,
                            proxies=None,
                            cookies=None
                        )
                        transcript_data = transcript_list
                        break
                    except:
                        # Fallback to simple method
                        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
                        transcript_data = transcript_list
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

            if transcript_data:
                break

            # Wait before retrying (exponential backoff)
            if retry < max_retries - 1:
                time.sleep(2 ** retry)

        if not transcript_data:
            # Try to list available transcripts to provide better error message
            try:
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                available = []
                for transcript in transcript_list:
                    available.append(f"• {transcript.language} ({'auto' if transcript.is_generated else 'manual'})")

                if available:
                    return {
                        'success': False,
                        'error': f"⚠️ Could not find supported language transcript.\n\n"
                                 f"Available transcripts:\n" + "\n".join(available[:5]) +
                                 f"\n\n💡 Try uploading the video file directly for better results!"
                    }
            except:
                pass

            return {
                'success': False,
                'error': "⚠️ No captions/transcripts available for this video.\n\n"
                         "This could be because:\n"
                         "• The video has no captions\n"
                         "• YouTube is blocking automated access\n"
                         "• The video is region-restricted\n\n"
                         "📹 **Solution:** Download the video and upload it directly!\n"
                         "This works 100% of the time and gives better quality."
            }

        # Combine all text - handle both dict and object formats
        transcript_text = " ".join([
            item.text if hasattr(item, 'text') else item['text']
            for item in transcript_data
        ])

        return {
            'video_id': video_id,
            'transcript': transcript_text,
            'success': True,
            'method': 'transcript_api'
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
