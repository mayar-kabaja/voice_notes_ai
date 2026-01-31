// NoteFlow AI - Chat Interface JavaScript

// ============== CHAT FUNCTIONALITY ==============

const chatMessages = document.getElementById('chatMessages');
const chatFileInput = document.getElementById('chatFileInput');
const chatForm = document.getElementById('chatForm');
const chatUrlInput = document.getElementById('chatUrlInput');
const youtubeUrl = document.getElementById('youtubeUrl');

// Quick action buttons
const recordAudioBtn = document.getElementById('recordAudioBtn');
const uploadFileBtn = document.getElementById('uploadFileBtn');
const youtubeBtn = document.getElementById('youtubeBtn');

// Inline recording interface
const inlineRecording = document.getElementById('inlineRecording');
const closeInlineRecording = document.getElementById('closeInlineRecording');
const inlineStartRecordBtn = document.getElementById('inlineStartRecordBtn');
const inlineStopRecordBtn = document.getElementById('inlineStopRecordBtn');
const inlineUseRecordingBtn = document.getElementById('inlineUseRecordingBtn');
const inlineDiscardRecordingBtn = document.getElementById('inlineDiscardRecordingBtn');
const inlineAudioPreview = document.getElementById('inlineAudioPreview');
const inlineAudioPlayback = document.getElementById('inlineAudioPlayback');
const inlineTimerDisplay = document.getElementById('inlineTimerDisplay');
const inlineRecordingTimer = document.getElementById('inlineRecordingTimer');

// Recording variables
let mediaRecorder;
let audioChunks = [];
let recordingInterval;
let recordingStartTime;
let recordedBlob;

// ============== SOUND EFFECTS ==============

// Use window.audioContext directly (shared with main.js)
function initAudioContext() {
    // @ts-ignore - audioContext is a custom property we add to window
    if (window.audioContext) return true;

    try {
        // @ts-ignore - webkitAudioContext for Safari
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // @ts-ignore - audioContext is a custom property
        window.audioContext = ctx;
        return true;
    } catch (e) {
        console.log('Audio not available:', e);
        return false;
    }
}

