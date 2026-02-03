# NoteFlow AI

**Transform voice recordings, books, and videos into structured notes with AI-powered summarization.**

A modern web application that automatically converts audio recordings, books, and videos into organized notes and summaries, complete with AI-generated insights and multi-language translation support.

---

## Features

### Voice Notes
- **Audio Recording**: Record audio directly from your browser with real-time timer
- **File Upload**: Drag-and-drop or browse to upload audio files (MP3, WAV, M4A, OGG, FLAC, WebM, OPUS)
- **AI Transcription**: Automatic speech-to-text conversion using AssemblyAI
- **Smart Summarization**: AI-powered meeting notes generation using OpenAI GPT

### Book Summarization
- **Multiple Format Support**: Upload PDF, EPUB, TXT, or DOCX files
- **AI-Powered Summaries**: Get comprehensive summaries with key points and takeaways
- **Smart Text Extraction**: Automatically extract text from various book formats

### Video Summarization ⚡ OPTIMIZED!
- **YouTube Integration**: Paste any YouTube URL for instant transcript extraction
- **Video File Upload**: Support for MP4, MOV, AVI, MKV, WebM, FLV, M4V
- **Smart Audio Extraction**: Automatically extracts audio from videos for 3-5x faster processing
- **Optimized Performance**: Videos process in minutes instead of hours
- **AI Summaries**: Get comprehensive video summaries with key insights

### General Features
- **Multi-Language Translation**: Translate summaries to 12+ languages including Spanish, French, German, Arabic, Chinese, Japanese, and more
- **Export Options**: Download notes as TXT or Markdown, or copy to clipboard
- **Responsive Design**: Beautiful UI that works on desktop and mobile devices
- **Real-time Feedback**: Toast notifications and loading states for better UX
- **Modal Interface**: Quick access to results without page reloads

---

## Tech Stack

### Backend
- **Flask** - Python web framework
- **SQLAlchemy** - Database ORM
- **AssemblyAI** - Audio transcription API
- **Groq (Llama 3.3)** - AI summarization and translation
- **MoviePy** - Video processing and audio extraction
- **SQLite** - Database (PostgreSQL compatible)

### Frontend
- **HTML5/CSS3** - Modern, responsive UI
- **JavaScript (Vanilla)** - Interactive features
- **Web Audio API** - Browser-based audio recording
- **MediaRecorder API** - Audio capture

