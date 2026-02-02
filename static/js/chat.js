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

            case 'typing': // iPhone keyboard typing sound
                // Create a soft "tock" sound like iPhone keyboard
                oscillator.type = 'sine';

                // Soft, muted click with slight pitch variation (like iOS)
                oscillator.frequency.setValueAtTime(1100 + Math.random() * 100, now);

                // Very quick attack and decay for that subtle "tock"
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(0.045, now + 0.002); // Quick attack
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.012); // Fast decay

                oscillator.start(now);
                oscillator.stop(now + 0.015);
                break;
        }
    } catch (error) {
        // Silently fail if audio context isn't available
    }
}

// ============== UTILITY FUNCTIONS ==============

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ============== AUTH CHECK HELPER ==============

function requireLogin(action) {
    // Check if user is authenticated by looking for user-info-inline div
    const isLoggedIn = document.querySelector('.user-info-inline') !== null;

    if (!isLoggedIn) {
        // Show the login modal with the specific action message
        showLoginModal(action);
        return false;
    }
    return true;
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

// ============== PROGRESS BAR FUNCTIONS ==============

function createProgressBar(showProgress = true) {
    const progressContainer = document.createElement('div');
    progressContainer.className = showProgress ? 'progress-container' : 'typing-indicator-container';
    progressContainer.id = 'progressContainer';

    if (showProgress) {
        // Progress bar with percentage (for file uploads)
        progressContainer.innerHTML = `
            <div class="progress-bar-wrapper">
                <div class="progress-bar" id="progressBar" style="width: 0%"></div>
            </div>
            <div class="progress-text">
                <span class="progress-stage" id="progressStage">Processing...</span>
                <span class="progress-percentage" id="progressPercentage">0%</span>
            </div>
        `;
    } else {
        // Simple typing indicator (for URLs/quick operations)
        progressContainer.innerHTML = `
            <div class="typing-dots">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
        `;
    }

    return progressContainer;
}

function updateProgress(percentage, stage) {
    const progressBar = document.getElementById('progressBar');
    const progressStage = document.getElementById('progressStage');
    const progressPercentage = document.getElementById('progressPercentage');

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;

        // Add complete class when done
        if (percentage >= 100) {
            progressBar.classList.add('complete');
        }
    }

    if (progressStage && stage) {
        progressStage.textContent = stage;
    }

    if (progressPercentage) {
        progressPercentage.textContent = `${Math.round(percentage)}%`;
    }
}

function setProgressError() {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.classList.add('error');
    }
}

// ============== PROCESSING MESSAGE WITH PROGRESS ==============

function addProcessingMessage(customMessage = 'Processing...', showProgress = true) {
    playSound('processing');

    const loaderDiv = document.createElement('div');
    loaderDiv.className = 'standalone-loader';
    loaderDiv.id = 'processingMessage';

    loaderDiv.appendChild(createProgressBar(showProgress));

    chatMessages.appendChild(loaderDiv);
    scrollToBottom();
    return loaderDiv;
}

function updateProcessingMessage(newMessage, percentage) {
    // Update progress if percentage provided
    if (percentage !== undefined) {
        updateProgress(percentage, newMessage);
    }
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

    // Determine file type for better messaging
    const ext = file.name.split('.').pop().toLowerCase();
    const audioExts = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm', 'opus'];
    const videoExts = ['mp4', 'mov', 'avi', 'mkv'];
    const bookExts = ['pdf', 'epub', 'txt', 'docx', 'doc'];

    let fileTypeLabel = 'a file';
    if (audioExts.includes(ext)) {
        fileTypeLabel = 'an audio file';
    } else if (videoExts.includes(ext)) {
        fileTypeLabel = 'a video file';
    } else if (bookExts.includes(ext)) {
        fileTypeLabel = 'a book/document';
    }

    addUserMessage(`Uploaded ${fileTypeLabel}`, {
        icon: fileIcon,
        name: file.name,
        size: fileSize
    });

    processFile(file);
}

// ============== PROGRESS SIMULATION ==============