function playSound(type) {
    // Wrap everything in try-catch to never break button functionality
    try {
        // Initialize audio context on first use
        if (!initAudioContext()) return;

        // @ts-ignore - audioContext is a custom property
        const ctx = window.audioContext;
        const now = ctx.currentTime;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        switch(type) {
            case 'send': // User sends message
                oscillator.frequency.setValueAtTime(800, now);
                oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.1);
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                oscillator.start(now);
                oscillator.stop(now + 0.1);
                break;

            case 'receive': // AI message appears
                oscillator.frequency.setValueAtTime(500, now);
                oscillator.frequency.exponentialRampToValueAtTime(700, now + 0.15);
                gainNode.gain.setValueAtTime(0.25, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                oscillator.start(now);
                oscillator.stop(now + 0.15);
                break;

            case 'upload': // File upload
                oscillator.frequency.setValueAtTime(600, now);
                oscillator.frequency.setValueAtTime(800, now + 0.05);
                oscillator.frequency.setValueAtTime(1000, now + 0.1);
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                oscillator.start(now);
                oscillator.stop(now + 0.15);
                break;

            case 'processing': // Processing starts
                oscillator.frequency.setValueAtTime(400, now);
                oscillator.frequency.setValueAtTime(500, now + 0.08);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                oscillator.start(now);
                oscillator.stop(now + 0.12);
                break;

            case 'success': // Processing complete
                oscillator.frequency.setValueAtTime(600, now);
                oscillator.frequency.setValueAtTime(800, now + 0.08);
                oscillator.frequency.setValueAtTime(1000, now + 0.16);
                gainNode.gain.setValueAtTime(0.25, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                oscillator.start(now);
                oscillator.stop(now + 0.2);
                break;

            case 'click': // Button click
                oscillator.frequency.setValueAtTime(1000, now);
                gainNode.gain.setValueAtTime(0.15, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                oscillator.start(now);
                oscillator.stop(now + 0.05);
                break;

            case 'typing': // Typing sound (subtle)
                oscillator.frequency.setValueAtTime(1200, now);
                gainNode.gain.setValueAtTime(0.08, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
                oscillator.start(now);
                oscillator.stop(now + 0.03);
                break;
        }
    } catch (error) {
        // Silently fail if audio context isn't available - don't break buttons!
        // console.log('Audio playback not available:', error);
    }
}

// ============== UTILITY FUNCTIONS ==============

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        mp3: '🎵', wav: '🎵', m4a: '🎵', ogg: '🎵', flac: '🎵', webm: '🎵', opus: '🎵',
        mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬',
        pdf: '📕', epub: '📘', txt: '📄', docx: '📄', doc: '📄'
    };
    return icons[ext] || '📎';
}

// ============== CHAT MESSAGE FUNCTIONS ==============

function addUserMessage(text, fileInfo = null) {
    playSound('send'); // Play send sound

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';

    let content = `<p>${text}</p>`;
    if (fileInfo) {
        content += `
            <div class="file-upload-badge" title="${escapeHtml(fileInfo.name)}">
                <span class="file-icon">${fileInfo.icon}</span>
                <div class="file-info">
                    <span class="file-name">${escapeHtml(fileInfo.name)}</span>
                    ${fileInfo.size ? `<span class="file-size">${fileInfo.size}</span>` : ''}
                </div>
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-content">
            <div class="message-bubble">
                ${content}
            </div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addAIMessage(text) {
    playSound('receive'); // Play receive sound

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';

    messageDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="message-bubble">
                <p>${text}</p>
            </div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    return messageDiv;
}

function addProcessingMessage() {
    playSound('processing'); // Play processing sound

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message processing-message';
    messageDiv.id = 'processingMessage';

    messageDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="message-bubble">
                <p>Processing your content...</p>
                <div class="processing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    return messageDiv;
}

function removeProcessingMessage() {
    const processingMsg = document.getElementById('processingMessage');
    if (processingMsg) {
        processingMsg.remove();
    }
}

// ============== FILE UPLOAD HANDLING ==============

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Create drag overlay element
const dragOverlay = document.createElement('div');
dragOverlay.className = 'drag-overlay';
dragOverlay.innerHTML = `
    <div class="drag-overlay-content">
        <div class="drag-icon">📁</div>
        <h3>Drop your file here</h3>
        <p>Audio • Video • Document • Book</p>
    </div>
`;
document.body.appendChild(dragOverlay);

// Track drag state
let dragCounter = 0;

// Enable drag & drop on entire document body
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, preventDefaults, false);
});

// Show overlay when dragging files over the page
document.body.addEventListener('dragenter', (e) => {
    // Only show for files, not text
    if (e.dataTransfer.types.includes('Files')) {
        dragCounter++;
        dragOverlay.classList.add('active');
    }
});

document.body.addEventListener('dragleave', (e) => {
    dragCounter--;
    if (dragCounter === 0) {
        dragOverlay.classList.remove('active');
    }
});

// Handle file drop anywhere on the page
document.body.addEventListener('drop', (e) => {
    dragCounter = 0;
    dragOverlay.classList.remove('active');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelection(files[0]);
    }
});

function handleFileSelection(file) {
    const fileIcon = getFileIcon(file.name);
    const fileSize = formatFileSize(file.size);

    addUserMessage('Uploaded a file', {
        icon: fileIcon,
        name: file.name,
        size: fileSize
    });

    processFile(file);
}

// ============== FILE PROCESSING ==============

async function processFile(file) {
    const processingMsg = addProcessingMessage();

    try {
        // Determine file type
        const ext = file.name.split('.').pop().toLowerCase();
        const audioExts = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm', 'opus'];
        const videoExts = ['mp4', 'mov', 'avi', 'mkv'];
        const bookExts = ['pdf', 'epub', 'txt', 'docx', 'doc'];

        let endpoint;
        let formField;
        let dataType;

        if (audioExts.includes(ext)) {
            endpoint = '/upload';
            formField = 'audio';
            dataType = 'audio';
        } else if (videoExts.includes(ext)) {
            endpoint = '/videos/process';
            formField = 'video';
            dataType = 'video';
        } else if (bookExts.includes(ext)) {
            endpoint = '/books/upload';
            formField = 'book';
            dataType = 'book';
        } else {
            throw new Error('Unsupported file type');
        }

        const formData = new FormData();
        formData.append(formField, file);

        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        removeProcessingMessage();

        if (data.success) {
            // Fetch the actual result data
            let resultData;
            if (dataType === 'audio') {
                const res = await fetch(`/api/meeting/${data.meeting_id}`);
                resultData = await res.json();
            } else if (dataType === 'video') {
                const res = await fetch(`/api/video/${data.video_id}`);
                resultData = await res.json();
            } else if (dataType === 'book') {
                const res = await fetch(`/api/book/${data.book_id}`);
                resultData = await res.json();
            }

            // Show result in chat
            addResultMessage(resultData, dataType);
        } else {
            throw new Error(data.message || 'Processing failed');
        }
    } catch (error) {
        removeProcessingMessage();
        addAIMessage(`❌ Error: ${error.message}`);
        showToast('Error', error.message, 'error');
    }

    // Reset file input
    chatFileInput.value = '';
}

// ============== RESULT MESSAGE ==============

function addResultMessage(data, type) {
    playSound('success'); // Play success sound

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message result-message';

    let hasTranscript = data.transcript && type !== 'book';
    let title = data.title || 'Result';

    let transcriptSection = hasTranscript ? `
        <div class="result-section-chat">
            <h3>📝 Transcript</h3>
            <div class="transcript-content">${escapeHtml(data.transcript)}</div>
        </div>
    ` : '';

    messageDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="message-bubble">
                <p><strong>✅ ${escapeHtml(title)}</strong></p>
                <p>Your content has been processed!</p>

                ${transcriptSection}

                <div class="result-section-chat">
                    <h3>✨ AI-Generated Summary</h3>
                    <div class="summary-controls">
                        <div class="translate-dropdown-chat">
                            <select class="translate-select" onchange="translateInChat(this)">
                                <option value="">🌐 Translate to...</option>
                                <option value="Spanish">🇪🇸 Spanish</option>
                                <option value="French">🇫🇷 French</option>
                                <option value="German">🇩🇪 German</option>
                                <option value="Arabic">🇸🇦 Arabic</option>
                                <option value="Chinese">🇨🇳 Chinese</option>
                                <option value="Japanese">🇯🇵 Japanese</option>
                                <option value="Korean">🇰🇷 Korean</option>
                                <option value="Portuguese">🇵🇹 Portuguese</option>
                                <option value="Russian">🇷🇺 Russian</option>
                                <option value="Italian">🇮🇹 Italian</option>
                                <option value="Hindi">🇮🇳 Hindi</option>
                                <option value="Turkish">🇹🇷 Turkish</option>
                            </select>
                        </div>
                        <div class="export-buttons-chat">
                            <button class="export-btn-chat export-icon-btn" onclick="exportChatResult(this, 'txt')" title="Export as TXT">
                                <span>📥</span>
                            </button>
                            <button class="export-btn-chat export-icon-btn" onclick="exportChatResult(this, 'md')" title="Export as Markdown">
                                <span>📄</span>
                            </button>
                            <button class="export-btn-chat export-icon-btn" onclick="copyChatResult(this)" title="Copy to clipboard">
                                <span>📋</span>
                            </button>
                        </div>
                    </div>
                    <div class="summary-content" data-original-summary="${escapeHtml(data.summary)}">${formatSummary(data.summary)}</div>
                </div>
            </div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);

    // Scroll to the top of the new result message
    setTimeout(() => {
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatSummary(text) {
    // Format summary text with proper line breaks and handle markdown-style bold
    // Since this is AI-generated content from our backend, we can trust it
    // Preserve structure: single line breaks stay as single, double become double
    return text
        .split('\n')
        .map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '';

            // Escape HTML first
            let formatted = escapeHtml(trimmed);

            // Convert **bold** to <strong>bold</strong>
            formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

            // Convert single *italic* to <em>italic</em>
            formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

            return formatted;
        })
        .join('<br>')
        .replace(/(<br>){3,}/g, '<br><br>'); // Limit consecutive breaks to max 2
}

// ============== TRANSLATION IN CHAT ==============

async function translateInChat(selectElement) {
    const targetLanguage = selectElement.value;
    const messageContent = selectElement.closest('.message-content');
    const summaryDiv = messageContent.querySelector('.summary-content');
    const originalSummary = summaryDiv.getAttribute('data-original-summary');

    if (!targetLanguage) {
        summaryDiv.innerHTML = formatSummary(originalSummary);
        return;
    }

    try {
        const currentHTML = summaryDiv.innerHTML;
        summaryDiv.textContent = `⏳ Translating to ${targetLanguage}...`;

        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: originalSummary,
                language: targetLanguage
            })
        });

        const data = await response.json();

        if (data.success) {
            summaryDiv.innerHTML = formatSummary(data.translated_text);
            showToast('Translation Complete', `Translated to ${targetLanguage}`, 'success');
        } else {
            summaryDiv.innerHTML = currentHTML;
            showToast('Translation Failed', data.message, 'error');
            selectElement.value = '';
        }
    } catch (error) {
        summaryDiv.innerHTML = formatSummary(originalSummary);
        showToast('Translation Failed', 'An error occurred', 'error');
        selectElement.value = '';
    }
}

// ============== EXPORT FUNCTIONS ==============

function exportChatResult(button, format) {
    playSound('click'); // Play click sound

    const messageContent = button.closest('.message-content');
    const transcriptDiv = messageContent.querySelector('.transcript-content');
    const summaryDiv = messageContent.querySelector('.summary-content');

    const transcript = transcriptDiv ? transcriptDiv.textContent : '';
    const summary = summaryDiv.textContent;

    let content;
    let filename;

    if (format === 'txt') {
        if (transcript) {
            content = `TRANSCRIPT:\n\n${transcript}\n\n\nSUMMARY:\n\n${summary}`;
        } else {
            content = `SUMMARY:\n\n${summary}`;
        }
        filename = `noteflow-${Date.now()}.txt`;
    } else if (format === 'md') {
        if (transcript) {
            content = `# NoteFlow AI Notes\n\n## Transcript\n\n${transcript}\n\n## AI-Generated Summary\n\n${summary}`;
        } else {
            content = `# NoteFlow AI Summary\n\n${summary}`;
        }
        filename = `noteflow-${Date.now()}.md`;
    }

    const blob = new Blob([content], { type: format === 'txt' ? 'text/plain' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Export Complete', 'File downloaded successfully', 'success');
}

function copyChatResult(button) {
    playSound('click'); // Play click sound

    const messageContent = button.closest('.message-content');
    const transcriptDiv = messageContent.querySelector('.transcript-content');
    const summaryDiv = messageContent.querySelector('.summary-content');

    const transcript = transcriptDiv ? transcriptDiv.textContent : '';
    const summary = summaryDiv.textContent;

    let content;
    if (transcript) {
        content = `TRANSCRIPT:\n\n${transcript}\n\n\nSUMMARY:\n\n${summary}`;
    } else {
        content = `SUMMARY:\n\n${summary}`;
    }

    navigator.clipboard.writeText(content).then(() => {
        showToast('Copied', 'Content copied to clipboard', 'success');
    }).catch(() => {
        showToast('Copy Failed', 'Failed to copy to clipboard', 'error');
    });
}

// ============== RECORDING FUNCTIONALITY ==============

recordAudioBtn.addEventListener('click', () => {
    playSound('click'); // Play click sound
    inlineRecording.style.display = 'block';
    chatTextInput.style.display = 'none';
});

closeInlineRecording.addEventListener('click', () => {
    inlineRecording.style.display = 'none';
    chatTextInput.style.display = 'flex';
    // Reset if recording was in progress
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearInterval(recordingInterval);
    }
    // Reset UI
    inlineStartRecordBtn.style.display = 'flex';
    inlineStopRecordBtn.style.display = 'none';
    inlineAudioPreview.style.display = 'none';
    inlineTimerDisplay.textContent = '00:00';
});

inlineStartRecordBtn.addEventListener('click', async () => {
    playSound('click'); // Play click sound
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
        }

        mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const actualMimeType = mediaRecorder.mimeType || mimeType;
            recordedBlob = new Blob(audioChunks, { type: actualMimeType });

            const audioUrl = URL.createObjectURL(recordedBlob);
            inlineAudioPlayback.src = audioUrl;

            inlineAudioPreview.style.display = 'block';
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();

        inlineStartRecordBtn.style.display = 'none';
        inlineStopRecordBtn.style.display = 'flex';

        recordingStartTime = Date.now();
        recordingInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            inlineTimerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);

        showToast('Recording Started', 'Your audio is being recorded', 'success');
    } catch (error) {
        showToast('Microphone Error', 'Could not access microphone. Please check permissions.', 'error');
    }
});

