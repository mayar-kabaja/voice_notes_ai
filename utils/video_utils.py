"""
Video processing utilities - Extract audio from video files
"""
import os
import logging

logger = logging.getLogger(__name__)


def extract_audio_from_video(video_path, output_audio_path=None):
    """
    Extract audio from video file and save as MP3

    Args:
        video_path: Path to the video file
        output_audio_path: Optional path for output audio file.
                          If None, creates one based on video filename

    Returns:
        Path to extracted audio file

    Raises:
        Exception if extraction fails
    """
    try:
        # Import moviepy - handle both old and new versions
        try:
            from moviepy.editor import VideoFileClip
        except ImportError:
            # Try alternative import for moviepy 2.x
            from moviepy import VideoFileClip

        # Generate output path if not provided
        if output_audio_path is None:
            base_name = os.path.splitext(video_path)[0]
            output_audio_path = f"{base_name}_audio.mp3"

        # Load video and extract audio
        video = VideoFileClip(video_path)

        # Check if video has audio
        if video.audio is None:
            video.close()
            raise ValueError("Video file has no audio track")

        # Extract and save audio
        video.audio.write_audiofile(
            output_audio_path,
            codec='mp3',
            bitrate='128k',
            fps=44100,
            nbytes=2,
            buffersize=2000,
            logger=None  # Suppress moviepy's verbose output
        )

        # Close video file
        video.close()

        # Verify the audio file was created
        if not os.path.exists(output_audio_path):
            raise Exception("Audio extraction failed - output file not created")

        return output_audio_path

    except ImportError as ie:
        raise Exception(
            f"moviepy is not installed. Install it with: pip install moviepy. Error: {str(ie)}"
        )
    except Exception as e:
        logger.error(f"Error extracting audio from video: {str(e)}")
        raise Exception(f"Failed to extract audio from video: {str(e)}")


def get_video_info(video_path):
    """
    Get information about a video file

    Args:
        video_path: Path to the video file

    Returns:
        Dictionary with video information (duration, fps, size, etc.)
    """
    try:
        from moviepy.editor import VideoFileClip

        video = VideoFileClip(video_path)

        info = {
            'duration': video.duration,  # Duration in seconds
            'fps': video.fps,
            'size': video.size,  # (width, height)
            'has_audio': video.audio is not None,
            'filename': os.path.basename(video_path),
            'file_size': os.path.getsize(video_path)
        }

        video.close()

        return info

    except ImportError:
        raise Exception("moviepy is not installed")
    except Exception as e:
        logger.error(f"Error getting video info: {str(e)}")
        return None


def cleanup_file(file_path):
    """
    Safely delete a file

    Args:
        file_path: Path to file to delete

    Returns:
        True if deleted, False otherwise
    """
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception as e:
        logger.error(f"Error deleting file {file_path}: {str(e)}")
        return False
