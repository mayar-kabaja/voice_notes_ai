// NoteFlow AI Frontend JavaScript

// Toast Notification System
function showToast(title, message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon based on type
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
        <button class="toast-close no-sound" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    return toast;
}

// Audio Context for Click Sound
let audioContext;

// Initialize Audio Context
function initAudioContext() {
    if (!audioContext) {
        // @ts-ignore - audioContext is a custom property we add to window
        // Reuse existing audio context if available
        // @ts-ignore - webkitAudioContext for Safari
        audioContext = window.audioContext || new (window.AudioContext || window.webkitAudioContext)();
        // @ts-ignore
        window.audioContext = audioContext; // Store globally to avoid conflicts
    }
}

// Play Click Sound
function playClickSound() {
    initAudioContext();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure sound
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = 'sine';

    // Volume envelope
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    // Play sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if this is the chat interface (skip if chat interface detected)
    if (document.getElementById('chatFileInput')) {
        console.log('Chat interface detected, skipping main.js initialization');
        return;
    }

    // Elements
    const fileInput = document.getElementById('audioFile');
    const bookFileInput = document.getElementById('bookFile');
    const videoFileInput = document.getElementById('videoFile');
    const videoUrlInput = document.getElementById('videoUrl');
    const uploadForm = document.getElementById('uploadForm');
    const dropZone = document.getElementById('dropZone');
    const dropZoneBook = document.getElementById('dropZoneBook');
    const videoZone = document.getElementById('videoZone');
    const fileSelected = document.getElementById('fileSelected');
    const fileName = document.getElementById('fileName');
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnText = document.getElementById('submitBtnText');

    let selectedFileType = null; // 'audio', 'book', 'video', or 'video-url'

    // Add click sound to all buttons
    const allButtons = document.querySelectorAll('button, .btn, a.btn');
    allButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Don't play sound if button is disabled
            if (!this.disabled && !this.classList.contains('no-sound')) {
                playClickSound();
            }
        });
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Audio Drop Zone
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', function() {
            fileInput.click();
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, function() {
                dropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, function() {
                dropZone.classList.remove('dragover');
            });
        });

        dropZone.addEventListener('drop', function(e) {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                bookFileInput.value = '';
                handleFileSelect(files[0], 'audio');
            }
        });

        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                bookFileInput.value = '';
                handleFileSelect(this.files[0], 'audio');
            }
        });
    }

    // Book Drop Zone
    if (dropZoneBook && bookFileInput) {
        dropZoneBook.addEventListener('click', function() {
            bookFileInput.click();
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZoneBook.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZoneBook.addEventListener(eventName, function() {
                dropZoneBook.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZoneBook.addEventListener(eventName, function() {
                dropZoneBook.classList.remove('dragover');
            });
        });

        dropZoneBook.addEventListener('drop', function(e) {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                bookFileInput.files = files;
                fileInput.value = '';
                handleFileSelect(files[0], 'book');
            }
        });

        bookFileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                fileInput.value = '';
                handleFileSelect(this.files[0], 'book');
            }
        });
    }

    // Video Zone - supports both file upload and URL input
    if (videoZone && videoFileInput && videoUrlInput) {
        // Click handler - show video choice modal
        videoZone.addEventListener('click', function(e) {
            // If clicking directly on the zone (not on inputs)
            if (e.target === videoZone || e.target.classList.contains('drop-zone-icon') ||
                e.target.classList.contains('drop-zone-text') || e.target.classList.contains('drop-zone-hint')) {
                // Show video choice modal
                showVideoChoiceModal();
            }
        });

        // Drag and drop for video files
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            videoZone.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            videoZone.addEventListener(eventName, function() {
                videoZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            videoZone.addEventListener(eventName, function() {
                videoZone.classList.remove('dragover');
            });
        });

        videoZone.addEventListener('drop', function(e) {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                videoFileInput.files = files;
                fileInput.value = '';
                bookFileInput.value = '';
                videoUrlInput.value = '';
                handleFileSelect(files[0], 'video');
            }
        });

        // Video file selection
        videoFileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                fileInput.value = '';
                bookFileInput.value = '';
                videoUrlInput.value = '';
                videoUrlInput.style.display = 'none';
                handleFileSelect(this.files[0], 'video');
            }
        });

        // Handle video URL input
        videoUrlInput.addEventListener('input', function() {
            const url = this.value.trim();
            if (url) {
                handleVideoUrlInput(url);
            }
        });
    }

    // Video URL input handler
    function handleVideoUrlInput(url) {
        // Clear other inputs
        if (fileInput) fileInput.value = '';
        if (bookFileInput) bookFileInput.value = '';
        if (videoFileInput) videoFileInput.value = '';
        recordedBlob = null;

        // Basic YouTube URL validation
        const isYouTubeUrl = url.includes('youtube.com') || url.includes('youtu.be');

        if (isYouTubeUrl) {
            selectedFileType = 'video-url';
            submitBtnText.textContent = 'Summarize Video';

            // Display selected video URL
            if (fileName && fileSelected) {
                fileName.textContent = `Selected: ${url}`;
                fileSelected.style.display = 'block';
            }

            // Enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
            }

            showToast('Video URL Ready', 'YouTube video ready to process', 'success', 3000);
        } else if (url.length > 10) {
            showToast('Invalid URL', 'Please enter a valid YouTube URL', 'warning', 3000);
            selectedFileType = null;
            if (submitBtn) {
                submitBtn.disabled = true;
            }
        }
    }

    // File selection handler
    function handleFileSelect(file, type) {
        if (!file) return;

        const fileExtension = file.name.split('.').pop().toLowerCase();
        let isValid = false;

        if (type === 'audio') {
            const audioExtensions = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm', 'opus'];
            isValid = audioExtensions.includes(fileExtension);
            if (!isValid) {
                showToast('Invalid File Type', 'Please select a valid audio file: MP3, WAV, M4A, OGG, FLAC, WEBM, or OPUS', 'error');
                fileInput.value = '';
                return;
            }
            selectedFileType = 'audio';
            submitBtnText.textContent = 'Process Audio';
        } else if (type === 'book') {
            const bookExtensions = ['pdf', 'epub', 'txt', 'docx', 'doc'];
            isValid = bookExtensions.includes(fileExtension);
            if (!isValid) {
                showToast('Invalid File Type', 'Please select a valid book file: PDF, EPUB, TXT, or DOCX', 'error');
                bookFileInput.value = '';
                return;
            }
            selectedFileType = 'book';
            submitBtnText.textContent = 'Summarize Book';
        } else if (type === 'video') {
            const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v'];
            isValid = videoExtensions.includes(fileExtension);
            if (!isValid) {
                showToast('Invalid File Type', 'Please select a valid video file: MP4, MOV, AVI, MKV, WEBM, FLV, or M4V', 'error');
                videoFileInput.value = '';
                return;
            }
            selectedFileType = 'video';
            submitBtnText.textContent = 'Summarize Video';
        }

        // Display selected file
        if (fileName && fileSelected) {
            fileName.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
            fileSelected.style.display = 'block';
        }

        // Enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
        }

        // Show success toast
        showToast('File Selected', `${file.name} is ready to upload`, 'success', 3000);

        console.log('Selected file:', file.name, formatFileSize(file.size), 'Type:', type);
    }

    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Form submission
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();

            let formData;
            let uploadEndpoint;
            let isBookUpload = false;
            let isVideoUpload = false;

            // Check if there's a video URL first
            if (selectedFileType === 'video-url' && videoUrlInput && videoUrlInput.value.trim()) {
                // Video URL processing
                uploadEndpoint = '/videos/process';
                isVideoUpload = true;
                isBookUpload = false;
            } else if (selectedFileType === 'video' && videoFileInput && videoFileInput.files && videoFileInput.files.length > 0) {
                // Video file upload
                formData = new FormData();
                formData.append('video', videoFileInput.files[0]);
                uploadEndpoint = '/videos/process';
                isVideoUpload = true;
                isBookUpload = false;
            } else if (recordedBlob) {
                // Recorded audio
                formData = new FormData();
                const mimeType = recordedBlob.type;
                let extension = 'webm';
                if (mimeType.includes('mp4')) {
                    extension = 'm4a';
                } else if (mimeType.includes('ogg')) {
                    extension = 'ogg';
                } else if (mimeType.includes('webm')) {
                    extension = 'webm';
                }

                const audioFile = new File([recordedBlob], `recording-${Date.now()}.${extension}`, {
                    type: mimeType
                });
                formData.append('audio', audioFile);
                uploadEndpoint = '/upload';
                isBookUpload = false;
            } else if (selectedFileType === 'book' && bookFileInput && bookFileInput.files && bookFileInput.files.length > 0) {
                // Book upload
                formData = new FormData();
                formData.append('book', bookFileInput.files[0]);
                uploadEndpoint = '/books/upload';
                isBookUpload = true;
            } else if (selectedFileType === 'audio' && fileInput && fileInput.files && fileInput.files.length > 0) {
                // Audio file upload
                formData = new FormData();
                formData.append('audio', fileInput.files[0]);
                uploadEndpoint = '/upload';
                isBookUpload = false;
            } else {
                showToast('No File Selected', 'Please record audio, upload a file (audio/video/book), or enter a YouTube URL', 'warning');
                return;
            }

            // Disable submit button and show spinner
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="btn-spinner"></span><span>Processing...</span>';
            }

            // Prepare fetch options
            let fetchOptions = {
                method: 'POST'
            };

            if (isVideoUpload) {
                // Video URL - send as JSON
                fetchOptions.headers = {
                    'Content-Type': 'application/json'
                };
                fetchOptions.body = JSON.stringify({
                    video_url: videoUrlInput.value.trim()
                });
            } else {
                // File upload - send as FormData
                fetchOptions.body = formData;
            }

            // Upload file/URL via AJAX
            fetch(uploadEndpoint, fetchOptions)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Success - show result in modal
                    if (isVideoUpload) {
                        showVideoModal(data.video_id);
                    } else if (isBookUpload) {
                        showBookModal(data.book_id);
                    } else {
                        showResultModal(data.meeting_id);
                    }

                    // Re-enable submit button
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<span>&#x1F680;</span><span id="submitBtnText">Process</span>';
                    }

                    // Reset form
                    uploadForm.reset();
                    if (fileSelected) {
                        fileSelected.style.display = 'none';
                    }
                    selectedFileType = null;

                    // Clear video URL input
                    if (videoUrlInput) {
                        videoUrlInput.value = '';
                        videoUrlInput.style.display = 'none';
                    }

                    // Clear recording if exists
                    if (recordedBlob) {
                        recordedBlob = null;
                        audioChunks = [];
                        if (audioPlayback) audioPlayback.src = '';
                        if (audioPreview) audioPreview.style.display = 'none';
                    }
                } else {
                    throw new Error(data.message || 'Upload failed');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Upload Failed', error.message || 'An error occurred during upload', 'error', 7000);

                // Re-enable submit button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>&#x1F680;</span><span id="submitBtnText">Process</span>';
                }
            });
        });
    }

    // Voice Recording Functionality
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');
    const recordingTimer = document.getElementById('recordingTimer');
    const timerDisplay = document.getElementById('timerDisplay');
    const audioPreview = document.getElementById('audioPreview');
    const audioPlayback = document.getElementById('audioPlayback');
    const discardBtn = document.getElementById('discardBtn');

    let mediaRecorder;
    let audioChunks = [];
    let recordingInterval;
    let recordingStartTime;
    let recordedBlob;

    if (recordBtn) {
        recordBtn.addEventListener('click', async function() {
            try {
                // Check if browser supports MediaRecorder
                if (!navigator.mediaDevices) {
                    showToast('Browser Not Supported', 'Audio recording requires a modern browser. Please use Chrome 49+, Firefox 25+, Edge 79+, or Safari 14.1+', 'error', 8000);
                    return;
                }

                if (!navigator.mediaDevices.getUserMedia) {
                    showToast('Feature Not Supported', 'Microphone access requires HTTPS or localhost. Make sure you\'re using http://localhost:5001', 'error', 8000);
                    return;
                }

                console.log('Requesting microphone access...');

                // Request microphone access with basic constraints first
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true
                });

                console.log('Microphone access granted!');
                showToast('Recording Started', 'Your audio is being recorded', 'success', 3000);

                // Detect supported audio format for this browser
                let mimeType = 'audio/webm';
                if (MediaRecorder.isTypeSupported('audio/webm')) {
                    mimeType = 'audio/webm';
                } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    mimeType = 'audio/webm;codecs=opus';
                } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                    mimeType = 'audio/ogg;codecs=opus';
                }

                console.log('Using MIME type:', mimeType);

                // Create MediaRecorder with detected format
                mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
                audioChunks = [];

                // Handle data available
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                // Handle recording stop
                mediaRecorder.onstop = () => {
                    // Get the actual MIME type from the recorder
                    const actualMimeType = mediaRecorder.mimeType || mimeType;
                    console.log('Recording stopped. MIME type:', actualMimeType);

                    // Create blob from chunks with the correct type
                    recordedBlob = new Blob(audioChunks, { type: actualMimeType });

                    // Create URL for playback
                    const audioUrl = URL.createObjectURL(recordedBlob);
                    audioPlayback.src = audioUrl;

                    // Show preview
                    audioPreview.style.display = 'block';

                    // Stop all tracks
                    stream.getTracks().forEach(track => track.stop());
                };

                // Start recording
                mediaRecorder.start();

                // Update UI
                recordBtn.style.display = 'none';
                stopBtn.style.display = 'inline-flex';
                recordingTimer.style.display = 'flex';
                audioPreview.style.display = 'none';

                // Start timer
                recordingStartTime = Date.now();
                recordingInterval = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
                    const minutes = Math.floor(elapsed / 60);
                    const seconds = elapsed % 60;
                    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                }, 1000);

            } catch (error) {
                console.error('Microphone Error Details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });

                let title = 'Microphone Error';
                let message = '';

                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    title = 'Permission Denied';
                    const browser = navigator.userAgent.includes('Chrome') ? 'Chrome' :
                                   navigator.userAgent.includes('Firefox') ? 'Firefox' :
                                   navigator.userAgent.includes('Safari') ? 'Safari' : 'your browser';
                    message = `Click the 🔒 or 🎤 icon in your ${browser} address bar and select "Allow" for microphone access. Then refresh and try again.`;
                } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                    title = 'No Microphone Found';
                    message = 'Make sure your microphone is connected and enabled in system settings.';
                } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                    title = 'Microphone In Use';
                    message = 'Your microphone is being used by another application. Close apps like Zoom, Teams, or other browser tabs using the microphone.';
                } else if (error.name === 'OverconstrainedError') {
                    title = 'Incompatible Settings';
                    message = 'Your microphone doesn\'t support the requested settings. Try a different browser.';
                } else if (error.name === 'NotSupportedError') {
                    title = 'Browser Not Supported';
                    message = 'Please use Chrome 49+, Firefox 25+, Edge 79+, or Safari 14.1+';
                } else if (error.name === 'TypeError') {
                    title = 'Security Error';
                    message = 'Microphone access requires HTTPS or localhost. Use http://localhost:5001 for testing.';
                } else {
                    title = 'Unexpected Error';
                    message = `${error.name}: ${error.message}. Try refreshing or using a different browser.`;
                }

                showToast(title, message, 'error', 10000);
            }
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', function() {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                showToast('Recording Stopped', 'Your recording is ready to upload', 'success', 3000);

                // Clear interval
                clearInterval(recordingInterval);

                // Update UI
                recordBtn.style.display = 'inline-flex';
                stopBtn.style.display = 'none';
                recordingTimer.style.display = 'none';
                timerDisplay.textContent = '00:00';
            }
        });
    }

    if (discardBtn) {
        discardBtn.addEventListener('click', function() {
            // Clear recording
            recordedBlob = null;
            audioChunks = [];
            audioPlayback.src = '';

            // Hide preview
            audioPreview.style.display = 'none';

            // Reset file input
            if (fileInput) {
                fileInput.value = '';
            }
            if (fileSelected) {
                fileSelected.style.display = 'none';
            }

            showToast('Recording Discarded', 'You can record a new one', 'info', 3000);
        });
    }


    // Add smooth animations on page load
    const sections = document.querySelectorAll('.upload-section, .result-section, .meeting-card');
    sections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        setTimeout(() => {
            section.style.transition = 'all 0.5s ease-out';
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, index * 100);
    });

    // Modal close functionality
    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeResultModal);
    }

    // Close modal when clicking outside
    const modal = document.getElementById('resultModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeResultModal();
            }
        });
    }
});