inlineStopRecordBtn.addEventListener('click', () => {
    playSound('click'); // Play click sound
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearInterval(recordingInterval);

        inlineStartRecordBtn.style.display = 'flex';
        inlineStopRecordBtn.style.display = 'none';
        inlineTimerDisplay.textContent = '00:00';

        showToast('Recording Stopped', 'Your recording is ready', 'success');
    }
});

inlineUseRecordingBtn.addEventListener('click', () => {
    playSound('click'); // Play click sound
    inlineRecording.style.display = 'none';
    chatTextInput.style.display = 'flex';

    const mimeType = recordedBlob.type;
    let extension = 'webm';
    if (mimeType.includes('mp4')) {
        extension = 'm4a';
    } else if (mimeType.includes('ogg')) {
        extension = 'ogg';
    }

    const audioFile = new File([recordedBlob], `recording-${Date.now()}.${extension}`, {
        type: mimeType
    });

    addUserMessage('Recorded audio', {
        icon: '🎤',
        name: audioFile.name,
        size: formatFileSize(audioFile.size)
    });

    processFile(audioFile);

    // Reset recording
    inlineAudioPreview.style.display = 'none';
    inlineAudioPlayback.src = '';
    inlineStartRecordBtn.style.display = 'flex';
    inlineStopRecordBtn.style.display = 'none';
    inlineTimerDisplay.textContent = '00:00';
});

