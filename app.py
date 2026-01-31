"""
Main Flask application for NoteFlow AI
"""
import os
from flask import Flask, render_template, request, redirect, url_for, jsonify
from werkzeug.utils import secure_filename
from config import Config
from models.meeting import db, Meeting, Book, Video
from services.transcription import transcribe_audio
from services.summarization import generate_summary, translate_text, summarize_book
from services.book_extraction import extract_text_from_book, get_book_title_from_text
from services.video_extraction import get_youtube_transcript, get_video_title_from_url

app = Flask(__name__)
app.config.from_object(Config)

# Initialize database
db.init_app(app)

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


def allowed_file(filename):
    """Check if file extension is allowed for audio"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


def allowed_book_file(filename):
    """Check if file extension is allowed for books"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_BOOK_EXTENSIONS']


def allowed_video_file(filename):
    """Check if file extension is allowed for videos"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_VIDEO_EXTENSIONS']


@app.route('/')
def index():
    """Homepage with upload form"""
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload():
    """Handle audio file upload and processing"""
    try:
        # Check if file is present
        if 'audio' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400

        file = request.files['audio']

        # Check if file is selected
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400

        # Check if file type is allowed
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'message': 'Invalid file type'}), 400

        # Save the file
        filename = secure_filename(file.filename)
        # Add timestamp to avoid filename conflicts
        import time
        timestamp = str(int(time.time()))
        filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Step 1: Transcribe audio
        print(f"Transcribing audio: {filename}", flush=True)
        transcript = transcribe_audio(filepath)
        print(f"=== TRANSCRIPT ===", flush=True)
        print(transcript, flush=True)
        print(f"=== END TRANSCRIPT (length: {len(transcript)} chars) ===", flush=True)

        # Step 2: Generate summary with AI
        print(f"Generating summary...", flush=True)
        summary = generate_summary(transcript)
        print(f"=== SUMMARY ===", flush=True)
        print(summary, flush=True)
        print(f"=== END SUMMARY ===", flush=True)

        # Step 3: Save to database
        meeting = Meeting(
            title=file.filename,  # Original filename as title
            audio_filename=filename,
            transcript=transcript,
            summary=summary
        )
        db.session.add(meeting)
        db.session.commit()

        print(f"Meeting saved with ID: {meeting.id}")

        return jsonify({
            'success': True,
            'meeting_id': meeting.id,
            'message': 'Audio processed successfully'
        })

    except Exception as e:
        import traceback
        import sys
        error_msg = f"Upload error: {e}\n{traceback.format_exc()}"
        print(error_msg, file=sys.stderr, flush=True)
        print(error_msg, flush=True)
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/history')
def history():
    """Display past meeting notes"""
    meetings = Meeting.query.order_by(Meeting.created_at.desc()).all()
    return render_template('history.html', meetings=meetings)


@app.route('/api/meeting/<int:meeting_id>')
def get_meeting(meeting_id):
    """API endpoint to get meeting data"""
    meeting = Meeting.query.get_or_404(meeting_id)
    return jsonify(meeting.to_dict())


@app.route('/api/meetings')
def get_meetings():
    """API endpoint to get all meetings"""
    meetings = Meeting.query.order_by(Meeting.created_at.desc()).all()
    return jsonify([meeting.to_dict() for meeting in meetings])


@app.route('/api/translate', methods=['POST'])
def translate():
    """API endpoint to translate text"""
    try:
        data = request.get_json()
        text = data.get('text')
        target_language = data.get('language')

        if not text or not target_language:
            return jsonify({'success': False, 'message': 'Missing text or language'}), 400

        translated_text = translate_text(text, target_language)

        return jsonify({
            'success': True,
            'translated_text': translated_text
        })
    except Exception as e:
        print(f"Translation error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# ============== BOOKS SECTION ==============

@app.route('/books')
def books():
    """Books summarization page"""
    return render_template('books.html')


@app.route('/books/upload', methods=['POST'])
def upload_book():
    """Handle book file upload and processing"""
    try:
        # Check if file is present
        if 'book' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400

        file = request.files['book']

        # Check if file is selected
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400

        # Check if file type is allowed
        if not allowed_book_file(file.filename):
            return jsonify({'success': False, 'message': 'Invalid file type. Allowed: PDF, EPUB, TXT, DOCX'}), 400

        # Save the file
        filename = secure_filename(file.filename)
        import time
        timestamp = str(int(time.time()))
        filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Get file extension
        file_type = file.filename.rsplit('.', 1)[1].lower()

        # Step 1: Extract text from book
        print(f"Extracting text from {file_type} file: {filename}", flush=True)
        full_text = extract_text_from_book(filepath, file_type)
        print(f"=== EXTRACTED TEXT (length: {len(full_text)} chars) ===", flush=True)

        # Step 2: Get book title
        book_title = get_book_title_from_text(full_text, file.filename)
        print(f"Book title: {book_title}", flush=True)

        # Step 3: Generate AI summary
        print(f"Generating book summary...", flush=True)
        summary = summarize_book(full_text)
        print(f"=== SUMMARY ===", flush=True)
        print(summary, flush=True)
        print(f"=== END SUMMARY ===", flush=True)

        # Step 4: Save to database
        book = Book(
            title=book_title,
            book_filename=filename,
            file_type=file_type,
            full_text=full_text[:50000],  # Store first 50k chars to save space
            summary=summary
        )
        db.session.add(book)
        db.session.commit()

        print(f"Book saved with ID: {book.id}")

        return jsonify({
            'success': True,
            'book_id': book.id,
            'message': 'Book processed successfully'
        })

    except Exception as e:
        import traceback
        import sys
        error_msg = f"Book upload error: {e}\n{traceback.format_exc()}"
        print(error_msg, file=sys.stderr, flush=True)
        print(error_msg, flush=True)
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/books/history')
def books_history():
    """Display past book summaries"""
    books = Book.query.order_by(Book.created_at.desc()).all()
    return render_template('books_history.html', books=books)


@app.route('/api/book/<int:book_id>')
def get_book(book_id):
    """API endpoint to get book data"""
    book = Book.query.get_or_404(book_id)
    return jsonify(book.to_dict())


@app.route('/api/books')
def get_books():
    """API endpoint to get all books"""
    books = Book.query.order_by(Book.created_at.desc()).all()
    return jsonify([book.to_dict() for book in books])


# ============== VIDEOS SECTION ==============

@app.route('/videos/process', methods=['POST'])
def process_video():
    """Handle YouTube video URL processing OR video file upload"""
    try:
        # Check if it's a file upload or URL
        if 'video' in request.files:
            # Video file upload
            file = request.files['video']

            if file.filename == '':
                return jsonify({'success': False, 'message': 'No file selected'}), 400

            if not allowed_video_file(file.filename):
                return jsonify({'success': False, 'message': 'Invalid file type. Allowed: MP4, MOV, AVI, MKV, WEBM, FLV, M4V'}), 400

            # Save the file
            filename = secure_filename(file.filename)
            import time
            timestamp = str(int(time.time()))
            filename = f"{timestamp}_{filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            # Step 1: Transcribe video using AssemblyAI (it supports video files)
            print(f"Transcribing video file: {filename}", flush=True)
            transcript = transcribe_audio(filepath)  # AssemblyAI handles video files too
            print(f"=== TRANSCRIPT ===", flush=True)
            print(transcript, flush=True)
            print(f"=== END TRANSCRIPT (length: {len(transcript)} chars) ===", flush=True)

            # Step 2: Generate AI summary
            print(f"Generating video summary...", flush=True)
            summary = summarize_book(transcript)
            print(f"=== SUMMARY ===", flush=True)
            print(summary, flush=True)
            print(f"=== END SUMMARY ===", flush=True)

            # Step 3: Save to database
            video = Video(
                title=file.filename,  # Original filename as title
                video_url=filename,  # Store filename in video_url field
                video_id='file_upload',
                transcript=transcript[:50000],
                summary=summary
            )
            db.session.add(video)
            db.session.commit()

            print(f"Video saved with ID: {video.id}")

            return jsonify({
                'success': True,
                'video_id': video.id,
                'message': 'Video processed successfully'
            })

        else:
            # YouTube URL processing
            data = request.get_json()
            video_url = data.get('video_url', '').strip()

            if not video_url:
                return jsonify({'success': False, 'message': 'No video URL provided'}), 400

            # Step 1: Get transcript from YouTube
            print(f"Fetching transcript for URL: {video_url}", flush=True)
            result = get_youtube_transcript(video_url)

            if not result['success']:
                return jsonify({'success': False, 'message': f"Failed to get transcript: {result.get('error', 'Unknown error')}"}), 400

            transcript = result['transcript']
            video_id = result['video_id']

            print(f"=== TRANSCRIPT (length: {len(transcript)} chars) ===", flush=True)

            # Step 2: Get video title
            video_title = get_video_title_from_url(video_url)
            print(f"Video title: {video_title}", flush=True)

            # Step 3: Generate AI summary
            print(f"Generating video summary...", flush=True)
            summary = summarize_book(transcript)  # Reuse book summarization function
            print(f"=== SUMMARY ===", flush=True)
            print(summary, flush=True)
            print(f"=== END SUMMARY ===", flush=True)

            # Step 4: Save to database
            video = Video(
                title=video_title,
                video_url=video_url,
                video_id=video_id,
                transcript=transcript[:50000],  # Store first 50k chars
                summary=summary
            )
            db.session.add(video)
            db.session.commit()

            print(f"Video saved with ID: {video.id}")

            return jsonify({
                'success': True,
                'video_id': video.id,
                'message': 'Video processed successfully'
            })

    except Exception as e:
        import traceback
        import sys
        error_msg = f"Video processing error: {e}\n{traceback.format_exc()}"
        print(error_msg, file=sys.stderr, flush=True)
        print(error_msg, flush=True)
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/video/<int:video_id>')
def get_video(video_id):
    """API endpoint to get video data"""
    video = Video.query.get_or_404(video_id)
    return jsonify(video.to_dict())


@app.route('/api/videos')
def get_videos():
    """API endpoint to get all videos"""
    videos = Video.query.order_by(Video.created_at.desc()).all()
    return jsonify([video.to_dict() for video in videos])


# ============== CONVERSATIONAL AI ==============

@app.route('/api/chat', methods=['POST'])
def chat_conversation():
    """Handle conversational AI messages"""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        context_type = data.get('context_type')  # 'audio', 'video', 'book'
        context_id = data.get('context_id')  # meeting_id, video_id, book_id

        if not user_message:
            return jsonify({'success': False, 'message': 'No message provided'}), 400

        # Get context if provided
        context_summary = None
        context_transcript = None

        if context_id and context_type:
            if context_type == 'audio':
                meeting = Meeting.query.get(context_id)
                if meeting:
                    context_summary = meeting.summary
                    context_transcript = meeting.transcript
            elif context_type == 'video':
                video = Video.query.get(context_id)
                if video:
                    context_summary = video.summary
                    context_transcript = video.transcript
            elif context_type == 'book':
                book = Book.query.get(context_id)
                if book:
                    context_summary = book.summary
                    context_transcript = book.full_text

        # Build conversation prompt
        from services.summarization import chat_with_context

        ai_response = chat_with_context(
            user_message=user_message,
            summary=context_summary,
            transcript=context_transcript
        )

        return jsonify({
            'success': True,
            'response': ai_response
        })

    except Exception as e:
        import traceback
        print(f"Chat error: {e}\n{traceback.format_exc()}", flush=True)
        return jsonify({'success': False, 'message': str(e)}), 500


# Initialize database tables
with app.app_context():
    db.create_all()
    print("Database tables created!")


if __name__ == '__main__':
    # For local development only
    app.run(debug=True, port=5001)
