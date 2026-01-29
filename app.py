"""
Main Flask application for NoteFlow
"""
from flask import Flask, render_template, request, redirect, url_for
from config import Config

app = Flask(__name__)
app.config.from_object(Config)


@app.route('/')
def index():
    """Homepage with upload form"""
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload():
    """Handle audio file upload"""
    # TODO: Implement upload logic
    pass


@app.route('/result/<int:meeting_id>')
def result(meeting_id):
    """Display transcript and notes"""
    # TODO: Implement result display
    return render_template('result.html')


@app.route('/history')
def history():
    """Display past meeting notes"""
    # TODO: Implement history display
    return render_template('history.html')


if __name__ == '__main__':
    app.run(debug=True, port=5001)
