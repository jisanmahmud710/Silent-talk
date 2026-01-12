// SilentTalk - Universal Communication Platform
// Supports deaf, blind, and normal users with TTS, voice input, and visual communication

// ========================================
// FIXED DICTIONARIES
// ========================================
const WHO_EMOJIS = ['👤', '👥', '👉', '👶', '🧓'];
const WHAT_EMOJIS = ['🆘', '🚶', '⏸️', '🍽️', '🚑'];
const EXTRA_EMOJIS = ['📍', '🕒', '🏠', '🌧️', '🔁'];

const WHO_MEANINGS = {
    '👤': 'me',
    '👥': 'us',
    '👉': 'you',
    '👶': 'child',
    '🧓': 'elder'
};

const WHAT_MEANINGS = {
    '🆘': 'need help',
    '🚶': 'walking',
    '⏸️': 'stop / pause',
    '🍽️': 'food',
    '🚑': 'ambulance'
};

const EXTRA_MEANINGS = {
    '📍': 'here',
    '🕒': 'now / soon',
    '🏠': 'home',
    '🌧️': 'outside / rain',
    '🔁': 'again'
};

const EMOTIONS = {
    panic: { color: '#ef4444', label: 'Panic' },
    urgent: { color: '#fb923c', label: 'Urgent' },
    concern: { color: '#facc15', label: 'Concern' },
    calm: { color: '#60a5fa', label: 'Calm' },
    normal: { color: '#22c55e', label: 'Normal' }
};

const REPLY_OPTIONS = {
    understood: { icon: '✅', text: 'I understand', tone: 'success' },
    help: { icon: '🕒', text: 'Help is coming', tone: 'pending' },
    repeat: { icon: '❓', text: 'Please repeat', tone: 'error' },
    cannot: { icon: '❌', text: 'I cannot help', tone: 'error' }
};

// Quick phrase mappings
const QUICK_PHRASES = {
    'help-here': { who: '👤', what: '🆘', extra: '📍' },
    'food-now': { who: '👤', what: '🍽️', extra: '🕒' },
    'ambulance': { who: '👤', what: '🚑', extra: null }
};

// ========================================
// STATE
// ========================================
const state = {
    sentence: {
        who: null,
        what: null,
        extra: null
    },
    emotion: null,
    messageSent: false,
    messageAnswered: false,
    receiverReply: null,
    secretMode: false,
    messageSentWithSecret: false, // Track if current message was sent with secret mode
    darkMode: false,
    messageHistory: [],
    currentTTS: null,
    ttsSpeed: 1.0,
    voiceRecognition: null,
    isListening: false
};

// ========================================
// DOM ELEMENTS
// ========================================
const el = {
    secretModeToggle: document.getElementById('secretModeToggle'),
    darkModeToggle: document.getElementById('darkModeToggle'),
    senderPanel: document.getElementById('senderPanel'),
    receiverPanel: document.getElementById('receiverPanel'),
    senderSequence: document.getElementById('senderSequence'),
    senderClear: document.getElementById('senderClear'),
    senderSend: document.getElementById('senderSend'),
    senderStatus: document.getElementById('senderStatus'),
    senderReplyBox: document.getElementById('senderReplyBox'),
    senderReplySection: document.getElementById('senderReplySection'),
    receiverSequence: document.getElementById('receiverSequence'),
    receiverEmotionView: document.getElementById('receiverEmotionView'),
    translationDisplay: document.getElementById('translationDisplay'),
    translationText: document.getElementById('translationText'),
    replyPanel: document.getElementById('replyPanel'),
    receiverStatus: document.getElementById('receiverStatus'),
    feedbackOverlay: document.getElementById('feedbackOverlay'),
    feedbackMessage: document.getElementById('feedbackMessage'),
    emotionRow: document.getElementById('emotionRow'),
    previewToggle: document.getElementById('previewToggle'),
    previewText: document.getElementById('previewText'),
    receiverMessageCard: document.getElementById('receiverMessageCard'),
    ttsControls: document.getElementById('ttsControls'),
    ttsPlayBtn: document.getElementById('ttsPlayBtn'),
    ttsRepeatBtn: document.getElementById('ttsRepeatBtn'),
    ttsSpeed: document.getElementById('ttsSpeed'),
    ttsSpeedLabel: document.getElementById('ttsSpeedLabel'),
    voiceStartBtn: document.getElementById('voiceStartBtn'),
    voiceStatus: document.getElementById('voiceStatus'),
    voiceTextDisplay: document.getElementById('voiceTextDisplay'),
    voiceTextContent: document.getElementById('voiceTextContent'),
    historySidebar: document.getElementById('historySidebar'),
    historyToggle: document.getElementById('historyToggle'),
    historyClose: document.getElementById('historyClose'),
    historyList: document.getElementById('historyList'),
    quickPhrases: document.getElementById('quickPhrases')
};