function startProgressSimulation(dataType) {
    let currentProgress = 5;
    let currentStage = 0;

    // Define stages for different file types
    const stages = {
        video: [
            { start: 5, end: 25, message: 'Extracting audio...', duration: 3000 },
            { start: 25, end: 70, message: 'Transcribing...', duration: 8000 },
            { start: 70, end: 95, message: 'Summarizing...', duration: 5000 }
        ],
        audio: [
            { start: 5, end: 70, message: 'Transcribing...', duration: 8000 },
            { start: 70, end: 95, message: 'Summarizing...', duration: 5000 }
        ],
        book: [
            { start: 5, end: 40, message: 'Extracting text...', duration: 4000 },
            { start: 40, end: 95, message: 'Summarizing...', duration: 6000 }
        ]
    };

    const fileStages = stages[dataType] || stages.audio;
    let stageIndex = 0;
    let stageStartTime = Date.now();

    const interval = setInterval(() => {
        const currentStageData = fileStages[stageIndex];
        if (!currentStageData) {
            clearInterval(interval);
            return;
        }

        const elapsedTime = Date.now() - stageStartTime;
        const stageProgress = Math.min(elapsedTime / currentStageData.duration, 1);

        // Calculate current progress based on stage
        currentProgress = currentStageData.start +
            (currentStageData.end - currentStageData.start) * stageProgress;

        // Update UI
        updateProcessingMessage(currentStageData.message, currentProgress);

        // Move to next stage if current stage is complete
        if (stageProgress >= 1 && stageIndex < fileStages.length - 1) {
            stageIndex++;
            stageStartTime = Date.now();
        }
    }, 200); // Update every 200ms for smooth animation

    return { interval, stages: fileStages };
}

// ============== FILE PROCESSING ==============

async function processFile(file) {
    // Determine file type first
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

    // File upload - use progress bar with percentage
    addProcessingMessage('Processing...', true);
    updateProgress(5, 'Processing...');

    // Simulate realistic progress through stages
    const progressSimulator = startProgressSimulation(dataType);

    try {
        const formData = new FormData();
        formData.append(formField, file);

        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        // Stop progress simulation
        clearInterval(progressSimulator.interval);

        // Complete progress
        updateProcessingMessage('✅ Processing complete!', 100);

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
        // Stop progress simulation on error
        if (progressSimulator) {
            clearInterval(progressSimulator.interval);
        }

        // Show error state
        setProgressError();
        updateProcessingMessage(`❌ Error occurred`, 100);

        // Wait a moment before removing
        setTimeout(() => {
            removeProcessingMessage();

            // Format error message for display
            const errorMessage = error.message || 'Unknown error occurred';

            // Check if it's a rate limit error
            if (errorMessage.includes('⏳') || errorMessage.toLowerCase().includes('rate limit')) {
                // Extract wait time if mentioned
                const waitTimeMatch = errorMessage.match(/(\d+)\s*minute/i);
                const waitTime = waitTimeMatch ? waitTimeMatch[1] : 'a few';

                addAIMessage(`⏳ **Whoa, slow down there!**\n\nLooks like we've used up our API requests for now. No worries though!\n\n**What's happening?**\nOur AI service has a limit on how many requests we can make.\n\n**What to do:**\n• ☕ Take a ${waitTime}-minute coffee break and try again\n• ⚡ Want instant access? [Upgrade your plan](https://console.groq.com/settings/billing)\n• 🎯 Meanwhile, you can still work with files you've already processed!\n\nThanks for your patience! 😊`);
                showToast('⏳ Taking a quick break', `Back in ${waitTime} minutes`, 'warning', 6000);
            }
            // Check if it's a quota error
            else if (errorMessage.includes('💳') || errorMessage.toLowerCase().includes('quota')) {
                addAIMessage(`💳 **Oops! We're out of credits**\n\nYour API account has run out of quota for this month.\n\n**Here's what you can do:**\n• 📊 [Check your usage](https://console.groq.com/settings/billing)\n• ⬆️ Upgrade your plan for more quota\n• 📅 Wait until next month for quota reset\n\nDon't worry - your processed files are safe! 🔒`);
                showToast('💳 Quota used up', 'Check your account', 'error', 6000);
            }
            // Check if it's an auth error
            else if (errorMessage.includes('🔑') || errorMessage.toLowerCase().includes('auth')) {
                addAIMessage(`🔑 **Authentication Issue**\n\nHmm, there's a problem with the API connection.\n\n**This usually means:**\n• The API key might need to be updated\n• There might be a configuration issue\n\n**What to do:**\nPlease contact the app administrator. This isn't something you can fix on your end. 🛠️`);
                showToast('🔑 Connection issue', 'Contact support', 'error', 6000);
            }
            // Generic error
            else {
                addAIMessage(`❌ **Oops! Something went wrong**\n\n${errorMessage}\n\n**Quick fixes to try:**\n• 🔄 Try uploading again\n• 📁 Make sure your file is a valid format\n• ⏱️ If it's a large file, try a shorter one\n• 🌐 Check your internet connection\n\nStill having issues? Let us know! 💬`);
                showToast('⚠️ Processing failed', 'Try again', 'error', 5000);
            }
        }, 1500);
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
            <div class="summary-controls">
                <div class="translate-dropdown-chat">
                    <select class="translate-select" onchange="translateTranscriptInChat(this)">
                        <option value="">🌐</option>
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
                    <button class="export-btn-chat export-icon-btn" onclick="exportTranscriptResult(this, 'txt')" title="Export as TXT">
                        <span>📥</span>
                    </button>
                    <button class="export-btn-chat export-icon-btn" onclick="exportTranscriptResult(this, 'md')" title="Export as Markdown">
                        <span>📄</span>
                    </button>
                    <button class="export-btn-chat export-icon-btn" onclick="copyTranscriptResult(this)" title="Copy to clipboard">
                        <span>📋</span>
                    </button>
                </div>
            </div>
            <div class="transcript-content" data-original-transcript="${escapeHtml(data.transcript)}">${escapeHtml(data.transcript)}</div>
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
                                <option value="">🌐</option>
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

    // Set context when result is shown
    const id = data.id;
    setContext(type, id, data);

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
            const errorMessage = data.message || 'Translation failed';

            // Check if it's a rate limit error
            if (errorMessage.includes('⏳') || errorMessage.toLowerCase().includes('rate limit')) {
                showToast('⏳ Translation paused', 'Try again in a few minutes', 'warning', 5000);
            }
            // Check if it's a quota error
            else if (errorMessage.includes('💳') || errorMessage.toLowerCase().includes('quota')) {
                showToast('💳 Out of quota', 'Translation temporarily unavailable', 'warning', 5000);
            }
            // Generic error
            else {
                showToast('Translation failed', 'Please try again', 'error', 4000);
            }
            selectElement.value = '';
        }
    } catch (error) {
        summaryDiv.innerHTML = formatSummary(originalSummary);
        const errorMessage = error.message || 'An error occurred';

        if (errorMessage.includes('⏳') || errorMessage.toLowerCase().includes('rate limit')) {
            showToast('⏳ Slow down!', 'Wait a moment and try again', 'warning', 5000);
        } else {
            showToast('Translation failed', 'Network issue - try again', 'error', 4000);
        }
        selectElement.value = '';
    }
}

