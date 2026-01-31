// NoteFlow AI - Chat Interface JavaScript

// ============== CHAT FUNCTIONALITY ==============

const chatMessages = document.getElementById('chatMessages');
const chatDropZone = document.getElementById('chatDropZone');
const chatFileInput = document.getElementById('chatFileInput');
const chatForm = document.getElementById('chatForm');
const chatUrlInput = document.getElementById('chatUrlInput');
const youtubeUrl = document.getElementById('youtubeUrl');

// Quick action buttons
const recordAudioBtn = document.getElementById('recordAudioBtn');
const uploadFileBtn = document.getElementById('uploadFileBtn');
const youtubeBtn = document.getElementById('youtubeBtn');

// Recording modal
const recordingModal = document.getElementById('recordingModal');
const closeRecordingModal = document.getElementById('closeRecordingModal');
const startRecordBtn = document.getElementById('startRecordBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const useRecordingBtn = document.getElementById('useRecordingBtn');
const discardRecordingBtn = document.getElementById('discardRecordingBtn');
const audioPreviewModal = document.getElementById('audioPreviewModal');
const audioPlaybackModal = document.getElementById('audioPlaybackModal');
const timerDisplayLarge = document.getElementById('timerDisplayLarge');
const recordingTimerLarge = document.getElementById('recordingTimerLarge');

// Recording variables
let mediaRecorder;
let audioChunks = [];
let recordingInterval;
let recordingStartTime;
let recordedBlob;

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
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';

    let content = `<p>${text}</p>`;
    if (fileInfo) {
        content += `
            <div class="file-upload-badge">
                <span class="file-icon">${fileInfo.icon}</span>
                <span class="file-name">${fileInfo.name}</span>
                <span class="file-size">${fileInfo.size}</span>
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

// Drop zone interactions
chatDropZone.addEventListener('click', () => {
    chatFileInput.click();
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    chatDropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    chatDropZone.addEventListener(eventName, () => {
        chatDropZone.classList.add('dragover');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    chatDropZone.addEventListener(eventName, () => {
        chatDropZone.classList.remove('dragover');
    });
});

chatDropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelection(files[0]);
    }
});

chatFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
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
                    <div class="summary-content" data-original-summary="${escapeHtml(data.summary)}">${escapeHtml(data.summary)}</div>
                </div>

                <div class="export-buttons-chat">
                    <button class="export-btn-chat" onclick="exportChatResult(this, 'txt')">
                        <span>📥</span>
                        <span>Export TXT</span>
                    </button>
                    <button class="export-btn-chat" onclick="exportChatResult(this, 'md')">
                        <span>📄</span>
                        <span>Export Markdown</span>
                    </button>
                    <button class="export-btn-chat" onclick="copyChatResult(this)">
                        <span>📋</span>
                        <span>Copy</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============== TRANSLATION IN CHAT ==============

async function translateInChat(selectElement) {
    const targetLanguage = selectElement.value;
    const messageContent = selectElement.closest('.message-content');
    const summaryDiv = messageContent.querySelector('.summary-content');
    const originalSummary = summaryDiv.getAttribute('data-original-summary');

    if (!targetLanguage) {
        summaryDiv.textContent = originalSummary;
        return;
    }

    try {
        const currentText = summaryDiv.textContent;
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
            summaryDiv.textContent = data.translated_text;
            showToast('Translation Complete', `Translated to ${targetLanguage}`, 'success');
        } else {
            summaryDiv.textContent = currentText;
            showToast('Translation Failed', data.message, 'error');
            selectElement.value = '';
        }
    } catch (error) {
        summaryDiv.textContent = originalSummary;
        showToast('Translation Failed', 'An error occurred', 'error');
        selectElement.value = '';
    }
}

// ============== EXPORT FUNCTIONS ==============

function exportChatResult(button, format) {
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
    recordingModal.classList.add('show');
    document.body.style.overflow = 'hidden';
});

closeRecordingModal.addEventListener('click', () => {
    recordingModal.classList.remove('show');
    document.body.style.overflow = 'auto';
});

startRecordBtn.addEventListener('click', async () => {
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
            audioPlaybackModal.src = audioUrl;

            audioPreviewModal.style.display = 'block';
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();

        startRecordBtn.style.display = 'none';
        stopRecordBtn.style.display = 'inline-flex';
        recordingTimerLarge.style.display = 'flex';

        recordingStartTime = Date.now();
        recordingInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            timerDisplayLarge.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);

        showToast('Recording Started', 'Your audio is being recorded', 'success');
    } catch (error) {
        showToast('Microphone Error', 'Could not access microphone. Please check permissions.', 'error');
    }
});

stopRecordBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearInterval(recordingInterval);

        startRecordBtn.style.display = 'inline-flex';
        stopRecordBtn.style.display = 'none';
        recordingTimerLarge.style.display = 'none';
        timerDisplayLarge.textContent = '00:00';

        showToast('Recording Stopped', 'Your recording is ready', 'success');
    }
});

useRecordingBtn.addEventListener('click', () => {
    recordingModal.classList.remove('show');
    document.body.style.overflow = 'auto';

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
    audioPreviewModal.style.display = 'none';
    audioPlaybackModal.src = '';
});

discardRecordingBtn.addEventListener('click', () => {
    recordedBlob = null;
    audioChunks = [];
    audioPlaybackModal.src = '';
    audioPreviewModal.style.display = 'none';
    showToast('Recording Discarded', 'You can record a new one', 'info');
});

// ============== QUICK ACTIONS ==============

uploadFileBtn.addEventListener('click', () => {
    chatFileInput.click();
});

youtubeBtn.addEventListener('click', () => {
    chatDropZone.style.display = 'none';
    chatUrlInput.style.display = 'flex';
    youtubeUrl.focus();
});

document.getElementById('cancelUrl').addEventListener('click', () => {
    chatDropZone.style.display = 'block';
    chatUrlInput.style.display = 'none';
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

    // Reset
    chatDropZone.style.display = 'block';
    chatUrlInput.style.display = 'none';
    youtubeUrl.value = '';
});

// Allow Enter key to submit URL
youtubeUrl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('submitUrl').click();
    }
});
