"""
Authentication routes for user signup, login, and logout
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
from models.meeting import db
from models.user import User
from email_validator import validate_email, EmailNotValidError
from authlib.integrations.flask_client import OAuth
from functools import wraps
import os

auth = Blueprint('auth', __name__)

# Initialize OAuth
oauth = OAuth()

def init_oauth(app):
    """Initialize OAuth with the Flask app"""
    oauth.init_app(app)

    # Configure Google OAuth
    if app.config.get('GOOGLE_CLIENT_ID') and app.config.get('GOOGLE_CLIENT_SECRET'):
        oauth.register(
            name='google',
            client_id=app.config['GOOGLE_CLIENT_ID'],
            client_secret=app.config['GOOGLE_CLIENT_SECRET'],
            server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
            client_kwargs={'scope': 'openid email profile'}
        )

    # Configure GitHub OAuth
    if app.config.get('GITHUB_CLIENT_ID') and app.config.get('GITHUB_CLIENT_SECRET'):
        oauth.register(
            name='github',
            client_id=app.config['GITHUB_CLIENT_ID'],
            client_secret=app.config['GITHUB_CLIENT_SECRET'],
            access_token_url='https://github.com/login/oauth/access_token',
            access_token_params=None,
            authorize_url='https://github.com/login/oauth/authorize',
            authorize_params=None,
            api_base_url='https://api.github.com/',
            client_kwargs={'scope': 'user:email'},
        )

    # Configure Microsoft OAuth
    if app.config.get('MICROSOFT_CLIENT_ID') and app.config.get('MICROSOFT_CLIENT_SECRET'):
        oauth.register(
            name='microsoft',
            client_id=app.config['MICROSOFT_CLIENT_ID'],
            client_secret=app.config['MICROSOFT_CLIENT_SECRET'],
            authorize_url='https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            authorize_params=None,
            access_token_url='https://login.microsoftonline.com/common/oauth2/v2.0/token',
            access_token_params=None,
            client_kwargs={'scope': 'openid email profile'},
        )

    # Configure Apple OAuth
    if app.config.get('APPLE_CLIENT_ID') and app.config.get('APPLE_CLIENT_SECRET'):
        oauth.register(
            name='apple',
            client_id=app.config['APPLE_CLIENT_ID'],
            client_secret=app.config['APPLE_CLIENT_SECRET'],
            authorize_url='https://appleid.apple.com/auth/authorize',
            authorize_params={'response_mode': 'form_post'},
            access_token_url='https://appleid.apple.com/auth/token',
            client_kwargs={'scope': 'email name'},
        )

    # Configure Facebook OAuth
    if app.config.get('FACEBOOK_CLIENT_ID') and app.config.get('FACEBOOK_CLIENT_SECRET'):
        oauth.register(
            name='facebook',
            client_id=app.config['FACEBOOK_CLIENT_ID'],
            client_secret=app.config['FACEBOOK_CLIENT_SECRET'],
            authorize_url='https://www.facebook.com/v12.0/dialog/oauth',
            authorize_params=None,
            access_token_url='https://graph.facebook.com/v12.0/oauth/access_token',
            access_token_params=None,
            api_base_url='https://graph.facebook.com/v12.0/',
            client_kwargs={'scope': 'email public_profile'},
        )


@auth.route('/signup', methods=['GET'])
def signup():
    """Redirect to homepage - signup is now done via modal"""
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    # Redirect to homepage where modal will be used
    return redirect(url_for('index'))


@auth.route('/login', methods=['GET'])
def login():
    """Redirect to homepage - login is now done via modal"""
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    # Redirect to homepage where modal will be used
    return redirect(url_for('index'))


@auth.route('/logout')
@login_required
def logout():
    """Logout current user"""
    logout_user()
    flash('You have been logged out successfully.', 'info')
    return redirect(url_for('index'))


@auth.route('/api/user/profile')
@login_required
def get_profile():
    """API endpoint to get current user profile"""
    return jsonify(current_user.to_dict())


@auth.route('/api/login', methods=['POST'])
def api_login():
    """API endpoint for login via AJAX"""
    if current_user.is_authenticated:
        return jsonify({'success': True, 'message': 'Already logged in'})

    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    remember = data.get('remember', False)

    if not email or not password:
        return jsonify({'success': False, 'message': 'Please provide both email and password'}), 400

    # Find user by email
    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'success': False, 'message': 'Your account has been deactivated'}), 403

    # Login successful
    login_user(user, remember=remember)
    user.update_last_login()
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Welcome back, {user.email}!',
        'user': user.to_dict()
    })


@auth.route('/api/signup', methods=['POST'])
def api_signup():
    """API endpoint for signup via AJAX"""
    if current_user.is_authenticated:
        return jsonify({'success': False, 'message': 'Already logged in'}), 400

    data = request.get_json()
    email = data.get('email', '').strip().lower()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')

    # Validation
    errors = []

    if not email:
        errors.append('Email is required')
    else:
        try:
            # Validate email format
            valid = validate_email(email)
            email = valid.email
        except EmailNotValidError as e:
            errors.append(f'Invalid email format')

    if not password:
        errors.append('Password is required')
    elif len(password) < 8:
        errors.append('Password must be at least 8 characters long')

    if password != confirm_password:
        errors.append('Passwords do not match')

    # Check if user already exists
    if email and User.query.filter_by(email=email).first():
        errors.append('Email already registered')

    if username and User.query.filter_by(username=username).first():
        errors.append('Username already taken')

    if errors:
        return jsonify({'success': False, 'message': errors[0], 'errors': errors}), 400

    # Create new user
    user = User(
        email=email,
        username=username if username else None
    )
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()

        # Auto-login after signup
        login_user(user)
        return jsonify({
            'success': True,
            'message': f'Welcome, {email}! Your account has been created.',
            'user': user.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error creating account: {str(e)}'}), 500


# ============== OAUTH ROUTES ==============

@auth.route('/auth/google')
def google_login():
    """Initiate Google OAuth login"""
    redirect_uri = url_for('auth.google_callback', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)


@auth.route('/auth/google/callback')
def google_callback():
    """Handle Google OAuth callback"""
    try:
        token = oauth.google.authorize_access_token()
        user_info = token.get('userinfo')

        if not user_info:
            flash('Failed to get user information from Google', 'error')
            return redirect(url_for('index'))

        email = user_info.get('email')
        if not email:
            flash('No email provided by Google', 'error')
            return redirect(url_for('index'))

        # Check if user exists
        user = User.query.filter_by(email=email).first()

        if not user:
            # Create new user
            user = User(
                email=email,
                username=user_info.get('name') or email.split('@')[0]
            )
            # OAuth users don't have passwords
            user.set_password(os.urandom(32).hex())
            db.session.add(user)
            db.session.commit()
            flash(f'Welcome to NoteFlow AI, {email}!', 'success')
        else:
            flash(f'Welcome back, {email}!', 'success')

        # Login user
        login_user(user)
        user.update_last_login()
        db.session.commit()

        return redirect(url_for('index'))

    except Exception as e:
        flash(f'Authentication failed: {str(e)}', 'error')
        return redirect(url_for('index'))


@auth.route('/auth/github')
def github_login():
    """Initiate GitHub OAuth login"""
    redirect_uri = url_for('auth.github_callback', _external=True)
    return oauth.github.authorize_redirect(redirect_uri)


@auth.route('/auth/github/callback')
def github_callback():
    """Handle GitHub OAuth callback"""
    try:
        token = oauth.github.authorize_access_token()

        # Get user info from GitHub API
        resp = oauth.github.get('user', token=token)
        user_info = resp.json()

        # Get primary email from GitHub
        email_resp = oauth.github.get('user/emails', token=token)
        emails = email_resp.json()

        # Find primary email
        email = None
        for email_data in emails:
            if email_data.get('primary') and email_data.get('verified'):
                email = email_data.get('email')
                break

        if not email:
            # Try to get any verified email
            for email_data in emails:
                if email_data.get('verified'):
                    email = email_data.get('email')
                    break

        if not email:
            flash('No verified email found in your GitHub account', 'error')
            return redirect(url_for('index'))

        # Check if user exists
        user = User.query.filter_by(email=email).first()

        if not user:
            # Create new user
            username = user_info.get('login') or email.split('@')[0]
            user = User(
                email=email,
                username=username
            )
            # OAuth users don't have passwords
            user.set_password(os.urandom(32).hex())
            db.session.add(user)
            db.session.commit()
            flash(f'Welcome to NoteFlow AI, {email}!', 'success')
        else:
            flash(f'Welcome back, {email}!', 'success')

        # Login user
        login_user(user)
        user.update_last_login()
        db.session.commit()

        return redirect(url_for('index'))

    except Exception as e:
        flash(f'Authentication failed: {str(e)}', 'error')
        return redirect(url_for('index'))


@auth.route('/auth/microsoft')
def microsoft_login():
    """Initiate Microsoft OAuth login"""
    redirect_uri = url_for('auth.microsoft_callback', _external=True)
    return oauth.microsoft.authorize_redirect(redirect_uri)


@auth.route('/auth/microsoft/callback')
def microsoft_callback():
    """Handle Microsoft OAuth callback"""
    try:
        token = oauth.microsoft.authorize_access_token()

        # Get user info from Microsoft Graph API
        resp = oauth.microsoft.get('https://graph.microsoft.com/v1.0/me', token=token)
        user_info = resp.json()

        email = user_info.get('mail') or user_info.get('userPrincipalName')
        if not email:
            flash('No email provided by Microsoft', 'error')
            return redirect(url_for('index'))

        # Check if user exists
        user = User.query.filter_by(email=email).first()

        if not user:
            # Create new user
            username = user_info.get('displayName') or email.split('@')[0]
            user = User(
                email=email,
                username=username
            )
            user.set_password(os.urandom(32).hex())
            db.session.add(user)
            db.session.commit()
            flash(f'Welcome to NoteFlow AI, {email}!', 'success')
        else:
            flash(f'Welcome back, {email}!', 'success')

        # Login user
        login_user(user)
        user.update_last_login()
        db.session.commit()

        return redirect(url_for('index'))

    except Exception as e:
        flash(f'Authentication failed: {str(e)}', 'error')
        return redirect(url_for('index'))


@auth.route('/auth/apple')
def apple_login():
    """Initiate Apple OAuth login"""
    redirect_uri = url_for('auth.apple_callback', _external=True)
    return oauth.apple.authorize_redirect(redirect_uri)


@auth.route('/auth/apple/callback', methods=['GET', 'POST'])
def apple_callback():
    """Handle Apple OAuth callback"""
    try:
        token = oauth.apple.authorize_access_token()

        # Apple returns user info in ID token
        user_info = token.get('userinfo')
        if not user_info:
            flash('Failed to get user information from Apple', 'error')
            return redirect(url_for('index'))

        email = user_info.get('email')
        if not email:
            flash('No email provided by Apple', 'error')
            return redirect(url_for('index'))

        # Check if user exists
        user = User.query.filter_by(email=email).first()

        if not user:
            # Create new user
            username = email.split('@')[0]
            user = User(
                email=email,
                username=username
            )
            user.set_password(os.urandom(32).hex())
            db.session.add(user)
            db.session.commit()
            flash(f'Welcome to NoteFlow AI, {email}!', 'success')
        else:
            flash(f'Welcome back, {email}!', 'success')

        # Login user
        login_user(user)
        user.update_last_login()
        db.session.commit()

        return redirect(url_for('index'))

    except Exception as e:
        flash(f'Authentication failed: {str(e)}', 'error')
        return redirect(url_for('index'))


@auth.route('/auth/facebook')
def facebook_login():
    """Initiate Facebook OAuth login"""
    redirect_uri = url_for('auth.facebook_callback', _external=True)
    return oauth.facebook.authorize_redirect(redirect_uri)


@auth.route('/auth/facebook/callback')
def facebook_callback():
    """Handle Facebook OAuth callback"""
    try:
        token = oauth.facebook.authorize_access_token()

        # Get user info from Facebook Graph API
        resp = oauth.facebook.get('me?fields=id,name,email', token=token)
        user_info = resp.json()

        email = user_info.get('email')
        if not email:
            flash('No email provided by Facebook', 'error')
            return redirect(url_for('index'))

        # Check if user exists
        user = User.query.filter_by(email=email).first()

        if not user:
            # Create new user
            username = user_info.get('name') or email.split('@')[0]
            user = User(
                email=email,
                username=username
            )
            user.set_password(os.urandom(32).hex())
            db.session.add(user)
            db.session.commit()
            flash(f'Welcome to NoteFlow AI, {email}!', 'success')
        else:
            flash(f'Welcome back, {email}!', 'success')

        # Login user
        login_user(user)
        user.update_last_login()
        db.session.commit()

        return redirect(url_for('index'))

    except Exception as e:
        flash(f'Authentication failed: {str(e)}', 'error')
        return redirect(url_for('index'))