async function translateTranscriptInChat(selectElement) {
    const targetLanguage = selectElement.value;
    const messageContent = selectElement.closest('.message-content');
    const transcriptDiv = messageContent.querySelector('.transcript-content');
    const originalTranscript = transcriptDiv.getAttribute('data-original-transcript');

    if (!targetLanguage) {
        transcriptDiv.textContent = originalTranscript;
        return;
    }

    try {
        const currentHTML = transcriptDiv.innerHTML;
        transcriptDiv.textContent = `⏳ Translating to ${targetLanguage}...`;

        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: originalTranscript,
                language: targetLanguage
            })
        });

        const data = await response.json();

        if (data.success) {
            transcriptDiv.textContent = data.translated_text;
            showToast('Translation Complete', `Translated to ${targetLanguage}`, 'success');
        } else {
            transcriptDiv.innerHTML = currentHTML;
            const errorMessage = data.message || 'Translation failed';

            // Check if it's a rate limit error
            if (errorMessage.includes('⏳') || errorMessage.toLowerCase().includes('rate limit')) {
                showToast('⏳ Translation paused', 'Try again in a few minutes', 'warning', 5000);
            }
            // Check if it's a quota error
            else if (errorMessage.includes('💳') || errorMessage.toLowerCase().includes('quota')) {
                showToast('💳 Out of quota', 'Translation temporarily unavailable', 'warning', 5000);
            }
            // Generic error
            else {
                showToast('Translation failed', 'Please try again', 'error', 4000);
            }
            selectElement.value = '';
        }
    } catch (error) {
        transcriptDiv.textContent = originalTranscript;
        const errorMessage = error.message || 'An error occurred';

        if (errorMessage.includes('⏳') || errorMessage.toLowerCase().includes('rate limit')) {
            showToast('⏳ Slow down!', 'Wait a moment and try again', 'warning', 5000);
        } else {
            showToast('Translation failed', 'Network issue - try again', 'error', 4000);
        }
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

// ============== TRANSCRIPT-ONLY EXPORT FUNCTIONS ==============

function exportTranscriptResult(button, format) {
    playSound('click'); // Play click sound

    const messageContent = button.closest('.message-content');
    const transcriptDiv = messageContent.querySelector('.transcript-content');

    const transcript = transcriptDiv ? transcriptDiv.textContent : '';

    let content;
    let filename;

    if (format === 'txt') {
        content = `TRANSCRIPT:\n\n${transcript}`;
        filename = `noteflow-transcript-${Date.now()}.txt`;
    } else if (format === 'md') {
        content = `# NoteFlow AI Transcript\n\n${transcript}`;
        filename = `noteflow-transcript-${Date.now()}.md`;
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

    showToast('Export Complete', 'Transcript downloaded successfully', 'success');
}

function copyTranscriptResult(button) {
    playSound('click'); // Play click sound

    const messageContent = button.closest('.message-content');
    const transcriptDiv = messageContent.querySelector('.transcript-content');

    const transcript = transcriptDiv ? transcriptDiv.textContent : '';

    navigator.clipboard.writeText(transcript).then(() => {
        showToast('Copied', 'Transcript copied to clipboard', 'success');
    }).catch(() => {
        showToast('Copy Failed', 'Failed to copy to clipboard', 'error');
    });
}

// ============== RECORDING FUNCTIONALITY ==============

recordAudioBtn.addEventListener('click', () => {
    if (!requireLogin('record audio')) return;
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
    if (!requireLogin('add YouTube videos')) return;
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

    // YouTube URL - use typing indicator (no progress bar)
    addProcessingMessage('Processing...', false);

    try {
        const response = await fetch('/videos/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ video_url: url })
        });

        const data = await response.json();

        // Remove processing indicator
        removeProcessingMessage();

        if (data.success) {
            // Fetch the video result data
            fetch(`/api/video/${data.video_id}`)
                .then(res => res.json())
                .then(resultData => {
                    // Show result in chat
                    addResultMessage(resultData, 'video');
                });
        } else {
            throw new Error(data.message || 'Processing failed');
        }

    } catch (error) {
        removeProcessingMessage();

        // Format error message for display
        const errorMessage = error.message || 'Unknown error';
        const formattedError = errorMessage.replace(/\\n/g, '\n');

        // Check if it's a rate limit error
        if (formattedError.includes('⏳') || formattedError.toLowerCase().includes('rate limit')) {
            const waitTimeMatch = formattedError.match(/(\d+)\s*minute/i);
            const waitTime = waitTimeMatch ? waitTimeMatch[1] : 'a few';

            addAIMessage(`⏳ **Taking a breather...**\n\nWe've hit the rate limit for now, but don't worry!\n\n**Alternative options:**\n• ☕ Wait ${waitTime} minutes and paste the URL again\n• 📥 Download the video and upload the file directly instead\n• ⚡ [Upgrade your plan](https://console.groq.com/settings/billing) for unlimited access\n\nFile uploads work great and don't have this limit! 🎬`);
            showToast('⏳ Rate limit reached', `Try again in ${waitTime} min`, 'warning', 6000);
        }
        // Check if it's a quota error
        else if (formattedError.includes('💳') || formattedError.toLowerCase().includes('quota')) {
            addAIMessage(`💳 **Out of quota for now**\n\nYour API account has used up its monthly quota.\n\n**Here's what you can do:**\n• 📥 Upload video files directly (no quota needed!)\n• 📊 [Check your usage](https://console.groq.com/settings/billing)\n• ⬆️ Upgrade your plan for more quota\n\nDirect file uploads are the way to go! 🚀`);
            showToast('💳 Quota used up', 'Upload files instead', 'warning', 6000);
        }
        // Other errors
        else {
            addAIMessage(`❌ **YouTube URL didn't work**\n\n${formattedError}\n\n**💡 Pro Tip:** Download the video and upload the file directly!\n\n**Why this is better:**\n• ✅ More reliable\n• ✅ Works with any video\n• ✅ No YouTube restrictions\n• ✅ Better quality transcription\n\nJust drag & drop the video file! 🎯`);
            showToast('YouTube issue', 'Try uploading the file', 'info', 5000);
        }
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

// Message limit configuration
const MESSAGE_LIMIT = 30;
const MESSAGE_WARNING_THRESHOLD = 25;
let currentMessageCount = 0;

// Update context when result is shown
function setContext(type, id, data) {
    currentContext = { type, id, data };
}

// Show warning when approaching message limit
function showMessageLimitWarning() {
    showToast('💬 Conversation getting long', `${MESSAGE_LIMIT - MESSAGE_WARNING_THRESHOLD} messages left. Consider starting a new conversation soon.`, 'warning', 8000);
}

// Show message when limit is reached
function showMessageLimitReached() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message limit-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="message-bubble limit-bubble">
                <p><strong>💬 Conversation Limit Reached</strong></p>
                <p>You've reached the ${MESSAGE_LIMIT}-message limit for this conversation.</p>
                <p><strong>Why limit messages?</strong></p>
                <ul>
                    <li>✅ Keeps conversations focused and manageable</li>
                    <li>✅ Better AI context and responses</li>
                    <li>✅ Easier to find specific topics later</li>
                </ul>
                <p><strong>Start a new conversation to continue chatting!</strong></p>
                <button class="btn-new-chat" onclick="startNewConversation()">
                    <span>➕</span>
                    <span>Start New Conversation</span>
                </button>
            </div>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    showToast('💬 Message limit reached', 'Please start a new conversation', 'info', 6000);
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

    // Check if message limit is reached
    if (currentMessageCount >= MESSAGE_LIMIT) {
        showMessageLimitReached();
        return;
    }

    // Add user message to chat
    addUserMessage(message);
    currentMessageCount++;

    // Clear input
    userMessageInput.value = '';

    // Show typing indicator (no progress bar for chat)
    const processingMsg = addProcessingMessage('', false);

    try {
        // Send to backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                context_type: currentContext.type,
                context_id: currentContext.id,
                conversation_id: currentConversationId  // Include current conversation ID if exists
            })
        });

        const data = await response.json();

        removeProcessingMessage();

        if (data.success) {
            addAIMessage(data.response);
            currentMessageCount++;

            // Check if approaching message limit
            if (currentMessageCount === MESSAGE_WARNING_THRESHOLD) {
                showMessageLimitWarning();
            }

            // Update current conversation ID if returned from server
            if (data.conversation_id) {
                const isNewConversation = !currentConversationId;
                currentConversationId = data.conversation_id;

                // If this is a new conversation, reload the sidebar to show it
                if (isNewConversation && typeof loadConversations === 'function') {
                    loadConversations();
                }

                // Update active conversation in sidebar
                if (typeof updateActiveConversation === 'function') {
                    updateActiveConversation(currentConversationId);
                }
            }
        } else {
            // Format error from server
            const errorMessage = data.message || 'Unknown error';

            // Check if it's a rate limit error
            if (errorMessage.includes('⏳') || errorMessage.toLowerCase().includes('rate limit')) {
                const waitTimeMatch = errorMessage.match(/(\d+)\s*minute/i);
                const waitTime = waitTimeMatch ? waitTimeMatch[1] : 'a few';

                addAIMessage(`⏳ **Hold on a sec!**\n\nI'm getting a lot of requests right now. Let's take a ${waitTime}-minute breather!\n\n**In the meantime:**\n• You can still browse your previous notes\n• Export your summaries\n• Translate existing content\n\nI'll be ready to chat again in ${waitTime} minutes! ☕`);
                showToast('⏳ Quick break', `Back in ${waitTime} min`, 'warning', 5000);
            }
            // Check if it's a quota error
            else if (errorMessage.includes('💳') || errorMessage.toLowerCase().includes('quota')) {
                addAIMessage(`💳 **Ran out of AI credits**\n\nMy monthly quota is all used up!\n\n**You can still:**\n• View all your processed files\n• Export and translate existing content\n• Wait for next month's quota refresh\n\nTo keep chatting, [upgrade your plan](https://console.groq.com/settings/billing) 🚀`);
                showToast('💳 Out of credits', 'Check billing', 'error', 5000);
            }
            // Generic error
            else {
                addAIMessage(`❌ **Oops!**\n\nI couldn't process your message: ${errorMessage}\n\n**Try:**\n• Sending your message again\n• Keeping it a bit shorter\n• Checking your internet connection\n\nI'm here when you're ready! 💬`);
                showToast('Chat error', 'Try again', 'error', 4000);
            }
        }
    } catch (error) {
        removeProcessingMessage();

        const errorMessage = error.message || 'Network error';

        // Check error type
        if (errorMessage.includes('⏳') || errorMessage.toLowerCase().includes('rate limit')) {
            addAIMessage(`⏳ **Need a moment!**\n\nWe've hit the rate limit. Take a quick break and I'll be ready soon!\n\n☕ Try again in a few minutes.`);
            showToast('⏳ Quick break', 'Back soon', 'warning', 5000);
        } else {
            addAIMessage(`❌ **Connection issue**\n\nCouldn't reach the server. This might be a network problem.\n\n**Try:**\n• Check your internet connection\n• Refresh the page\n• Try again in a moment\n\n${errorMessage}`);
            showToast('Connection error', 'Check network', 'error', 4000);
        }
    }
}