// ========================================
// TEXT-TO-SPEECH (TTS) FOR BLIND USERS
// ========================================
function speakText(text, speed = null) {
    // Stop any current speech
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    if (!text || text === '-') return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed || state.ttsSpeed;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US';

    utterance.onstart = () => {
        el.ttsPlayBtn.textContent = '⏸ Pause';
        el.voiceStatus.textContent = 'Speaking...';
    };

    utterance.onend = () => {
        el.ttsPlayBtn.textContent = '🔊 Play';
        el.voiceStatus.textContent = 'Ready';
    };

    utterance.onerror = (e) => {
        console.error('TTS Error:', e);
        el.voiceStatus.textContent = 'TTS Error';
    };

    window.speechSynthesis.speak(utterance);
    state.currentTTS = utterance;
}

function stopTTS() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        el.ttsPlayBtn.textContent = '🔊 Play';
        el.voiceStatus.textContent = 'Ready';
    }
}

// ========================================
// VOICE-TO-TEXT FOR DEAF USERS
// ========================================
function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        el.voiceStatus.textContent = 'Voice input not supported';
        el.voiceStartBtn.disabled = true;
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    state.voiceRecognition = new SpeechRecognition();
    state.voiceRecognition.continuous = false;
    state.voiceRecognition.interimResults = false;
    state.voiceRecognition.lang = 'en-US';

    state.voiceRecognition.onstart = () => {
        state.isListening = true;
        el.voiceStartBtn.textContent = '⏹ Stop';
        el.voiceStatus.textContent = 'Listening...';
        el.voiceStartBtn.classList.add('listening');
    };

    state.voiceRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        el.voiceTextContent.textContent = transcript;
        el.voiceTextDisplay.style.display = 'block';
        el.voiceStatus.textContent = 'Got it!';
        
        // Show transcript in receiver panel for deaf users
        showVoiceTranscript(transcript);
    };

    state.voiceRecognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        el.voiceStatus.textContent = 'Error: ' + event.error;
        state.isListening = false;
        el.voiceStartBtn.textContent = '🎤 Start speaking';
        el.voiceStartBtn.classList.remove('listening');
    };

    state.voiceRecognition.onend = () => {
        state.isListening = false;
        el.voiceStartBtn.textContent = '🎤 Start speaking';
        el.voiceStartBtn.classList.remove('listening');
        if (el.voiceStatus.textContent === 'Listening...') {
            el.voiceStatus.textContent = 'Ready';
        }
    };
}

function startVoiceRecognition() {
    if (state.isListening) {
        stopVoiceRecognition();
        return;
    }

    if (state.voiceRecognition) {
        state.voiceRecognition.start();
    }
}

function stopVoiceRecognition() {
    if (state.voiceRecognition && state.isListening) {
        state.voiceRecognition.stop();
    }
}

function showVoiceTranscript(text) {
    // Display voice input as a message card for deaf users
    const card = el.receiverMessageCard.cloneNode(true);
    card.querySelector('.translation-text').textContent = text;
    card.style.display = 'block';
    // Could add to message history or display prominently
}

