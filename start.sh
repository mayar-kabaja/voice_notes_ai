#!/bin/bash
# Startup script for Render - Runs migrations then starts the app

# So yt-dlp can solve YouTube JS challenges (needed when "Only images are available" / "Requested format is not available")
if [ -d "./node/bin" ]; then export PATH="$PWD/node/bin:$PATH"; fi

echo "========================================"
echo "🚀 Starting NoteFlow AI on Render"
echo "========================================"

# Run database migrations automatically
echo "📊 Running database migrations..."
flask db upgrade

# Check if migrations succeeded
if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully!"
else
    echo "❌ Database migrations failed!"
    exit 1
fi

echo "========================================"
echo "🌟 Starting Gunicorn server..."
echo "========================================"

# Start the application
# Timeout 300s: YouTube (yt-dlp/AssemblyAI) and long uploads can take a while
exec gunicorn wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 300