// Update file upload button behavior
let uploadBtnClicked = false;
uploadFileBtn.addEventListener('click', function(e) {
    if (!requireLogin('upload files')) return;
    playSound('click');
    e.preventDefault();
    e.stopPropagation();

    if (uploadBtnClicked) return;
    uploadBtnClicked = true;

    this.blur();
    chatFileInput.click();

    setTimeout(() => {
        uploadBtnClicked = false;
    }, 1000);
});

// When file is selected, process it
let isProcessingFile = false;
chatFileInput.addEventListener('change', function(e) {
    if (isProcessingFile) return;

    if (this.files.length > 0) {
        isProcessingFile = true;
        handleFileSelection(this.files[0]);

        setTimeout(() => {
            this.value = '';
            isProcessingFile = false;
        }, 500);
    }
});

// Update cancel URL button
document.getElementById('cancelUrl').addEventListener('click', () => {
    chatUrlInput.style.display = 'none';
    chatTextInput.style.display = 'flex';
    youtubeUrl.value = '';
});

// Note: YouTube button handler is defined earlier with auth check
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

        if (diff > 100) {
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

// ============== ERROR TESTING FUNCTIONS ==============
// These functions simulate various error scenarios for testing
// Toggle test panel with Ctrl+Shift+T
// ONLY AVAILABLE IN LOCAL DEVELOPMENT

// Check if we're running locally
const isLocalhost = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname === '[::1]' ||
                    window.location.hostname.includes('local');

// Toggle test panel
const errorTestPanel = document.getElementById('errorTestPanel');
const closeTestPanelBtn = document.getElementById('closeTestPanel');

// Only enable test panel in local development
if (!isLocalhost && errorTestPanel) {
    // Remove the test panel from production
    errorTestPanel.remove();
    console.log('🔒 Error testing panel disabled (production mode)');
} else if (isLocalhost && errorTestPanel) {
    console.log('🧪 Error testing panel enabled (localhost). Press Ctrl+Shift+T to open.');
}

// Keyboard shortcut: Ctrl+Shift+T (only works on localhost)
document.addEventListener('keydown', (e) => {
    // Only enable shortcuts if running locally
    if (!isLocalhost) return;

    // Toggle with Ctrl+Shift+T
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        if (errorTestPanel && errorTestPanel.style.display === 'none') {
            errorTestPanel.style.display = 'block';
            playSound('click');
        } else if (errorTestPanel) {
            errorTestPanel.style.display = 'none';
        }
    }

    // Close with Escape key
    if (e.key === 'Escape' && errorTestPanel && errorTestPanel.style.display === 'block') {
        errorTestPanel.style.display = 'none';
        playSound('click');
    }
});