// ========================================
// SECRET MODE (ENCODING)
// ========================================
// Warning emojis that indicate "someone is watching"
const SECRET_WARNING_EMOJIS = ['👁️', '👀', '🚨', '⚠️', '🔍'];

function encodeSequence(sequence) {
    if (!state.secretMode) return sequence;
    
    // Replace emojis with warning emojis that indicate "someone is watching me"
    // Use different warning emojis based on position to make it look natural
    return sequence.map((emoji, index) => {
        // Cycle through warning emojis
        const warningIndex = index % SECRET_WARNING_EMOJIS.length;
        return SECRET_WARNING_EMOJIS[warningIndex];
    });
}

function decodeSequence(sequence) {
    // Check if sequence contains secret warning emojis
    const hasSecretEmojis = sequence.some(emoji => SECRET_WARNING_EMOJIS.includes(emoji));
    
    if (hasSecretEmojis) {
        // This is a secret mode message - return as-is for display
        return sequence;
    }
    
    // Not a secret message, return original
    return sequence;
}

function isSecretMessage(sequence) {
    // Check if sequence contains any secret warning emojis
    return sequence.some(emoji => SECRET_WARNING_EMOJIS.includes(emoji));
}

// ========================================
// HELPERS
// ========================================
function requiredNextRole() {
    if (!state.sentence.who) return 'who';
    if (!state.sentence.what) return 'what';
    if (!state.sentence.extra) return 'extra';
    return null;
}

function shakePanel(panel) {
    panel.classList.add('shake-error');
    setTimeout(() => panel.classList.remove('shake-error'), 500);
}

function showStatus(target, message, tone) {
    target.textContent = message || '';
    target.className = 'status-display';
    if (tone) target.classList.add(tone);
}

function translateSentence() {
    // Check if this is a secret mode message (contains warning emojis)
    const parts = [];
    if (state.sentence.who) parts.push(state.sentence.who);
    if (state.sentence.what) parts.push(state.sentence.what);
    if (state.sentence.extra) parts.push(state.sentence.extra);
    
    // Check if the displayed sequence (after encoding) contains secret emojis
    // Use messageSentWithSecret to check if this message was sent with secret mode
    const displayedSequence = state.messageSentWithSecret 
        ? encodeSequence(parts.filter(e => e))
        : parts.filter(e => e);
    
    if (isSecretMessage(displayedSequence)) {
        // This is a secret mode warning message
        return 'Someone is watching me';
    }
    
    // Normal translation
    const w = state.sentence.who ? WHO_MEANINGS[state.sentence.who] : null;
    const a = state.sentence.what ? WHAT_MEANINGS[state.sentence.what] : null;
    const x = state.sentence.extra ? EXTRA_MEANINGS[state.sentence.extra] : null;
    
    if (!w || !a) return '-';
    
    let sentence = '';
    if (a === 'need help') {
        sentence = `${w} need help`;
        if (x) {
            if (x === 'here') sentence += ' here';
            else if (x === 'now / soon') sentence += ' now';
            else if (x === 'home') sentence += ' at home';
            else sentence += ` ${x}`;
        }
    } else {
        const parts = [];
        if (w) parts.push(w);
        if (a) parts.push(a);
        if (x) parts.push(x);
        sentence = parts.join(' ');
    }
    
    return sentence || '-';
}

function renderSenderSentence() {
    const container = el.senderSequence;
    container.innerHTML = '';
    const parts = [];
    if (state.sentence.who) parts.push(state.sentence.who);
    if (state.sentence.what) parts.push(state.sentence.what);
    if (state.sentence.extra) parts.push(state.sentence.extra);
    
    if (!parts.length) {
        container.innerHTML = '<span class="empty-message">Tap symbols to build</span>';
        el.previewText.style.display = 'none';
        return;
    }
    
    parts.forEach(e => {
        const span = document.createElement('span');
        span.className = 'sequence-symbol';
        span.textContent = e;
        container.appendChild(span);
    });
    
    // Update preview
    updatePreview();
}