---

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- API Keys:
  - [AssemblyAI API Key](https://www.assemblyai.com/) - For audio transcription
  - [Groq API Key](https://console.groq.com/) - For AI summarization (required)
  - [OpenAI API Key](https://platform.openai.com/api-keys) - Optional alternative to Groq

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/noteflow-ai.git
cd noteflow-ai
```

### 2. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
OPENAI_API_KEY=your_openai_api_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
GROQ_API_KEY=your_groq_api_key_here
SECRET_KEY=your_secret_key_here
```

### 5. Initialize Database

```bash
python -c "from app import app, db; app.app_context().push(); db.create_all()"
```

### 6. Run the Application

```bash
python app.py
```

The application will be available at `http://localhost:5001`

---

## Configuration

Edit `config.py` to customize settings:

```python
# File upload settings
UPLOAD_FOLDER = 'static/uploads'
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB max file size (for video files)
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm', 'opus'}
ALLOWED_BOOK_EXTENSIONS = {'pdf', 'epub', 'txt', 'docx', 'doc'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v'}

# Database settings
SQLALCHEMY_DATABASE_URI = 'sqlite:///noteflow.db'
```

---

## Deploying on Render

The app is set up for [Render](https://render.com) via `render.yaml`:

1. **Connect** your repo to Render and create a Web Service from the repo (Render can use `render.yaml` automatically).
2. **Environment variables**: In the Render dashboard, set `ASSEMBLYAI_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, and `SECRET_KEY`. Optionally set `YOUTUBE_API_KEY` for YouTube Data API.
3. **Database**: Attach a PostgreSQL database in Render if you use one; Render will set `DATABASE_URL`.
4. **YouTube on Render**: `yt-dlp` is installed from `requirements.txt`. If YouTube blocks cloud IPs ("Sign in to confirm you're not a bot"), add optional cookies: export YouTube cookies (Netscape format, e.g. "Get cookies.txt LOCALLY" extension); in Render Environment set `YOUTUBE_COOKIES_TXT` to the full cookie file contents and `YOUTUBE_COOKIES_FILE` to `youtube_cookies.txt`. Use start command `./start.sh` so Gunicorn timeout is 300s.

---

## Usage

### Recording Audio
1. Navigate to the homepage
2. Click the "Record" button to start recording
3. Click "Stop" when finished
4. Preview your recording and click "Process Audio"

### Uploading Files
1. Drag and drop an audio file onto the upload zone
2. Or click to browse and select a file
3. Click "Process Audio" to begin transcription

### Viewing Results
- After processing, a modal popup will instantly display your transcript and AI-generated summary
- Use the translate dropdown (on the right side of "AI-Generated Summary") to convert summaries to different languages
- Translation happens automatically when you select a language
- Export your notes as TXT or Markdown files
- Copy to clipboard for easy sharing
- All actions happen in the modal without page reloads

### Summarizing Books
1. Navigate to `/books` or click the "Voice Notes" → "Books" link
2. Drag and drop a book file (PDF, EPUB, TXT, or DOCX)
3. Click "Summarize Book" to begin processing
4. View your comprehensive AI-generated summary in the modal
5. Translate, export, or copy the summary as needed

### Processing Videos
1. On the chat interface, click the YouTube button (🎬) or upload a video file
2. **YouTube**: Paste a YouTube URL and click "Send"
3. **Video File**: Upload MP4, MOV, AVI, MKV, WebM, FLV, or M4V files
4. The app extracts audio from videos for faster processing
5. View transcript and AI-generated summary in the chat

---

## API Endpoints

### Upload Audio
```http
POST /upload
Content-Type: multipart/form-data

Response:
{
  "success": true,
  "meeting_id": 1,
  "message": "Audio processed successfully"
}
```

### Get Meeting
```http
GET /api/meeting/<meeting_id>

Response:
{
  "id": 1,
  "title": "recording.mp3",
  "transcript": "Full transcript...",
  "summary": "AI-generated summary...",
  "created_at": "2026-01-30T10:00:00"
}
```

### Translate Text
```http
POST /api/translate
Content-Type: application/json

Body:
{
  "text": "Text to translate",
  "language": "Spanish"
}

Response:
{
  "success": true,
  "translated_text": "Texto traducido"
}
```

### Get All Meetings
```http
GET /api/meetings

Response:
[
  {
    "id": 1,
    "title": "recording.mp3",
    "transcript": "...",
    "summary": "...",
    "created_at": "..."
  }
]
```

### Upload Book
```http
POST /books/upload
Content-Type: multipart/form-data

Response:
{
  "success": true,
  "book_id": 1,
  "message": "Book processed successfully"
}
```

### Process Video
```http
POST /videos/process
Content-Type: multipart/form-data OR application/json

Body (for YouTube URL):
{
  "video_url": "https://youtube.com/watch?v=..."
}

Response:
{
  "success": true,
  "video_id": 1,
  "message": "Video processed successfully"
}
```

### Chat with AI
```http
POST /api/chat
Content-Type: application/json

Body:
{
  "message": "Your question here",
  "context_type": "audio|video|book",  // optional
  "context_id": 1  // optional
}

Response:
{
  "success": true,
  "response": "AI response here"
}
```

---

## Project Structure

```
noteflow-ai/
├── app.py                  # Main Flask application
├── config.py               # Configuration settings
├── wsgi.py                 # WSGI entry point
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── models/
│   ├── __init__.py
│   └── meeting.py         # Database models (Meeting, Book, Video)
├── services/
│   ├── __init__.py
│   ├── transcription.py   # AssemblyAI integration
│   ├── summarization.py   # AI summarization (Groq Llama 3.3)
│   ├── book_extraction.py # Book text extraction (PDF/EPUB/DOCX/TXT)
│   └── video_extraction.py # YouTube transcript extraction
├── templates/
│   ├── base.html          # Base template
│   ├── index.html         # Chat interface with voice/video/book upload
│   └── books.html         # Book upload page
├── static/
│   ├── css/
│   │   └── style.css      # Styles
│   ├── js/
│   │   ├── main.js        # Frontend logic (books page)
│   │   └── chat.js        # Chat interface logic
│   └── uploads/           # Uploaded files (audio/video/books)
└── utils/
    ├── __init__.py
    └── video_utils.py     # Video audio extraction
```

---

## Deployment

### Deploy to Render

The project includes a `render.yaml` configuration file for easy deployment to Render.

1. Push your code to GitHub
2. Connect your repository to Render
3. Add environment variables in Render dashboard
4. Deploy!

---

## Browser Compatibility

- **Chrome** 49+
- **Firefox** 25+
- **Safari** 14.1+
- **Edge** 79+

Audio recording requires HTTPS or localhost for security reasons.

---

## Troubleshooting

### Microphone Access Issues
- Ensure you're accessing the app via HTTPS or `http://localhost`
- Check browser permissions for microphone access
- Close other applications using the microphone

### API Errors
- Verify your API keys are correctly set in `.env`
- Check API usage limits on OpenAI/AssemblyAI dashboards
- Ensure you have sufficient credits

### File Upload Errors
- Maximum file size is 500MB (for video files)
- **Audio formats**: MP3, WAV, M4A, OGG, FLAC, WebM, OPUS
- **Video formats**: MP4, MOV, AVI, MKV, WebM, FLV, M4V
- **Book formats**: PDF, EPUB, TXT, DOCX, DOC
- Clear browser cache if issues persist

### Book Processing Issues
- Large books may take longer to process (30-60 seconds)
- If text extraction fails, try converting to PDF first
- Scanned PDFs (images) won't work - text must be selectable
- EPUB files should be standard format (not DRM-protected)

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

**Mayar**

Built with ❤️ using Flask, Groq, and AssemblyAI

---

## Acknowledgments

- [Groq](https://groq.com/) for fast AI inference with Llama 3.3
- [AssemblyAI](https://www.assemblyai.com/) for transcription services
- [Flask](https://flask.palletsprojects.com/) for the web framework
- [MoviePy](https://zulko.github.io/moviepy/) for video processing

---

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/yourusername/noteflow-ai/issues) on GitHub.