// Close button
if (closeTestPanelBtn) {
    closeTestPanelBtn.addEventListener('click', () => {
        errorTestPanel.style.display = 'none';
        playSound('click');
    });
}

// Close when clicking on backdrop
if (errorTestPanel) {
    errorTestPanel.addEventListener('click', (e) => {
        // Only close if clicking on the backdrop itself, not the panel content
        if (e.target === errorTestPanel) {
            errorTestPanel.style.display = 'none';
            playSound('click');
        }
    });
}

// File Upload Error Tests
function testFileRateLimit() {
    if (!isLocalhost) return; // Only works on localhost
    playSound('click');
    const error = { message: "⏳ AssemblyAI rate limit reached. Please wait 3 minutes and try again, or upgrade your plan at https://www.assemblyai.com/pricing for higher limits." };

    addProcessingMessage('Processing...', true);
    setTimeout(() => {
        removeProcessingMessage();

        const waitTimeMatch = error.message.match(/(\d+)\s*minute/i);
        const waitTime = waitTimeMatch ? waitTimeMatch[1] : 'a few';

        addAIMessage(`⏳ **Whoa, slow down there!**\n\nLooks like we've used up our API requests for now. No worries though!\n\n**What's happening?**\nOur AI service has a limit on how many requests we can make.\n\n**What to do:**\n• ☕ Take a ${waitTime}-minute coffee break and try again\n• ⚡ Want instant access? [Upgrade your plan](https://console.groq.com/settings/billing)\n• 🎯 Meanwhile, you can still work with files you've already processed!\n\nThanks for your patience! 😊`);
        showToast('⏳ Taking a quick break', `Back in ${waitTime} minutes`, 'warning', 6000);
    }, 1500);
}

