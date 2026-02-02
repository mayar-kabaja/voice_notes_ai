"""add_user_id_to_content_tables

Revision ID: ee36ccf99364
Revises:
Create Date: 2026-02-01 19:57:48.213812

This migration adds:
1. user_id foreign key to meetings, books, and videos tables
2. Creates a default system user for existing records (if not exists)
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime
from werkzeug.security import generate_password_hash


# revision identifiers, used by Alembic.
revision = 'ee36ccf99364'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Upgrade database schema"""

    # Create a default system user for existing records (if not exists)
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT COUNT(*) FROM users WHERE email = 'system@noteflow.local'"))
    count = result.scalar()

    if count == 0:
        users_table = sa.table(
            'users',
            sa.column('email', sa.String),
            sa.column('username', sa.String),
            sa.column('password_hash', sa.String),
            sa.column('created_at', sa.DateTime),
            sa.column('is_active', sa.Boolean)
        )

        op.bulk_insert(
            users_table,
            [
                {
                    'email': 'system@noteflow.local',
                    'username': 'system',
                    'password_hash': generate_password_hash('change_this_password_immediately'),
                    'created_at': datetime.utcnow(),
                    'is_active': True
                }
            ]
        )

    # Add user_id column to meetings table (directly as NOT NULL with server_default)
    # We use server_default to set existing rows, then remove it
    with op.batch_alter_table('meetings') as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=False, server_default='1'))
        batch_op.create_foreign_key(
            'fk_meetings_user_id',
            'users',
            ['user_id'],
            ['id']
        )
        batch_op.create_index('ix_meetings_user_id', ['user_id'], unique=False)

    # Remove server_default after initial setup
    with op.batch_alter_table('meetings') as batch_op:
        batch_op.alter_column('user_id', server_default=None)

    # Add user_id column to books table
    with op.batch_alter_table('books') as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=False, server_default='1'))
        batch_op.create_foreign_key(
            'fk_books_user_id',
            'users',
            ['user_id'],
            ['id']
        )
        batch_op.create_index('ix_books_user_id', ['user_id'], unique=False)

    # Remove server_default after initial setup
    with op.batch_alter_table('books') as batch_op:
        batch_op.alter_column('user_id', server_default=None)

    # Add user_id column to videos table
    with op.batch_alter_table('videos') as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=False, server_default='1'))
        batch_op.create_foreign_key(
            'fk_videos_user_id',
            'users',
            ['user_id'],
            ['id']
        )
        batch_op.create_index('ix_videos_user_id', ['user_id'], unique=False)

    # Remove server_default after initial setup
    with op.batch_alter_table('videos') as batch_op:
        batch_op.alter_column('user_id', server_default=None)


def downgrade():
    """Downgrade database schema"""

    # Remove indexes, foreign keys, and columns from videos
    with op.batch_alter_table('videos') as batch_op:
        batch_op.drop_index('ix_videos_user_id')
        batch_op.drop_constraint('fk_videos_user_id', type_='foreignkey')
        batch_op.drop_column('user_id')

    # Remove indexes, foreign keys, and columns from books
    with op.batch_alter_table('books') as batch_op:
        batch_op.drop_index('ix_books_user_id')
        batch_op.drop_constraint('fk_books_user_id', type_='foreignkey')
        batch_op.drop_column('user_id')

    # Remove indexes, foreign keys, and columns from meetings
    with op.batch_alter_table('meetings') as batch_op:
        batch_op.drop_index('ix_meetings_user_id')
        batch_op.drop_constraint('fk_meetings_user_id', type_='foreignkey')
        batch_op.drop_column('user_id')