// Modal Functions
let currentMeetingData = null;
let originalModalSummary = null;

function showResultModal(meetingId) {
    // Fetch meeting data
    fetch(`/api/meeting/${meetingId}`)
        .then(response => response.json())
        .then(data => {
            currentMeetingData = data;

            // Populate modal with data
            document.getElementById('modalTranscript').textContent = data.transcript || 'Transcript not available';
            document.getElementById('modalSummary').textContent = data.summary || 'Summary not available';

            // Store original summary for translation reset
            originalModalSummary = data.summary || 'Summary not available';

            // Reset translation
            document.getElementById('modalTargetLanguage').value = '';

            // Show modal
            const modal = document.getElementById('resultModal');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';

            showToast('Success', 'Your meeting notes are ready!', 'success', 3000);
        })
        .catch(error => {
            console.error('Error fetching meeting:', error);
            showToast('Error', 'Failed to load meeting data', 'error');
        });
}

function closeResultModal() {
    const modal = document.getElementById('resultModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    currentMeetingData = null;
    currentBookData = null;
    currentVideoData = null;
}

// Book Modal
let currentBookData = null;

function showBookModal(bookId) {
    // Fetch book data
    fetch(`/api/book/${bookId}`)
        .then(response => response.json())
        .then(data => {
            currentBookData = data;

            // Update modal header
            document.querySelector('.modal-header h2 span:last-child').textContent = 'Book Summary';

            // Hide transcript section and show book title instead
            const transcriptDiv = document.querySelector('.transcript');
            transcriptDiv.innerHTML = `<h3>📖 ${data.title || 'Untitled Book'}</h3>`;

            // Populate summary
            document.getElementById('modalSummary').textContent = data.summary || 'Summary not available';

            // Store original summary for translation reset
            originalModalSummary = data.summary || 'Summary not available';

            // Reset translation
            document.getElementById('modalTargetLanguage').value = '';

            // Show modal
            const modal = document.getElementById('resultModal');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';

            showToast('Success', 'Your book summary is ready!', 'success', 3000);
        })
        .catch(error => {
            console.error('Error fetching book:', error);
            showToast('Error', 'Failed to load book data', 'error');
        });
}

// Video Modal
let currentVideoData = null;

function showVideoModal(videoId) {
    // Fetch video data
    fetch(`/api/video/${videoId}`)
        .then(response => response.json())
        .then(data => {
            currentVideoData = data;

            // Update modal header
            document.querySelector('.modal-header h2 span:last-child').textContent = 'Video Summary';

            // Show video title and transcript
            const transcriptDiv = document.querySelector('.transcript');
            transcriptDiv.innerHTML = `
                <h3>🎬 ${data.title || 'YouTube Video'}</h3>
                <p id="modalTranscript">${data.transcript || 'Transcript not available'}</p>
            `;

            // Populate summary
            document.getElementById('modalSummary').textContent = data.summary || 'Summary not available';

            // Store original summary for translation reset
            originalModalSummary = data.summary || 'Summary not available';

            // Reset translation
            document.getElementById('modalTargetLanguage').value = '';

            // Show modal
            const modal = document.getElementById('resultModal');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';

            showToast('Success', 'Your video summary is ready!', 'success', 3000);
        })
        .catch(error => {
            console.error('Error fetching video:', error);
            showToast('Error', 'Failed to load video data', 'error');
        });
}

// Translation in Modal - Auto translate on language selection
async function translateModalSummary() {
    const select = document.getElementById('modalTargetLanguage');
    const targetLanguage = select.value;
    const summaryContent = document.getElementById('modalSummary');

    // If empty selection (back to "🌐 Translate"), restore original
    if (!targetLanguage) {
        if (originalModalSummary) {
            summaryContent.textContent = originalModalSummary;
        }
        return;
    }

    // Get the original summary text to translate
    const textToTranslate = originalModalSummary || summaryContent.textContent;

    try {
        // Show loading state
        const originalContent = summaryContent.textContent;
        summaryContent.textContent = '⏳ Translating to ' + targetLanguage + '...';

        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: textToTranslate,
                language: targetLanguage
            })
        });

        const data = await response.json();

        if (data.success) {
            // Replace summary content with translated text
            summaryContent.textContent = data.translated_text;
            showToast('Translation Complete', `Translated to ${targetLanguage}`, 'success');
        } else {
            summaryContent.textContent = originalContent;
            showToast('Translation Failed', data.message, 'error');
            select.value = ''; // Reset selector
        }
    } catch (error) {
        console.error('Translation error:', error);
        summaryContent.textContent = originalModalSummary || 'Translation failed';
        showToast('Translation Failed', 'An error occurred during translation', 'error');
        select.value = ''; // Reset selector
    }
}