function updatePreview() {
    const translation = translateSentence();
    if (translation && translation !== '-') {
        el.previewText.textContent = translation.charAt(0).toUpperCase() + translation.slice(1);
        el.previewText.style.display = 'block';
    } else {
        el.previewText.style.display = 'none';
    }
}

function renderReceiverSentence() {
    const container = el.receiverSequence;
    container.innerHTML = '';
    const parts = [];
    if (state.sentence.who) parts.push(state.sentence.who);
    if (state.sentence.what) parts.push(state.sentence.what);
    if (state.sentence.extra) parts.push(state.sentence.extra);
    
    if (!parts.length) {
        container.innerHTML = '<span class="empty-message">Waiting...</span>';
        return;
    }
    
    // If secret mode was used when sending this message, show the encoded warning emojis
    // Otherwise show the original emojis
    const displayedSequence = state.messageSentWithSecret 
        ? encodeSequence(parts.filter(e => e))
        : parts.filter(e => e);
    
    displayedSequence.forEach(e => {
        const span = document.createElement('span');
        span.className = 'sequence-symbol';
        // Add special styling for secret warning emojis
        if (SECRET_WARNING_EMOJIS.includes(e)) {
            span.classList.add('secret-warning');
        }
        span.textContent = e;
        container.appendChild(span);
    });
}

function renderTranslation() {
    const translation = translateSentence();
    el.translationText.innerHTML = '';
    
    if (!state.messageSent || !translation || translation === '-') {
        el.translationText.innerHTML = '<span class="empty-message">Waiting for message...</span>';
        return;
    }

    // Check if this is a secret warning message by looking at what's actually displayed
    // Get the sequence that was sent (which may have been encoded)
    const parts = [];
    if (state.sentence.who) parts.push(state.sentence.who);
    if (state.sentence.what) parts.push(state.sentence.what);
    if (state.sentence.extra) parts.push(state.sentence.extra);
    
    // When secret mode was used, the displayed sequence contains warning emojis
    // Check the actual displayed sequence (what receiver sees)
    const displayedSequence = state.messageSentWithSecret 
        ? encodeSequence(parts.filter(e => e))
        : parts.filter(e => e);
    
    const isSecretWarning = isSecretMessage(displayedSequence);

    let formatted = translation;
    
    // For secret warnings, always show as urgent/panic
    if (isSecretWarning) {
        formatted = `🚨 URGENT: ${translation}`;
        // Force panic emotion color for secret messages
        el.receiverMessageCard.style.borderLeftColor = EMOTIONS.panic.color;
        el.receiverMessageCard.style.borderLeftWidth = '4px';
    } else if (state.emotion) {
        const emotionLabel = EMOTIONS[state.emotion].label;
        formatted = `${emotionLabel.toUpperCase()}: ${translation}`;
    }
    
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    
    const textEl = document.createElement('div');
    textEl.className = 'translation-content';
    if (isSecretWarning) {
        textEl.classList.add('secret-warning-text');
    }
    textEl.textContent = formatted;
    el.translationText.appendChild(textEl);
    
    // Auto-play TTS for blind users
    if (state.messageSent) {
        setTimeout(() => {
            speakText(formatted);
            el.ttsControls.style.display = 'flex';
        }, 300);
    }
}

function renderEmotionViews() {
    el.receiverEmotionView.innerHTML = '';
    if (!state.emotion) {
        el.receiverEmotionView.innerHTML = '<span class="empty-message">No emotion</span>';
        return;
    }
    const def = EMOTIONS[state.emotion];
    const chip = document.createElement('div');
    chip.style.background = def.color;
    chip.style.width = '100%';
    chip.style.height = '32px';
    chip.style.borderRadius = '999px';
    chip.style.boxShadow = '0 0 16px rgba(0,0,0,0.6)';
    chip.title = def.label;
    el.receiverEmotionView.appendChild(chip);
    
    // Apply emotion color to message card background
    if (state.messageSent) {
        el.receiverMessageCard.style.borderLeftColor = def.color;
        el.receiverMessageCard.style.borderLeftWidth = '4px';
    }
}

