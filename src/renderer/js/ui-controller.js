/**
 * UI Controller - User Interface Management
 * 
 * This module handles all UI updates and user interface interactions.
 * Responsibilities:
 * - Update UI elements with real-time data
 * - Manage transcription display
 * - Handle sentiment and insights visualization
 * - Control tab switching and animations
 * - Provide user feedback and notifications
 */

class UIController {
    constructor() {
        this.transcriptionContainer = null;
        this.sentimentIndicator = null;
        this.keywordsContainer = null;
        this.actionItemsContainer = null;
        
        // UI state
        this.transcriptionText = '';
        this.maxTranscriptionLines = 50;
    }

    /**
     * Initialize UI controller
     */
    init() {
        console.log('Initializing UI Controller...');
        
        // Get UI element references
        this.transcriptionContainer = document.getElementById('transcription-container');
        this.sentimentIndicator = document.getElementById('sentiment-indicator');
        this.keywordsContainer = document.getElementById('keywords-cloud');
        this.actionItemsContainer = document.getElementById('action-items-list');
        
        // Set up UI event listeners
        this.setupEventListeners();
        
        console.log('UI Controller initialized');
    }

    /**
     * Set up additional UI event listeners
     */
    setupEventListeners() {
        // Clear transcription button
        const clearBtn = document.getElementById('clear-transcription');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearTranscription();
            });
        }
    }

    /**
     * Show welcome message
     */
    showWelcomeMessage() {
        if (this.transcriptionContainer) {
            this.transcriptionContainer.innerHTML = `
                <div class="welcome-message">
                    <h3>Welcome to ScrumAI Meeting Assistant</h3>
                    <p>Click "Start Meeting" to begin recording and AI analysis.</p>
                    <ul>
                        <li>🎤 Real-time audio processing</li>
                        <li>📝 Live transcription</li>
                        <li>😊 Sentiment analysis</li>
                        <li>🔍 Keyword extraction</li>
                        <li>✅ Action item detection</li>
                    </ul>
                </div>
            `;
        }
    }

    /**
     * Add new transcription text
     */
    addTranscription(text) {
        if (!this.transcriptionContainer || !text) return;
        
        const timestamp = new Date().toLocaleTimeString();
        
        // Create transcription entry
        const entry = document.createElement('div');
        entry.className = 'transcription-entry';
        entry.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="text">${this.escapeHtml(text)}</span>
        `;
        
        // Add to container
        this.transcriptionContainer.appendChild(entry);
        
        // Keep track of text for export
        this.transcriptionText += `[${timestamp}] ${text}\n`;
        
        // Limit number of entries
        this.limitTranscriptionEntries();
        
        // Auto-scroll to bottom
        this.scrollToBottom();
    }

    /**
     * Update sentiment indicator
     */
    updateSentiment(sentiment, score = 0) {
        if (!this.sentimentIndicator) return;
        
        const sentimentLabel = document.getElementById('sentiment-label');
        
        // Update indicator color and position
        let color, position, label;
        
        switch (sentiment) {
            case 'positive':
                color = '#10b981'; // green
                position = Math.min(85, 50 + (score * 35)); // 50-85%
                label = 'Positive';
                break;
            case 'negative':
                color = '#ef4444'; // red
                position = Math.max(15, 50 + (score * 35)); // 15-50%
                label = 'Negative';
                break;
            default:
                color = '#6b7280'; // gray
                position = 50;
                label = 'Neutral';
        }
        
        this.sentimentIndicator.style.backgroundColor = color;
        this.sentimentIndicator.style.left = `${position}%`;
        
        if (sentimentLabel) {
            sentimentLabel.textContent = label;
        }
        
        // Add to sentiment history
        this.addSentimentHistory(sentiment, score);
    }

    /**
     * Add sentiment to history display
     */
    addSentimentHistory(sentiment, score) {
        const historyContainer = document.getElementById('sentiment-history');
        if (!historyContainer) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `sentiment-history-item ${sentiment}`;
        entry.innerHTML = `
            <span class="time">${timestamp}</span>
            <span class="sentiment">${sentiment}</span>
            <span class="score">${score ? score.toFixed(2) : 'N/A'}</span>
        `;
        
        historyContainer.appendChild(entry);
        
        // Limit history entries
        const entries = historyContainer.children;
        if (entries.length > 10) {
            historyContainer.removeChild(entries[0]);
        }
    }

    /**
     * Update keywords display
     */
    updateKeywords(keywords) {
        if (!this.keywordsContainer || !keywords || keywords.length === 0) return;
        
        // Clear existing keywords
        this.keywordsContainer.innerHTML = '';
        
        // Add keywords as tags
        keywords.forEach((keyword, index) => {
            const tag = document.createElement('span');
            tag.className = 'keyword-tag';
            tag.textContent = keyword;
            
            // Add some visual variety
            tag.style.animationDelay = `${index * 0.1}s`;
            
            this.keywordsContainer.appendChild(tag);
        });
    }

    /**
     * Update action items display
     */
    updateActionItems(actionItems) {
        if (!this.actionItemsContainer || !actionItems || actionItems.length === 0) return;
        
        // Clear existing items
        this.actionItemsContainer.innerHTML = '';
        
        if (actionItems.length === 0) {
            this.actionItemsContainer.innerHTML = '<p class="placeholder-text">No action items detected yet...</p>';
            return;
        }
        
        // Add action items
        actionItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'action-item';
            itemElement.innerHTML = `
                <div class="action-item-header">
                    <span class="priority ${item.priority || 'medium'}">${item.priority || 'medium'}</span>
                    <span class="timestamp">${new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="action-item-text">${this.escapeHtml(item.text)}</div>
            `;
            
            this.actionItemsContainer.appendChild(itemElement);
        });
    }

    /**
     * Update mute button state
     */
    updateMuteButton(isEnabled) {
        const muteBtn = document.getElementById('mute-btn');
        if (!muteBtn) return;
        
        const icon = muteBtn.querySelector('.btn-icon');
        if (icon) {
            icon.textContent = isEnabled ? '🔊' : '🔇';
        }
        
        muteBtn.classList.toggle('muted', !isEnabled);
    }

    /**
     * Get current transcription text for export
     */
    getTranscriptionText() {
        return this.transcriptionText;
    }

    /**
     * Clear transcription display
     */
    clearTranscription() {
        if (this.transcriptionContainer) {
            this.transcriptionContainer.innerHTML = '<p class="placeholder-text">Transcription cleared...</p>';
        }
        this.transcriptionText = '';
    }

    /**
     * Limit transcription entries to prevent memory issues
     */
    limitTranscriptionEntries() {
        if (!this.transcriptionContainer) return;
        
        const entries = this.transcriptionContainer.getElementsByClassName('transcription-entry');
        
        while (entries.length > this.maxTranscriptionLines) {
            this.transcriptionContainer.removeChild(entries[0]);
        }
    }

    /**
     * Auto-scroll transcription to bottom
     */
    scrollToBottom() {
        if (this.transcriptionContainer) {
            this.transcriptionContainer.scrollTop = this.transcriptionContainer.scrollHeight;
        }
    }

    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Update connection status indicators
     */
    updateConnectionStatus(dbConnected = false, aiReady = true) {
        const dbStatus = document.getElementById('db-status');
        const aiStatus = document.getElementById('ai-status');
        
        if (dbStatus) {
            dbStatus.textContent = dbConnected ? '🔗 Database: Connected' : '🔗 Database: Offline';
            dbStatus.className = dbConnected ? 'status-indicator connected' : 'status-indicator disconnected';
        }
        
        if (aiStatus) {
            aiStatus.textContent = aiReady ? '🧠 AI: Ready' : '🧠 AI: Loading';
            aiStatus.className = aiReady ? 'status-indicator connected' : 'status-indicator disconnected';
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show loading state
     */
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.querySelector('p').textContent = message;
            overlay.classList.remove('hidden');
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    /**
     * Cleanup UI controller
     */
    cleanup() {
        console.log('Cleaning up UI Controller...');
        // Clear any intervals or timers if needed
        console.log('UI Controller cleanup complete');
    }
}
