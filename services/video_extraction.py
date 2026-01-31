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
            raise ValueError("Invalid YouTube URL")

        print(f"Fetching transcript for video ID: {video_id}", flush=True)

        # Create API instance
        api = YouTubeTranscriptApi()

        # Try to get transcript with multiple language fallbacks
        transcript_obj = None
        languages_to_try = [
            ['en'],               # English
            ['en-US', 'en-GB'],  # English variants
            ['ar'],               # Arabic
            ['es'],               # Spanish
            ['fr'],               # French
            ['de'],               # German
        ]

        transcript_data = None
        for languages in languages_to_try:
            try:
                print(f"Trying languages: {languages}", flush=True)
                fetched = api.fetch(video_id, languages=languages)
                # The fetch() method returns a FetchedTranscript object
                # We need to get the segments from it
                transcript_data = fetched.segments if hasattr(fetched, 'segments') else fetched
                print(f"Successfully got transcript in {languages}", flush=True)
                break
            except Exception as e:
                print(f"Failed with {languages}: {str(e)}", flush=True)
                continue

        # If all language attempts failed, raise error
        if not transcript_data:
            return {
                'success': False,
                'error': "No transcript available for this video. The video may not have captions enabled."
            }

        print(f"Transcript fetched successfully, {len(transcript_data)} segments", flush=True)

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
        import traceback
        error_details = traceback.format_exc()
        print(f"Error getting YouTube transcript: {str(e)}\n{error_details}", flush=True)
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
