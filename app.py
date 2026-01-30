"""
Main Flask application for VoiceNotes AI
"""
import os
from flask import Flask, render_template, request, redirect, url_for, jsonify
from werkzeug.utils import secure_filename
from config import Config
from models.meeting import db, Meeting
from services.transcription import transcribe_audio
from services.summarization import generate_summary, translate_text

app = Flask(__name__)
app.config.from_object(Config)

# Initialize database
db.init_app(app)

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


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


# Initialize database tables
with app.app_context():
    db.create_all()
    print("Database tables created!")


if __name__ == '__main__':
    # For local development only
    app.run(debug=True, port=5000)