function testFileQuota() {
    if (!isLocalhost) return; // Only works on localhost
    playSound('click');
    const error = { message: "💳 AssemblyAI quota exceeded. Please check your account balance at https://www.assemblyai.com/app/account" };

    addProcessingMessage('Processing...', true);
    setTimeout(() => {
        removeProcessingMessage();

        addAIMessage(`💳 **Oops! We're out of credits**\n\nYour API account has run out of quota for this month.\n\n**Here's what you can do:**\n• 📊 [Check your usage](https://console.groq.com/settings/billing)\n• ⬆️ Upgrade your plan for more quota\n• 📅 Wait until next month for quota reset\n\nDon't worry - your processed files are safe! 🔒`);
        showToast('💳 Quota used up', 'Check your account', 'error', 6000);
    }, 1500);
}

function testFileAuth() {
    if (!isLocalhost) return; // Only works on localhost
    playSound('click');
    const error = { message: "🔑 Authentication error. Please check your AssemblyAI API key configuration." };

    addProcessingMessage('Processing...', true);
    setTimeout(() => {
        removeProcessingMessage();

        addAIMessage(`🔑 **Authentication Issue**\n\nHmm, there's a problem with the API connection.\n\n**This usually means:**\n• The API key might need to be updated\n• There might be a configuration issue\n\n**What to do:**\nPlease contact the app administrator. This isn't something you can fix on your end. 🛠️`);
        showToast('🔑 Connection issue', 'Contact support', 'error', 6000);
    }, 1500);
}