inlineDiscardRecordingBtn.addEventListener('click', () => {
    playSound('click'); // Play click sound
    recordedBlob = null;
    audioChunks = [];
    inlineAudioPlayback.src = '';
    inlineAudioPreview.style.display = 'none';
    inlineStartRecordBtn.style.display = 'flex';
    inlineStopRecordBtn.style.display = 'none';
    inlineTimerDisplay.textContent = '00:00';
    showToast('Recording Discarded', 'You can record a new one', 'info');
});

// ============== QUICK ACTIONS ==============

// NOTE: Upload button handler is now at line ~726 (moved to conversational AI section)

youtubeBtn.addEventListener('click', () => {
    playSound('click'); // Play click sound
    chatTextInput.style.display = 'none';
    chatUrlInput.style.display = 'flex';
    youtubeUrl.focus();
});

document.getElementById('cancelUrl').addEventListener('click', () => {
    chatUrlInput.style.display = 'none';
    chatTextInput.style.display = 'flex';
    youtubeUrl.value = '';
});

document.getElementById('submitUrl').addEventListener('click', async () => {
    const url = youtubeUrl.value.trim();

    if (!url) {
        showToast('Error', 'Please enter a YouTube URL', 'warning');
        return;
    }

    addUserMessage('YouTube video', {
        icon: '🎬',
        name: url,
        size: ''
    });

    const processingMsg = addProcessingMessage();

    try {
        const response = await fetch('/videos/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ video_url: url })
        });

        const data = await response.json();

        removeProcessingMessage();

        if (data.success) {
            // Fetch the video result data
            const res = await fetch(`/api/video/${data.video_id}`);
            const resultData = await res.json();

            // Show result in chat
            addResultMessage(resultData, 'video');
        } else {
            throw new Error(data.message || 'Processing failed');
        }
    } catch (error) {
        removeProcessingMessage();
        addAIMessage(`❌ Error: ${error.message}`);
        showToast('Error', error.message, 'error');
    }

    // Reset - go back to text input
    chatUrlInput.style.display = 'none';
    chatTextInput.style.display = 'flex';
    youtubeUrl.value = '';
});