function renderSenderReply() {
    el.senderReplyBox.innerHTML = '';
    
    if (!state.receiverReply) {
        if (state.messageSent && !state.messageAnswered) {
            el.senderReplyBox.innerHTML = '<span class="empty-message">Waiting for reply...</span>';
            el.senderReplySection.style.display = 'block';
        } else {
            el.senderReplySection.style.display = 'none';
        }
        return;
    }
    
    const replyDef = REPLY_OPTIONS[state.receiverReply];
    const replyEl = document.createElement('div');
    replyEl.className = `sender-reply-item sender-reply-${replyDef.tone}`;
    replyEl.innerHTML = `
        <span class="sender-reply-icon">${replyDef.icon}</span>
        <span class="sender-reply-text">${replyDef.text}</span>
    `;
    el.senderReplyBox.appendChild(replyEl);
    el.senderReplySection.style.display = 'block';
    
    // Speak reply for blind users
    if (state.receiverReply) {
        speakText(replyDef.text);
    }
    
    el.senderReplyBox.classList.add('pulse-reply');
    setTimeout(() => {
        el.senderReplyBox.classList.remove('pulse-reply');
    }, 1000);
}

function addToHistory() {
    const translation = translateSentence();
    if (!translation || translation === '-') return;
    
    const historyItem = {
        id: Date.now(),
        sentence: { ...state.sentence },
        emotion: state.emotion,
        translation: translation,
        reply: state.receiverReply,
        timestamp: new Date().toLocaleTimeString()
    };
    
    state.messageHistory.unshift(historyItem);
    if (state.messageHistory.length > 10) {
        state.messageHistory.pop();
    }
    
    renderHistory();
}

function renderHistory() {
    el.historyList.innerHTML = '';
    
    if (state.messageHistory.length === 0) {
        el.historyList.innerHTML = '<div class="empty-history">No messages yet</div>';
        return;
    }
    
    state.messageHistory.forEach(item => {
        const historyCard = document.createElement('div');
        historyCard.className = 'history-item';
        
        const emojiStr = [item.sentence.who, item.sentence.what, item.sentence.extra]
            .filter(e => e).join(' ');
        
        const emotionColor = item.emotion ? EMOTIONS[item.emotion].color : 'transparent';
        
        historyCard.innerHTML = `
            <div class="history-time">${item.timestamp}</div>
            <div class="history-emojis">${emojiStr}</div>
            <div class="history-translation">${item.translation}</div>
            ${item.reply ? `<div class="history-reply">${REPLY_OPTIONS[item.reply].icon} ${REPLY_OPTIONS[item.reply].text}</div>` : ''}
        `;
        
        historyCard.style.borderLeftColor = emotionColor;
        historyCard.addEventListener('click', () => {
            // Restore message on click
            state.sentence = { ...item.sentence };
            state.emotion = item.emotion;
            renderSenderSentence();
            renderEmotionViews();
        });
        
        el.historyList.appendChild(historyCard);
    });
}

function enableSenderInput(enabled) {
    document.querySelectorAll('.symbol-btn').forEach(btn => {
        btn.disabled = !enabled;
        btn.style.opacity = enabled ? '1' : '0.5';
        btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    });
    document.querySelectorAll('.emotion-dot').forEach(btn => {
        btn.disabled = !enabled;
        btn.style.opacity = enabled ? '1' : '0.5';
        btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    });
    el.senderSend.disabled = !enabled;
    el.senderSend.style.opacity = enabled ? '1' : '0.5';
    el.senderSend.style.cursor = enabled ? 'pointer' : 'not-allowed';
}

