"""
Helper utility functions for NoteFlow
"""
import os
import time
from werkzeug.utils import secure_filename
from config import Config


def allowed_file(filename):
    """
    Check if uploaded file has an allowed extension

    Args:
        filename (str): Name of the file

    Returns:
        bool: True if file extension is allowed
    """
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS


def save_uploaded_file(file):
    """
    Save uploaded file to the upload folder

    Args:
        file: File object from request

    Returns:
        str: Path to saved file
    """
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add timestamp to filename to avoid collisions
        timestamp = str(int(time.time()))
        name, ext = os.path.splitext(filename)
        unique_filename = f"{name}_{timestamp}{ext}"

        filepath = os.path.join(Config.UPLOAD_FOLDER, unique_filename)
        file.save(filepath)
        return filepath
    else:
        raise ValueError("Invalid file type")


def clean_old_files(directory, max_age_hours=24):
    """
    Remove files older than max_age_hours from directory

    Args:
        directory (str): Directory path to clean
        max_age_hours (int): Maximum age of files in hours
    """
    now = time.time()
    max_age_seconds = max_age_hours * 3600

    if not os.path.exists(directory):
        return

    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        if os.path.isfile(filepath):
            file_age = now - os.path.getmtime(filepath)
            if file_age > max_age_seconds:
                try:
                    os.remove(filepath)
                    print(f"Removed old file: {filename}")
                except Exception as e:
                    print(f"Error removing file {filename}: {e}")


def format_duration(seconds):
    """
    Format duration in seconds to readable format

    Args:
        seconds (int): Duration in seconds

    Returns:
        str: Formatted duration (e.g., "2m 30s")
    """
    minutes = int(seconds // 60)
    secs = int(seconds % 60)

    if minutes > 0:
        return f"{minutes}m {secs}s"
    else:
        return f"{secs}s"