function testFileGeneric() {
    if (!isLocalhost) return; // Only works on localhost
    playSound('click');
    const error = { message: "File format not supported. Please use MP3, WAV, or M4A files." };

    addProcessingMessage('Processing...', true);
    setTimeout(() => {
        removeProcessingMessage();

        addAIMessage(`❌ **Oops! Something went wrong**\n\n${error.message}\n\n**Quick fixes to try:**\n• 🔄 Try uploading again\n• 📁 Make sure your file is a valid format\n• ⏱️ If it's a large file, try a shorter one\n• 🌐 Check your internet connection\n\nStill having issues? Let us know! 💬`);
        showToast('⚠️ Processing failed', 'Try again', 'error', 5000);
    }, 1500);
}

// YouTube Error Tests
function testYoutubeRateLimit() {
    if (!isLocalhost) return; // Only works on localhost
    playSound('click');
    const error = { message: "⏳ Rate limit reached. Please try again in 5 minutes." };

    addUserMessage('YouTube video', { icon: '🎬', name: 'https://youtu.be/test', size: '' });
    addProcessingMessage('Processing...', false);

    setTimeout(() => {
        removeProcessingMessage();

        const waitTimeMatch = error.message.match(/(\d+)\s*minute/i);
        const waitTime = waitTimeMatch ? waitTimeMatch[1] : 'a few';

        addAIMessage(`⏳ **Taking a breather...**\n\nWe've hit the rate limit for now, but don't worry!\n\n**Alternative options:**\n• ☕ Wait ${waitTime} minutes and paste the URL again\n• 📥 Download the video and upload the file directly instead\n• ⚡ [Upgrade your plan](https://console.groq.com/settings/billing) for unlimited access\n\nFile uploads work great and don't have this limit! 🎬`);
        showToast('⏳ Rate limit reached', `Try again in ${waitTime} min`, 'warning', 6000);
    }, 1000);
}