// ========================================
// EVENT HANDLERS
// ========================================
function handleEmojiClick(role, emoji) {
    if (state.messageSent && !state.messageAnswered) {
        showStatus(el.senderStatus, 'Waiting for reply...', 'pending');
        return;
    }

    const expected = requiredNextRole();
    if (role !== expected) {
        showStatus(el.senderStatus, 'Order: WHO → WHAT → WHERE/WHEN', 'error');
        shakePanel(el.senderPanel);
        return;
    }

    state.sentence[role] = emoji;
    renderSenderSentence();
    showStatus(el.senderStatus, '', '');
}

function handleQuickPhrase(phraseKey) {
    const phrase = QUICK_PHRASES[phraseKey];
    if (!phrase) return;
    
    state.sentence = {
        who: phrase.who,
        what: phrase.what,
        extra: phrase.extra
    };
    
    renderSenderSentence();
    updatePreview();
}

function handleEmotionClick(key, buttonEl) {
    if (state.messageSent && !state.messageAnswered) return;
    
    state.emotion = key;
    document.querySelectorAll('.emotion-dot').forEach(b => b.classList.remove('selected'));
    buttonEl.classList.add('selected');
}

function clearMessage() {
    state.sentence = { who: null, what: null, extra: null };
    state.emotion = null;
    state.messageSent = false;
    state.messageAnswered = false;
    state.receiverReply = null;
    state.messageSentWithSecret = false;

    renderSenderSentence();
    renderReceiverSentence();
    renderEmotionViews();
    renderTranslation();
    renderSenderReply();
    document.querySelectorAll('.emotion-dot').forEach(b => b.classList.remove('selected'));
    el.replyPanel.style.display = 'none';
    el.receiverMessageCard.style.display = 'none';
    el.ttsControls.style.display = 'none';
    showStatus(el.senderStatus, '', '');
    showStatus(el.receiverStatus, '', '');
    
    stopTTS();
    enableSenderInput(true);
}

function sendMessage() {
    if (!state.sentence.who || !state.sentence.what) {
        showStatus(el.senderStatus, 'Need WHO & WHAT', 'error');
        shakePanel(el.senderPanel);
        return;
    }

    state.messageSent = true;
    state.messageAnswered = false;
    state.receiverReply = null;
    // Track if this message was sent with secret mode
    state.messageSentWithSecret = state.secretMode;
    
    // If secret mode is enabled, the emojis will be encoded when displayed
    // Store the original sentence, encoding happens during rendering
    
    renderReceiverSentence();
    renderEmotionViews();
    renderTranslation();
    el.replyPanel.style.display = 'flex';
    el.receiverMessageCard.style.display = 'block';
    
    renderSenderReply();
    
    // Show different status message for secret mode
    if (state.secretMode) {
        showStatus(el.senderStatus, 'Sent (secret) · waiting for reply', 'pending');
    } else {
        showStatus(el.senderStatus, 'Sent · waiting for reply', 'pending');
    }
    showStatus(el.receiverStatus, 'Choose a reply', 'pending');
    
    enableSenderInput(false);
    addToHistory();
}

function handleReply(replyType) {
    if (!state.messageSent) {
        showStatus(el.receiverStatus, 'No message to reply to', 'error');
        return;
    }
    
    state.receiverReply = replyType;
    state.messageAnswered = true;
    
    const replyDef = REPLY_OPTIONS[replyType];
    
    showStatus(el.receiverStatus, `Replied: ${replyDef.text}`, replyDef.tone);
    renderSenderReply();
    
    if (replyType === 'understood') {
        showFeedback('understood');
        showStatus(el.senderStatus, 'Message understood', 'success');
        el.senderPanel.classList.add('pulse-success');
        setTimeout(() => el.senderPanel.classList.remove('pulse-success'), 1000);
    } else if (replyType === 'help') {
        showStatus(el.senderStatus, 'Help is coming', 'pending');
        el.senderPanel.classList.add('pulse-success');
        setTimeout(() => el.senderPanel.classList.remove('pulse-success'), 1000);
    } else {
        showFeedback('misunderstood');
        showStatus(el.senderStatus, replyDef.text, 'error');
        shakePanel(el.senderPanel);
    }
    
    enableSenderInput(true);
    addToHistory();
    
    setTimeout(() => {
        el.replyPanel.style.display = 'none';
    }, 2000);
}

