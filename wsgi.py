"""
WSGI configuration for production deployment
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import the Flask app
from app import app as application
