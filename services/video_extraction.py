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
import tempfile
import glob
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


def _transcripts_disabled_message(video_id):
    """
    Return a user-friendly message for TranscriptsDisabled.
    Tries list_transcripts() to distinguish "no captions" vs "access restricted".
    """
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        available = list(transcript_list)
        if available:
            # Captions exist but we couldn't fetch (e.g. geo/access restriction)
            return (
                "⚠️ Transcripts aren't available for this video.\n\n"
                "Captions may exist but access is restricted (e.g. by region or by YouTube). "
                "Try another video or use a video file upload instead."
            )
    except Exception:
        pass
    return (
        "⚠️ This video has captions/transcripts disabled.\n\n"
        "The uploader has not made subtitles available, or they are not available in a supported format. "
        "Try another video or upload the video file to transcribe it."
    )


def _parse_subtitle_file(filepath):
    """Extract plain text from VTT or SRT subtitle file."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        # Strip XML-style tags (e.g. <00:00:00.199>, <c>...</c>) - keep inner text
        content = re.sub(r'<[^>]+>', '', content)
        # Strip VTT/SRT timing lines and numbers; keep dialogue lines
        content = re.sub(r'\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}.*', '', content)
        content = re.sub(r'^\d+\s*$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^WEBVTT.*$', '', content, flags=re.MULTILINE)
        # Strip yt-dlp metadata lines (e.g. "Kind: captions Language: en")
        content = re.sub(r'Kind:\s*captions\s*', '', content, flags=re.IGNORECASE)
        content = re.sub(r'Language:\s*[\w-]+\s*', '', content, flags=re.IGNORECASE)
        # Normalize whitespace
        content = re.sub(r'\s+', ' ', content).strip()
        return content if content else None
    except Exception:
        return None


def get_transcript_via_ytdlp(video_url):
    """
    Get transcript using yt-dlp (downloads captions / auto-subs).
    Alternative to youtube_transcript_api; often works when the latter is blocked.
    """
    try:
        import yt_dlp
    except ImportError:
        return None

    with tempfile.TemporaryDirectory() as tmpdir:
        # Use a simple base name so subtitle files are e.g. out.en.vtt, out.a.en.vtt
        outtmpl = os.path.join(tmpdir, 'out')
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'en-US', 'en-GB', 'a.en'],
            'subtitlesformat': 'vtt/srt',  # Prefer parseable formats (avoid json3)
            'outtmpl': outtmpl,
            'quiet': True,
            'no_warnings': True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_url])
        except Exception as e:
            print(f"yt-dlp subtitle download failed: {e}")
            return None

        # Find any subtitle file (yt-dlp may name e.g. out.en.vtt, out.a.en.vtt, or out.en.srt)
        best_text = None
        best_len = 0
        for root, _dirs, files in os.walk(tmpdir):
            for name in files:
                path = os.path.join(root, name)
                if not os.path.isfile(path):
                    continue
                if not (path.endswith(('.vtt', '.srt', '.sbv')) or '.en' in name or '.a.en' in name):
                    continue
                text = _parse_subtitle_file(path)
                if text and len(text.strip()) > best_len:
                    best_text = text.strip()
                    best_len = len(best_text)
        if best_text and best_len >= 10:
            return best_text
    return None


def get_transcript_via_assemblyai(video_url):
    """
    Fallback: download audio with yt-dlp and transcribe with AssemblyAI.
    Works for videos with no captions (uses your existing AssemblyAI key).
    """
    try:
        import yt_dlp
        from services.transcription import transcribe_audio
    except ImportError:
        return None

    with tempfile.TemporaryDirectory() as tmpdir:
        outpath = os.path.join(tmpdir, 'audio.%(ext)s')
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': outpath,
            'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '128'}],
            'quiet': True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_url])
        except Exception as e:
            print(f"yt-dlp audio download failed: {e}")
            return None

        audio_files = glob.glob(os.path.join(tmpdir, 'audio.*'))
        if not audio_files:
            return None
        audio_path = audio_files[0]
        try:
            return transcribe_audio(audio_path)
        except Exception as e:
            print(f"AssemblyAI transcription failed: {e}")
            return None


def get_youtube_transcript(video_url):
    """
    Get transcript from YouTube video URL using hybrid approach:
    1. Try official YouTube Data API (works in production)
    2. Fall back to transcript scraping API (works locally)
    3. Support translation from available languages to English
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

        # Try yt-dlp early (often works when transcript_api is rate-limited on Render/cloud)
        transcript_text = get_transcript_via_ytdlp(video_url)
        if transcript_text:
            return {
                'video_id': video_id,
                'transcript': transcript_text,
                'success': True,
                'method': 'ytdlp'
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
        transcripts_disabled = False  # When True, skip more transcript_api retries and try yt-dlp/AssemblyAI

        # Try multiple times with delays
        for retry in range(max_retries):
            for languages in languages_to_try:
                try:
                    # Try with explicit options first, then fallback to simple call
                    try:
                        transcript_list = YouTubeTranscriptApi.get_transcript(
                            video_id,
                            languages=languages,
                            proxies=None,
                            cookies=None
                        )
                        transcript_data = transcript_list
                        break
                    except (TranscriptsDisabled, VideoUnavailable):
                        raise  # Let outer handler deal with these
                    except Exception:
                        # Fallback to simple method (e.g. connection/format issues)
                        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
                        transcript_data = transcript_list
                        break
                except TranscriptsDisabled:
                    # Often raised from cloud IPs (e.g. Render) even when captions exist — try yt-dlp/AssemblyAI
                    transcripts_disabled = True
                    break
                except NoTranscriptFound as e:
                    last_error = e
                    continue
                except VideoUnavailable:
                    return {
                        'success': False,
                        'error': "⚠️ This video is unavailable.\n\n"
                                 "It may be private, deleted, region-restricted, or age-restricted."
                    }
                except Exception as e:
                    last_error = e
                    continue

            if transcript_data:
                break
            if transcripts_disabled:
                break  # Skip retries and try yt-dlp / AssemblyAI

            # Wait before retrying (exponential backoff)
            if retry < max_retries - 1:
                time.sleep(2 ** retry)

        available_captions_note = None
        if not transcript_data:
            # Try to list available transcripts and translate to English if needed
            try:
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                available = []
                translatable_transcript = None

                for transcript in transcript_list:
                    available.append(f"• {transcript.language} ({'auto' if transcript.is_generated else 'manual'})")

                    # Find a translatable transcript we can convert to English
                    if translatable_transcript is None and transcript.is_translatable:
                        translatable_transcript = transcript

                # If we found a translatable transcript, translate it to English
                if translatable_transcript:
                    print(f"Translating {translatable_transcript.language} transcript to English...")
                    try:
                        english_transcript = translatable_transcript.translate('en')
                        transcript_data = english_transcript.fetch()
                        print(f"Successfully translated to English!")
                    except Exception as translate_error:
                        print(f"Translation failed: {translate_error}")
                        # Continue to error handling below

                if available:
                    available_captions_note = "\n\nAvailable captions:\n" + "\n".join(available[:5])
            except Exception as list_error:
                print(f"Error listing transcripts: {list_error}")
                pass

            # Alternative services: yt-dlp (captions) then AssemblyAI (download audio + transcribe)
            if not transcript_data:
                transcript_text_alt = get_transcript_via_ytdlp(video_url)
                if transcript_text_alt:
                    return {
                        'video_id': video_id,
                        'transcript': transcript_text_alt,
                        'success': True,
                        'method': 'ytdlp'
                    }
                transcript_text_alt = get_transcript_via_assemblyai(video_url)
                if transcript_text_alt:
                    return {
                        'video_id': video_id,
                        'transcript': transcript_text_alt,
                        'success': True,
                        'method': 'assemblyai'
                    }

            if not transcript_data:
                err = "⚠️ Unable to access captions for this video.\n\n"
                err += "This could be because:\n"
                err += "• YouTube is blocking automated access (common on cloud servers)\n"
                err += "• The video has no captions\n"
                err += "• The video is private or region-restricted\n\n"
                err += "Try uploading the video file instead, or try again later."
                if available_captions_note:
                    err += available_captions_note
                return {'success': False, 'error': err}

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