// Export as TXT from Modal
function exportModalAsText() {
    let content = '';
    let filename = '';

    if (currentVideoData) {
        content = `VIDEO: ${currentVideoData.title}\nURL: ${currentVideoData.video_url}\n\nTRANSCRIPT:\n\n${currentVideoData.transcript}\n\n\nSUMMARY:\n\n${currentVideoData.summary}`;
        filename = `video-summary-${Date.now()}.txt`;
    } else if (currentBookData) {
        content = `BOOK: ${currentBookData.title}\n\nSUMMARY:\n\n${currentBookData.summary}`;
        filename = `book-summary-${Date.now()}.txt`;
    } else if (currentMeetingData) {
        content = `TRANSCRIPT:\n\n${currentMeetingData.transcript}\n\n\nSUMMARY:\n\n${currentMeetingData.summary}`;
        filename = `meeting-notes-${Date.now()}.txt`;
    } else {
        return;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Export Complete', 'File downloaded successfully', 'success', 3000);
}

// Export as Markdown from Modal
function exportModalAsMarkdown() {
    let content = '';
    let filename = '';

    if (currentVideoData) {
        content = `# Video Summary\n\n**Title:** ${currentVideoData.title}\n**URL:** ${currentVideoData.video_url}\n\n## Transcript\n\n${currentVideoData.transcript}\n\n## AI-Generated Summary\n\n${currentVideoData.summary}`;
        filename = `video-summary-${Date.now()}.md`;
    } else if (currentBookData) {
        content = `# Book Summary\n\n**Title:** ${currentBookData.title}\n\n## Summary\n\n${currentBookData.summary}`;
        filename = `book-summary-${Date.now()}.md`;
    } else if (currentMeetingData) {
        content = `# Meeting Notes\n\n## Transcript\n\n${currentMeetingData.transcript}\n\n## AI-Generated Summary\n\n${currentMeetingData.summary}`;
        filename = `meeting-notes-${Date.now()}.md`;
    } else {
        return;
    }

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Export Complete', 'File downloaded successfully', 'success', 3000);
}

// Copy to Clipboard from Modal
function copyModalToClipboard() {
    let content = '';

    if (currentVideoData) {
        content = `VIDEO: ${currentVideoData.title}\nURL: ${currentVideoData.video_url}\n\nTRANSCRIPT:\n\n${currentVideoData.transcript}\n\n\nSUMMARY:\n\n${currentVideoData.summary}`;
    } else if (currentBookData) {
        content = `BOOK: ${currentBookData.title}\n\nSUMMARY:\n\n${currentBookData.summary}`;
    } else if (currentMeetingData) {
        content = `TRANSCRIPT:\n\n${currentMeetingData.transcript}\n\n\nSUMMARY:\n\n${currentMeetingData.summary}`;
    } else {
        return;
    }

    navigator.clipboard.writeText(content).then(() => {
        showToast('Copied', 'Content copied to clipboard', 'success', 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('Copy Failed', 'Failed to copy to clipboard', 'error');
    });
}

// Video Choice Modal Functions
function showVideoChoiceModal() {
    const modal = document.getElementById('videoChoiceModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeVideoChoiceModal() {
    const modal = document.getElementById('videoChoiceModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// Video choice modal event listeners
document.addEventListener('DOMContentLoaded', function() {
    const videoChoiceModal = document.getElementById('videoChoiceModal');
    const closeVideoChoiceBtn = document.getElementById('closeVideoChoiceModal');
    const chooseVideoFile = document.getElementById('chooseVideoFile');
    const chooseVideoUrl = document.getElementById('chooseVideoUrl');
    const videoFileInput = document.getElementById('videoFile');
    const videoUrlInput = document.getElementById('videoUrl');
    const videoZone = document.getElementById('videoZone');

    // Close modal button
    if (closeVideoChoiceBtn) {
        closeVideoChoiceBtn.addEventListener('click', closeVideoChoiceModal);
    }

    // Close modal when clicking outside
    if (videoChoiceModal) {
        videoChoiceModal.addEventListener('click', function(e) {
            if (e.target === videoChoiceModal) {
                closeVideoChoiceModal();
            }
        });
    }

    // Choose file option
    if (chooseVideoFile && videoFileInput) {
        chooseVideoFile.addEventListener('click', function() {
            closeVideoChoiceModal();
            videoFileInput.click();
        });
    }

    // Choose URL option
    if (chooseVideoUrl && videoUrlInput && videoZone) {
        chooseVideoUrl.addEventListener('click', function() {
            closeVideoChoiceModal();
            // Show URL input in the video zone
            videoZone.classList.add('active');
            videoUrlInput.style.display = 'block';
            setTimeout(() => {
                videoUrlInput.focus();
            }, 100);
        });
    }

    // Hide URL input when it loses focus and is empty
    if (videoUrlInput && videoZone) {
        videoUrlInput.addEventListener('blur', function() {
            if (!this.value.trim()) {
                this.style.display = 'none';
                videoZone.classList.remove('active');
            }
        });
    }
});
