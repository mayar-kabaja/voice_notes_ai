"""
Main Flask application for NoteFlow AI
"""
import os
import sys

# Allow app to find packages in vendor/ (e.g. yt-dlp when installed with pip install --target vendor)
_here = os.path.dirname(os.path.abspath(__file__))
_vendor = os.path.join(_here, 'vendor')
if os.path.isdir(_vendor):
    sys.path.insert(0, _vendor)

from datetime import datetime
from flask import Flask, render_template, request, jsonify
from flask_migrate import Migrate
from flask_login import LoginManager, login_required, current_user
from werkzeug.utils import secure_filename
from config import Config
from models.meeting import db, Meeting, Book, Video, Conversation, ChatMessage
from models.user import User
from services.transcription import transcribe_audio
from services.summarization import generate_summary, translate_text, summarize_book
from services.book_extraction import extract_text_from_book, get_book_title_from_text
from services.video_extraction import get_youtube_transcript, get_video_title_from_url
from utils.video_utils import extract_audio_from_video, cleanup_file

app = Flask(__name__)
app.config.from_object(Config)

# Initialize database
db.init_app(app)

# Initialize Flask-Migrate for database migrations
migrate = Migrate(app, db)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'


@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login"""
    return User.query.get(int(user_id))

# Register blueprints
from routes.auth import auth, init_oauth
app.register_blueprint(auth)

# Initialize OAuth
init_oauth(app)

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
@login_required
def upload():
    """Handle audio file upload and processing"""
    try:
        # ========== TEST MODE: Simulate Rate Limit Error ==========
        # Uncomment the line below to test rate limit handling
        # raise Exception("⏳ AssemblyAI rate limit reached. Please wait a few minutes and try again, or upgrade your plan at https://www.assemblyai.com/pricing for higher limits.")

        # Uncomment to test quota error
        # raise Exception("💳 AssemblyAI quota exceeded. Please check your account balance at https://www.assemblyai.com/app/account")

        # Uncomment to test auth error
        # raise Exception("🔑 Authentication error. Please check your AssemblyAI API key configuration.")
        # ========== END TEST MODE ==========

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

        transcript = transcribe_audio(filepath)
        summary = generate_summary(transcript)

        meeting = Meeting(
            title=file.filename,
            audio_filename=filename,
            transcript=transcript,
            summary=summary,
            user_id=current_user.id
        )
        db.session.add(meeting)
        db.session.commit()

        return jsonify({
            'success': True,
            'meeting_id': meeting.id,
            'message': 'Audio processed successfully'
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/meeting/<int:meeting_id>')
@login_required
def get_meeting(meeting_id):
    """API endpoint to get meeting data"""
    meeting = Meeting.query.filter_by(id=meeting_id, user_id=current_user.id).first_or_404()
    return jsonify(meeting.to_dict())


@app.route('/api/meetings')
@login_required
def get_meetings():
    """API endpoint to get all meetings for current user"""
    meetings = Meeting.query.filter_by(user_id=current_user.id).order_by(Meeting.created_at.desc()).all()
    return jsonify([meeting.to_dict() for meeting in meetings])


@app.route('/api/translate', methods=['POST'])
def translate():
    """API endpoint to translate text"""
    try:
        # ========== TEST MODE: Simulate Errors ==========
        # Uncomment to test rate limit
        # raise Exception("⏳ Rate limit reached. Please try again in 5 minutes. You can upgrade your plan at https://console.groq.com/settings/billing for higher limits.")

        # Uncomment to test quota error
        # raise Exception("💳 API quota exceeded. Please check your billing at https://console.groq.com/settings/billing")
        # ========== END TEST MODE ==========

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
        return jsonify({'success': False, 'message': str(e)}), 500


# ============== BOOKS SECTION ==============

@app.route('/books')
@login_required
def books():
    """Books summarization page"""
    return render_template('books.html')


@app.route('/books/upload', methods=['POST'])
@login_required
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

        full_text = extract_text_from_book(filepath, file_type)
        book_title = get_book_title_from_text(full_text, file.filename)
        summary = summarize_book(full_text)

        book = Book(
            title=book_title,
            book_filename=filename,
            file_type=file_type,
            full_text=full_text[:50000],  # Store first 50k chars to save space
            summary=summary,
            user_id=current_user.id
        )
        db.session.add(book)
        db.session.commit()

        return jsonify({
            'success': True,
            'book_id': book.id,
            'message': 'Book processed successfully'
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/book/<int:book_id>')
@login_required
def get_book(book_id):
    """API endpoint to get book data for current user"""
    book = Book.query.filter_by(id=book_id, user_id=current_user.id).first_or_404()
    return jsonify(book.to_dict())


@app.route('/api/books')
@login_required
def get_books():
    """API endpoint to get all books for current user"""
    books_list = Book.query.filter_by(user_id=current_user.id).order_by(Book.created_at.desc()).all()
    return jsonify([book.to_dict() for book in books_list])


# ============== VIDEOS SECTION ==============

@app.route('/videos/process', methods=['POST'])
@login_required
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

            # Save the video file
            filename = secure_filename(file.filename)
            import time
            timestamp = str(int(time.time()))
            filename = f"{timestamp}_{filename}"
            video_filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(video_filepath)

            audio_filepath = None
            try:
                audio_filepath = extract_audio_from_video(video_filepath)
                transcript = transcribe_audio(audio_filepath)
                summary = summarize_book(transcript)

                video = Video(
                    title=file.filename,  # Original filename as title
                    video_url=filename,  # Store filename in video_url field
                    video_id='file_upload',
                    transcript=transcript[:50000],
                    summary=summary,
                    user_id=current_user.id
                )
                db.session.add(video)
                db.session.commit()

                return jsonify({
                    'success': True,
                    'video_id': video.id,
                    'message': 'Video processed successfully'
                })

            finally:
                # Cleanup: Delete extracted audio file to save space
                if audio_filepath:
                    cleanup_file(audio_filepath)
                # Optionally delete original video file to save space
                # Uncomment the line below if you don't need to keep video files
                # cleanup_file(video_filepath)

        else:
            # YouTube URL processing
            data = request.get_json()
            video_url = data.get('video_url', '').strip()

            if not video_url:
                return jsonify({'success': False, 'message': 'No video URL provided'}), 400

            result = get_youtube_transcript(video_url)
            if not result['success']:
                err = result.get('error', 'Unknown error')
                # Use error as-is when it's already user-friendly (e.g. starts with ⚠️)
                message = err if err.strip().startswith('⚠️') else f"Failed to get transcript: {err}"
                return jsonify({'success': False, 'message': message}), 400

            transcript = result['transcript']
            video_id = result['video_id']
            video_title = get_video_title_from_url(video_url)
            summary = summarize_book(transcript)

            video = Video(
                title=video_title,
                video_url=video_url,
                video_id=video_id,
                transcript=transcript[:50000],  # Store first 50k chars
                summary=summary,
                user_id=current_user.id
            )
            db.session.add(video)
            db.session.commit()

            return jsonify({
                'success': True,
                'video_id': video.id,
                'message': 'Video processed successfully'
            })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/video/<int:video_id>')
@login_required
def get_video(video_id):
    """API endpoint to get video data for current user"""
    video = Video.query.filter_by(id=video_id, user_id=current_user.id).first_or_404()
    return jsonify(video.to_dict())


@app.route('/api/videos')
@login_required
def get_videos():
    """API endpoint to get all videos for current user"""
    videos = Video.query.filter_by(user_id=current_user.id).order_by(Video.created_at.desc()).all()
    return jsonify([video.to_dict() for video in videos])


# ============== CONVERSATIONAL AI ==============

@app.route('/api/chat', methods=['POST'])
def chat_conversation():
    """Handle conversational AI messages"""
    try:
        # ========== TEST MODE: Simulate Errors ==========
        # Uncomment to test rate limit
        # raise Exception("⏳ Rate limit reached. Please try again in 5 minutes.")
        # ========== END TEST MODE ==========

        data = request.get_json()
        user_message = data.get('message', '').strip()
        context_type = data.get('context_type')  # 'audio', 'video', 'book'
        context_id = data.get('context_id')  # meeting_id, video_id, book_id
        conversation_id = data.get('conversation_id')  # Optional: existing conversation ID

        if not user_message:
            return jsonify({'success': False, 'message': 'No message provided'}), 400

        # Get context if provided
        context_summary = None
        context_transcript = None

        if context_id and context_type and current_user.is_authenticated:
            if context_type == 'audio':
                meeting = Meeting.query.filter_by(id=context_id, user_id=current_user.id).first()
                if meeting:
                    context_summary = meeting.summary
                    context_transcript = meeting.transcript
            elif context_type == 'video':
                video = Video.query.filter_by(id=context_id, user_id=current_user.id).first()
                if video:
                    context_summary = video.summary
                    context_transcript = video.transcript
            elif context_type == 'book':
                book = Book.query.filter_by(id=context_id, user_id=current_user.id).first()
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

        # Save conversation if user is authenticated
        if current_user.is_authenticated:
            conversation = None

            # Get or create conversation
            if conversation_id:
                conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first()

            if not conversation:
                # Create new conversation
                # Generate title from first message (first 50 chars)
                title = user_message[:50] + ('...' if len(user_message) > 50 else '')
                conversation = Conversation(
                    user_id=current_user.id,
                    title=title,
                    context_type=context_type,
                    context_id=context_id
                )
                db.session.add(conversation)
                db.session.flush()  # Get the conversation ID

            # Save user message
            user_msg = ChatMessage(
                conversation_id=conversation.id,
                role='user',
                content=user_message
            )
            db.session.add(user_msg)

            # Save AI response
            ai_msg = ChatMessage(
                conversation_id=conversation.id,
                role='assistant',
                content=ai_response
            )
            db.session.add(ai_msg)

            # Update conversation timestamp
            conversation.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                'success': True,
                'response': ai_response,
                'conversation_id': conversation.id
            })

        return jsonify({
            'success': True,
            'response': ai_response
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


# ============== CONVERSATION HISTORY ==============

@app.route('/api/conversations')
@login_required
def get_conversations():
    """API endpoint to get all conversations for current user"""
    conversations = Conversation.query.filter_by(user_id=current_user.id).order_by(Conversation.updated_at.desc()).all()
    return jsonify([conversation.to_dict(include_messages=False) for conversation in conversations])


@app.route('/api/conversation/<int:conversation_id>')
@login_required
def get_conversation(conversation_id):
    """API endpoint to get specific conversation with messages"""
    conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first_or_404()
    return jsonify(conversation.to_dict(include_messages=True))


@app.route('/api/conversation/<int:conversation_id>', methods=['DELETE'])
@login_required
def delete_conversation(conversation_id):
    """API endpoint to delete a conversation"""
    try:
        conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first_or_404()
        db.session.delete(conversation)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Conversation deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/conversation/<int:conversation_id>', methods=['PUT'])
@login_required
def update_conversation(conversation_id):
    """API endpoint to update conversation title"""
    try:
        conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first_or_404()
        data = request.get_json()
        new_title = data.get('title', '').strip()

        if not new_title:
            return jsonify({'success': False, 'message': 'Title cannot be empty'}), 400

        conversation.title = new_title
        conversation.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'success': True, 'message': 'Conversation updated successfully', 'conversation': conversation.to_dict(include_messages=False)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


with app.app_context():
    db.create_all()


if __name__ == '__main__':
    # For local development only
    app.run(debug=True, port=5001)
