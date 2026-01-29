"""
Database model for meeting notes
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Meeting(db.Model):
    """Meeting notes model"""

    __tablename__ = 'meetings'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=True)
    audio_filename = db.Column(db.String(255), nullable=False)
    transcript = db.Column(db.Text, nullable=False)
    summary = db.Column(db.Text, nullable=True)
    action_items = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Meeting {self.id}: {self.title or "Untitled"}>'

    def to_dict(self):
        """Convert meeting to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'audio_filename': self.audio_filename,
            'transcript': self.transcript,
            'summary': self.summary,
            'action_items': self.action_items,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