// Allow Enter key to submit URL
youtubeUrl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('submitUrl').click();
    }
});

// ============== CONVERSATIONAL AI ==============

const userMessageInput = document.getElementById('userMessageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const chatTextInput = document.getElementById('chatTextInput');

// Store current context
let currentContext = {
    type: null,  // 'audio', 'video', 'book'
    id: null,    // meeting_id, video_id, book_id
    data: null   // Full result data
};

// Update context when result is shown
function setContext(type, id, data) {
    currentContext = { type, id, data };
}

// Add typing sound effect
let lastTypingSound = 0;
userMessageInput.addEventListener('input', () => {
    const now = Date.now();
    // Throttle typing sounds to every 100ms
    if (now - lastTypingSound > 100) {
        playSound('typing');
        lastTypingSound = now;
    }
});

// Handle send message
sendMessageBtn.addEventListener('click', () => {
    playSound('click'); // Play click sound
    sendUserMessage();
});

userMessageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendUserMessage();
    }
});

async function sendUserMessage() {
    const message = userMessageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    // Add user message to chat
    addUserMessage(message);
    
    // Clear input
    userMessageInput.value = '';
    
    // Show processing
    const processingMsg = addProcessingMessage();
    
    try {
        // Send to backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                context_type: currentContext.type,
                context_id: currentContext.id
            })
        });
        
        const data = await response.json();
        
        removeProcessingMessage();
        
        if (data.success) {
            addAIMessage(data.response);
        } else {
            addAIMessage(`❌ Sorry, I encountered an error: ${data.message}`);
        }
    } catch (error) {
        removeProcessingMessage();
        addAIMessage(`❌ Sorry, I couldn't process your message. ${error.message}`);
    }
}

