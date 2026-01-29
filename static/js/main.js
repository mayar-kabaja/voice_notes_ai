// VoiceNotes AI Frontend JavaScript

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
        // @ts-ignore - webkitAudioContext needed for Safari compatibility
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
    // Elements
    const fileInput = document.getElementById('audioFile');
    const uploadForm = document.getElementById('uploadForm');
    const dropZone = document.getElementById('dropZone');
    const fileSelected = document.getElementById('fileSelected');
    const fileName = document.getElementById('fileName');
    const submitBtn = document.getElementById('submitBtn');

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

    // Drag and Drop Functionality
    if (dropZone && fileInput) {
        // Click to browse
        dropZone.addEventListener('click', function() {
            fileInput.click();
        });

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Highlight drop zone when dragging over
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

        // Handle dropped files
        dropZone.addEventListener('drop', function(e) {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFileSelect(files[0]);
            }
        });

        // Handle file input change
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                handleFileSelect(this.files[0]);
            }
        });
    }

    // File selection handler
    function handleFileSelect(file) {
        if (!file) return;

        // Validate file type
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const allowedExtensions = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm', 'opus'];

        if (!allowedExtensions.includes(fileExtension)) {
            showToast('Invalid File Type', 'Please select a valid audio file: MP3, WAV, M4A, OGG, FLAC, WEBM, or OPUS', 'error');
            fileInput.value = '';
            return;
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

        console.log('Selected file:', file.name, formatFileSize(file.size));
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

            // Check if there's a recorded audio first
            if (recordedBlob) {
                // Use recorded audio
                formData = new FormData();
                const audioFile = new File([recordedBlob], `recording-${Date.now()}.webm`, {
                    type: 'audio/webm'
                });
                formData.append('audio', audioFile);
            } else if (fileInput && fileInput.files && fileInput.files.length > 0) {
                // Use uploaded file
                formData = new FormData(uploadForm);
            } else {
                // No file or recording
                showToast('No File Selected', 'Please record audio or select a file first', 'warning');
                return;
            }

            // Disable submit button and show spinner
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="btn-spinner"></span><span>Processing...</span>';
            }

            // Upload file via AJAX
            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Success - show result in modal
                    showResultModal(data.meeting_id);

                    // Re-enable submit button
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<span>&#x1F680;</span><span>Process Audio</span>';
                    }

                    // Reset form
                    uploadForm.reset();
                    if (fileSelected) {
                        fileSelected.style.display = 'none';
                    }

                    // Clear recording if exists
                    if (recordedBlob) {
                        recordedBlob = null;
                        audioChunks = [];
                        if (audioPlayback) audioPlayback.src = '';
                        if (audioPreview) audioPreview.style.display = 'none';
                    }
                } else {
                    // Error from server
                    throw new Error(data.message || 'Upload failed');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Upload Failed', error.message || 'An error occurred during upload', 'error', 7000);

                // Re-enable submit button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>&#x1F680;</span><span>Process Audio</span>';
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

                // Create MediaRecorder
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                // Handle data available
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                // Handle recording stop
                mediaRecorder.onstop = () => {
                    // Create blob from chunks
                    recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });

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

function showResultModal(meetingId) {
    // Fetch meeting data
    fetch(`/api/meeting/${meetingId}`)
        .then(response => response.json())
        .then(data => {
            currentMeetingData = data;

            // Populate modal with data
            document.getElementById('modalTranscript').textContent = data.transcript || 'Transcript not available';
            document.getElementById('modalSummary').textContent = data.summary || 'Summary not available';

            // Reset translation
            document.getElementById('modalTranslationResult').style.display = 'none';
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
}

// Translation in Modal
async function translateModalNotes() {
    const select = document.getElementById('modalTargetLanguage');
    const targetLanguage = select.value;

    if (!targetLanguage) {
        showToast('Language Required', 'Please select a target language', 'warning');
        return;
    }

    const summary = document.getElementById('modalSummary').textContent;
    const btn = document.getElementById('modalTranslateBtn');
    const originalHTML = btn.innerHTML;

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-spinner"></span><span>Translating...</span>';

        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: summary,
                language: targetLanguage
            })
        });

        const data = await response.json();

        if (data.success) {
            const resultDiv = document.getElementById('modalTranslationResult');
            const contentDiv = document.getElementById('modalTranslatedContent');
            contentDiv.textContent = data.translated_text;
            resultDiv.style.display = 'block';

            showToast('Translation Complete', `Translated to ${targetLanguage}`, 'success');
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            showToast('Translation Failed', data.message, 'error');
        }
    } catch (error) {
        console.error('Translation error:', error);
        showToast('Translation Failed', 'An error occurred during translation', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// Export as TXT from Modal
function exportModalAsText() {
    if (!currentMeetingData) return;

    const content = `TRANSCRIPT:\n\n${currentMeetingData.transcript}\n\n\nSUMMARY:\n\n${currentMeetingData.summary}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-notes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Export Complete', 'File downloaded successfully', 'success', 3000);
}

// Export as Markdown from Modal
function exportModalAsMarkdown() {
    if (!currentMeetingData) return;

    const content = `# Meeting Notes\n\n## Transcript\n\n${currentMeetingData.transcript}\n\n## AI-Generated Summary\n\n${currentMeetingData.summary}`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-notes-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Export Complete', 'File downloaded successfully', 'success', 3000);
}

// Copy to Clipboard from Modal
function copyModalToClipboard() {
    if (!currentMeetingData) return;

    const content = `TRANSCRIPT:\n\n${currentMeetingData.transcript}\n\n\nSUMMARY:\n\n${currentMeetingData.summary}`;

    navigator.clipboard.writeText(content).then(() => {
        showToast('Copied', 'Meeting notes copied to clipboard', 'success', 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('Copy Failed', 'Failed to copy to clipboard', 'error');
    });
}