function showFeedback(type) {
    el.feedbackOverlay.classList.add('active');
    el.feedbackMessage.className = `feedback-message ${type}`;
    el.feedbackMessage.textContent = type === 'understood' ? '✓' : '✗';
    setTimeout(() => el.feedbackOverlay.classList.remove('active'), 1200);
}

function toggleSecretMode() {
    state.secretMode = !state.secretMode;
    el.secretModeToggle.classList.toggle('active', state.secretMode);
    el.secretModeToggle.querySelector('.toggle-label').textContent = `Secret: ${state.secretMode ? 'ON' : 'OFF'}`;
}

function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    document.body.classList.toggle('dark-mode', state.darkMode);
    el.darkModeToggle.classList.toggle('active', state.darkMode);
}

function toggleHistory() {
    el.historySidebar.classList.toggle('open');
}

function togglePreview() {
    const isVisible = el.previewText.style.display !== 'none';
    el.previewText.style.display = isVisible ? 'none' : 'block';
    el.previewToggle.textContent = isVisible ? '👁 Preview' : '👁 Hide';
}

// ========================================
// INITIALIZATION
// ========================================
function init() {
    // Emoji buttons
    document.querySelectorAll('.symbol-btn').forEach(btn => {
        const role = btn.getAttribute('data-role');
        const emoji = btn.getAttribute('data-emoji');
        btn.addEventListener('click', () => handleEmojiClick(role, emoji));
    });

    // Quick phrase buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
        const phraseKey = btn.getAttribute('data-phrase');
        btn.addEventListener('click', () => handleQuickPhrase(phraseKey));
    });

    // Emotion buttons
    el.emotionRow.querySelectorAll('.emotion-dot').forEach(dot => {
        const key = dot.getAttribute('data-emotion');
        dot.addEventListener('click', () => handleEmotionClick(key, dot));
    });

    // Actions
    el.senderClear.addEventListener('click', clearMessage);
    el.senderSend.addEventListener('click', sendMessage);

    // Reply buttons
    document.querySelectorAll('.reply-btn').forEach(btn => {
        const replyType = btn.getAttribute('data-reply');
        btn.addEventListener('click', () => handleReply(replyType));
    });

    // TTS controls
    el.ttsPlayBtn.addEventListener('click', () => {
        if (window.speechSynthesis.speaking) {
            stopTTS();
        } else {
            const text = el.translationText.textContent;
            if (text && text !== 'Waiting for message...') {
                speakText(text);
            }
        }
    });
    
    el.ttsRepeatBtn.addEventListener('click', () => {
        const text = el.translationText.textContent;
        if (text && text !== 'Waiting for message...') {
            speakText(text);
        }
    });
    
    el.ttsSpeed.addEventListener('input', (e) => {
        state.ttsSpeed = parseFloat(e.target.value);
        el.ttsSpeedLabel.textContent = state.ttsSpeed.toFixed(1) + 'x';
    });

    // Voice recognition
    initVoiceRecognition();
    el.voiceStartBtn.addEventListener('click', startVoiceRecognition);

    // Toggles
    el.secretModeToggle.addEventListener('click', toggleSecretMode);
    el.darkModeToggle.addEventListener('click', toggleDarkMode);
    el.previewToggle.addEventListener('click', togglePreview);
    el.historyToggle.addEventListener('click', toggleHistory);
    el.historyClose.addEventListener('click', () => {
        el.historySidebar.classList.remove('open');
    });

    // Initial UI
    clearMessage();
    enableSenderInput(true);
    el.senderReplySection.style.display = 'none';
    el.receiverMessageCard.style.display = 'none';
    renderHistory();
}

document.addEventListener('DOMContentLoaded', init);