// Update addResultMessage to set context
const originalAddResultMessage = addResultMessage;
addResultMessage = function(data, type) {
    // Call original function
    originalAddResultMessage(data, type);
    
    // Set context
    const id = data.id;
    setContext(type, id, data);
};

// Update file upload button behavior
let uploadBtnClicked = false;
uploadFileBtn.addEventListener('click', function(e) {
    playSound('click'); // Play click sound
    console.log('Upload button clicked');
    e.preventDefault();
    e.stopPropagation();

    if (uploadBtnClicked) {
        console.log('Upload button already clicked, ignoring');
        return; // Prevent double-click
    }
    uploadBtnClicked = true;

    // Blur the button to prevent focus issues
    this.blur();

    // Open file dialog
    console.log('Opening file dialog via chatFileInput.click()');
    chatFileInput.click();

    // Reset after delay
    setTimeout(() => {
        uploadBtnClicked = false;
        console.log('Upload button reset');
    }, 1000);
});

// When file is selected, process it
let isProcessingFile = false;
chatFileInput.addEventListener('change', function(e) {
    console.log('File input changed, files:', this.files.length);

    if (isProcessingFile) {
        console.log('Already processing, ignoring');
        return; // Prevent duplicate processing
    }

    if (this.files.length > 0) {
        isProcessingFile = true;
        console.log('Processing file:', this.files[0].name);
        handleFileSelection(this.files[0]);

        // Reset after a delay
        setTimeout(() => {
            this.value = '';
            isProcessingFile = false;
            console.log('File input reset');
        }, 500);
    }
});

// Update cancel URL button
document.getElementById('cancelUrl').addEventListener('click', () => {
    chatUrlInput.style.display = 'none';
    chatTextInput.style.display = 'flex';
    youtubeUrl.value = '';
});

// Update YouTube button
youtubeBtn.addEventListener('click', () => {
    chatTextInput.style.display = 'none';
    chatUrlInput.style.display = 'flex';
    youtubeUrl.focus();
});

// Note: YouTube URL submission is handled earlier in the file
// The handler at line ~578 already manages the flow

// Focus input on load
window.addEventListener('load', () => {
    userMessageInput.focus();
});

// ============== MOBILE UX IMPROVEMENTS ==============

// Detect if mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

if (isMobile) {
    console.log('Mobile device detected');

    // Prevent rubber-band scrolling on iOS
    if (isIOS) {
        document.body.style.overscrollBehavior = 'none';
    }

    // Handle input focus on mobile
    userMessageInput.addEventListener('focus', function() {
        // Scroll to input when keyboard opens
        setTimeout(() => {
            this.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    });

    // Auto-scroll to bottom when keyboard closes
    userMessageInput.addEventListener('blur', function() {
        setTimeout(() => {
            scrollToBottom();
        }, 100);
    });

    // Optimize scroll performance on mobile
    let scrollTimeout;
    chatMessages.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            // Scroll ended
        }, 150);
    }, { passive: true });

    // Handle window resize (keyboard show/hide on mobile)
    let lastHeight = window.innerHeight;
    window.addEventListener('resize', function() {
        const currentHeight = window.innerHeight;
        const diff = lastHeight - currentHeight;

        // Keyboard opened (height decreased significantly)
        if (diff > 100) {
            console.log('Keyboard opened');
            setTimeout(scrollToBottom, 300);
        }

        lastHeight = currentHeight;
    });

    // Add haptic feedback on iOS (if available)
    if (window.navigator && window.navigator.vibrate) {
        const hapticButtons = document.querySelectorAll('.quick-action-btn, .send-btn');
        hapticButtons.forEach(button => {
            button.addEventListener('click', function() {
                window.navigator.vibrate(10);
            });
        });
    }
}

// Handle orientation changes
window.addEventListener('orientationchange', function() {
    setTimeout(() => {
        scrollToBottom();
    }, 300);
});

// Prevent body scroll when modal is open (mobile)
if (isMobile) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.target.classList.contains('show')) {
                    document.body.style.overflow = 'hidden';
                    if (isIOS) {
                        document.body.style.position = 'fixed';
                        document.body.style.width = '100%';
                    }
                } else {
                    document.body.style.overflow = '';
                    if (isIOS) {
                        document.body.style.position = '';
                        document.body.style.width = '';
                    }
                }
            });
        });

        observer.observe(modal, {
            attributes: true,
            attributeFilter: ['class']
        });
    });
}