function testYoutubeQuota() {
    if (!isLocalhost) return; // Only works on localhost
    playSound('click');
    const error = { message: "💳 API quota exceeded." };

    addUserMessage('YouTube video', { icon: '🎬', name: 'https://youtu.be/test', size: '' });
    addProcessingMessage('Processing...', false);

    setTimeout(() => {
        removeProcessingMessage();

        addAIMessage(`💳 **Out of quota for now**\n\nYour API account has used up its monthly quota.\n\n**Here's what you can do:**\n• 📥 Upload video files directly (no quota needed!)\n• 📊 [Check your usage](https://console.groq.com/settings/billing)\n• ⬆️ Upgrade your plan for more quota\n\nDirect file uploads are the way to go! 🚀`);
        showToast('💳 Quota used up', 'Upload files instead', 'warning', 6000);
    }, 1000);
}

function testYoutubeGeneric() {
    if (!isLocalhost) return; // Only works on localhost
    playSound('click');
    const error = { message: "⚠️ This video has transcripts disabled." };

    addUserMessage('YouTube video', { icon: '🎬', name: 'https://youtu.be/test', size: '' });
    addProcessingMessage('Processing...', false);

    setTimeout(() => {
        removeProcessingMessage();

        addAIMessage(`❌ **YouTube URL didn't work**\n\n${error.message}\n\n**💡 Pro Tip:** Download the video and upload the file directly!\n\n**Why this is better:**\n• ✅ More reliable\n• ✅ Works with any video\n• ✅ No YouTube restrictions\n• ✅ Better quality transcription\n\nJust drag & drop the video file! 🎯`);
        showToast('YouTube issue', 'Try uploading the file', 'info', 5000);
    }, 1000);
}

// Chat Error Tests
function testChatRateLimit() {
    if (!isLocalhost) return; // Only works on localhost
    playSound('click');
    addUserMessage('Can you summarize the key points?');

    addProcessingMessage('', false);

    setTimeout(() => {
        removeProcessingMessage();

        const waitTime = '5';
        addAIMessage(`⏳ **Hold on a sec!**\n\nI'm getting a lot of requests right now. Let's take a ${waitTime}-minute breather!\n\n**In the meantime:**\n• You can still browse your previous notes\n• Export your summaries\n• Translate existing content\n\nI'll be ready to chat again in ${waitTime} minutes! ☕`);
        showToast('⏳ Quick break', `Back in ${waitTime} min`, 'warning', 5000);
    }, 800);
}

function testChatQuota() {
    if (!isLocalhost) return; // Only works on localhost
    playSound('click');
    addUserMessage('What are the action items?');

    addProcessingMessage('', false);

    setTimeout(() => {
        removeProcessingMessage();

        addAIMessage(`💳 **Ran out of AI credits**\n\nMy monthly quota is all used up!\n\n**You can still:**\n• View all your processed files\n• Export and translate existing content\n• Wait for next month's quota refresh\n\nTo keep chatting, [upgrade your plan](https://console.groq.com/settings/billing) 🚀`);
        showToast('💳 Out of credits', 'Check billing', 'error', 5000);
    }, 800);
}

function testChatGeneric() {
    if (!isLocalhost) return; // Only works on localhost
    playSound('click');
    addUserMessage('Tell me more about this');

    addProcessingMessage('', false);

    setTimeout(() => {
        removeProcessingMessage();

        addAIMessage(`❌ **Oops!**\n\nI couldn't process your message: Network connection error\n\n**Try:**\n• Sending your message again\n• Keeping it a bit shorter\n• Checking your internet connection\n\nI'm here when you're ready! 💬`);
        showToast('Chat error', 'Try again', 'error', 4000);
    }, 800);
}

// Translation Error Tests
function testTranslationRateLimit() {
    if (!isLocalhost) return; // Only works on localhost
    playSound('click');
    showToast('⏳ Translation paused', 'Try again in a few minutes', 'warning', 5000);
}

function testTranslationQuota() {
    if (!isLocalhost) return; // Only works on localhost
    playSound('click');
    showToast('💳 Out of quota', 'Translation temporarily unavailable', 'warning', 5000);
}
