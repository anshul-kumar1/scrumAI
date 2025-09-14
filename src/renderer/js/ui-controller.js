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

export class UIController {
    constructor() {
        this.transcriptionContainer = null;
        this.sentimentIndicator = null;
        this.keywordsContainer = null;
        this.actionItemsContainer = null;
        
        // UI state
        // State tracking for keywords
        this.keywords = new Map(); // keyword -> {frequency, importance, contexts, lastSeen}
        this.recentSpeechSegments = [];
        this.maxRecentSegments = 5;
        this.fullTranscription = '';
    }

    /**
     * Initialize UI controller
     */
    init() {
        console.log('Initializing UI Controller...');
        
        // Get UI element references
        // Initialize containers
        this.keywordsContainer = document.getElementById('keywords-container');
        this.recentSpeechContainer = document.getElementById('recent-speech-text');
        this.sentimentIndicator = document.getElementById('sentiment-indicator');
        this.keywordsCloudContainer = document.getElementById('keywords-cloud');
        this.actionItemsContainer = document.getElementById('action-items-list');
        
        // Set up UI event listeners
        this.setupEventListeners();
        
        console.log('UI Controller initialized');
    }

    /**
     * Set up additional UI event listeners
     */
    setupEventListeners() {
        // Clear keywords button
        const clearBtn = document.getElementById('clear-keywords');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearTranscription();
            });
        }
        
        // View full transcript button
        const viewTranscriptBtn = document.getElementById('view-full-transcript');
        if (viewTranscriptBtn) {
            viewTranscriptBtn.addEventListener('click', () => {
                this.showFullTranscript();
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
     * Process new transcription text and extract keywords
     */
    addTranscription(text) {
        if (!text) return;
        
        const timestamp = new Date().toLocaleTimeString();
        
        // Add to full transcription
        this.fullTranscription += `[${timestamp}] ${text}\n`;
        
        // Add to recent speech
        this.addRecentSpeech(text, timestamp);
        
        // Extract and process keywords
        this.processKeywords(text);
        
        // Update UI stats
        this.updateStats();
    }

    /**
     * Add text to recent speech display
     */
    addRecentSpeech(text, timestamp) {
        if (!this.recentSpeechContainer) return;
        
        // Add new segment
        this.recentSpeechSegments.unshift({ text, timestamp });
        
        // Limit segments
        if (this.recentSpeechSegments.length > this.maxRecentSegments) {
            this.recentSpeechSegments = this.recentSpeechSegments.slice(0, this.maxRecentSegments);
        }
        
        // Update display
        this.renderRecentSpeech();
    }

    /**
     * Render recent speech segments
     */
    renderRecentSpeech() {
        if (!this.recentSpeechContainer) return;
        
        if (this.recentSpeechSegments.length === 0) {
            this.recentSpeechContainer.innerHTML = '<p class="placeholder-text">Recent words will appear here...</p>';
            return;
        }
        
        const html = this.recentSpeechSegments.map(segment => `
            <div class="speech-segment">
                <span class="timestamp">[${segment.timestamp}]</span>
                ${this.escapeHtml(segment.text)}
            </div>
        `).join('');
        
        this.recentSpeechContainer.innerHTML = html;
    }

    /**
     * Process text to extract keywords
     */
    processKeywords(text) {
        // Simple keyword extraction (can be enhanced with NLP)
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !this.isStopWord(word));
        
        const now = Date.now();
        
        words.forEach(word => {
            if (this.keywords.has(word)) {
                const keywordData = this.keywords.get(word);
                keywordData.frequency += 1;
                keywordData.lastSeen = now;
                keywordData.contexts.push(text.substring(0, 100));
            } else {
                this.keywords.set(word, {
                    frequency: 1,
                    importance: this.calculateImportance(word),
                    contexts: [text.substring(0, 100)],
                    lastSeen: now
                });
            }
        });
        
        this.renderKeywords();
    }

    /**
     * Calculate keyword importance based on various factors
     */
    calculateImportance(word) {
        // Business/technical terms get higher importance
        const highImportanceTerms = ['project', 'deadline', 'budget', 'client', 'requirement', 'issue', 'priority', 'task', 'goal', 'strategy', 'meeting', 'decision', 'action', 'timeline', 'deliverable'];
        const mediumImportanceTerms = ['team', 'discussion', 'update', 'status', 'review', 'feedback', 'question', 'problem', 'solution', 'plan'];
        
        if (highImportanceTerms.includes(word)) return 'high';
        if (mediumImportanceTerms.includes(word)) return 'medium';
        return 'low';
    }

    /**
     * Check if word is a stop word
     */
    isStopWord(word) {
        const stopWords = ['this', 'that', 'with', 'have', 'will', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'];
        return stopWords.includes(word);
    }

    /**
     * Render keywords as interactive elements
     */
    renderKeywords() {
        if (!this.keywordsContainer) return;
        
        if (this.keywords.size === 0) {
            this.keywordsContainer.innerHTML = '<p class="placeholder-text">Start a meeting to see key topics and insights...</p>';
            return;
        }
        
        // Sort keywords by frequency and importance
        const sortedKeywords = Array.from(this.keywords.entries())
            .sort(([, a], [, b]) => {
                const importanceWeight = { high: 3, medium: 2, low: 1 };
                const scoreA = a.frequency * importanceWeight[a.importance];
                const scoreB = b.frequency * importanceWeight[b.importance];
                return scoreB - scoreA;
            });
        
        const html = sortedKeywords.map(([word, data]) => `
            <div class="keyword-item ${data.importance}-importance" 
                 data-keyword="${word}" 
                 onclick="window.uiController.selectKeyword(this, '${word}')">
                ${this.escapeHtml(word)}
                ${data.frequency > 1 ? `<span class="keyword-frequency">${data.frequency}</span>` : ''}
            </div>
        `).join('');
        
        this.keywordsContainer.innerHTML = html;
    }

    /**
     * Select a keyword and show its details below
     */
    selectKeyword(element, word) {
        // Remove selection from all keywords
        document.querySelectorAll('.keyword-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to clicked keyword
        element.classList.add('selected');
        
        const keywordData = this.keywords.get(word);
        if (!keywordData) return;
        
        const detailsPanel = document.getElementById('keyword-details');
        if (!detailsPanel) return;
        
        const definition = keywordData.definition || 'No definition available';
        const relatedTerms = keywordData.relatedTerms || [];
        const totalMentions = keywordData.frequency;
        const importance = keywordData.importance;
        
        // Create contexts HTML
        const contextsHtml = keywordData.contexts.length > 0
            ? `<h5>Recent Mentions</h5>
               ${keywordData.contexts.slice(-3).map(context => 
                   `<div class="context-example">"${this.escapeHtml(context)}"</div>`
               ).join('')}`
            : '';
        
        // Create related terms HTML
        const relatedTermsHtml = relatedTerms.length > 0
            ? `<h5>Related Terms</h5>
               ${relatedTerms.map(term => `<span class="related-tag">${this.escapeHtml(term)}</span>`).join('')}`
            : '';
        
        // Update the details panel
        detailsPanel.querySelector('.details-title').textContent = word;
        detailsPanel.querySelector('.details-definition').textContent = definition;
        detailsPanel.querySelector('.details-contexts').innerHTML = contextsHtml;
        detailsPanel.querySelector('.details-related').innerHTML = relatedTermsHtml;
        detailsPanel.querySelector('.details-stats').innerHTML = `
            <div class="detail-stat">
                <div class="detail-stat-value">${totalMentions}</div>
                <div class="detail-stat-label">Mentions</div>
            </div>
            <div class="detail-stat">
                <div class="detail-stat-value">${importance}</div>
                <div class="detail-stat-label">Priority</div>
            </div>
            <div class="detail-stat">
                <div class="detail-stat-value">${keywordData.contexts.length}</div>
                <div class="detail-stat-label">Contexts</div>
            </div>
        `;
        
        // Show the details panel
        detailsPanel.classList.remove('hidden');
        
        // Scroll the selected keyword into view
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    /**
     * Update statistics display
     */
    updateStats() {
        const keywordCountEl = document.getElementById('keyword-count');
        const topicCountEl = document.getElementById('topic-count');
        
        if (keywordCountEl) {
            keywordCountEl.textContent = this.keywords.size;
        }
        
        if (topicCountEl) {
            // Count unique high-importance keywords as topics
            const topics = Array.from(this.keywords.values()).filter(data => data.importance === 'high').length;
            topicCountEl.textContent = topics;
        }
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
        return this.fullTranscription;
    }

    /**
     * Clear all transcription data
     */
    clearTranscription() {
        // Clear keywords
        this.keywords.clear();
        this.recentSpeechSegments = [];
        this.fullTranscription = '';
        
        // Reset UI
        if (this.keywordsContainer) {
            this.keywordsContainer.innerHTML = '<p class="placeholder-text">Start a meeting to see keywords...</p>';
        }
        
        if (this.recentSpeechContainer) {
            this.recentSpeechContainer.innerHTML = '<p class="placeholder-text">Recent words will appear here...</p>';
        }
        
        // Hide details panel
        const detailsPanel = document.getElementById('keyword-details');
        if (detailsPanel) {
            detailsPanel.classList.add('hidden');
        }
        
        // Reset stats
        this.updateStats();
    }

    /**
     * Show full transcript in a modal or new window
     */
    showFullTranscript() {
        if (!this.fullTranscription) {
            alert('No transcription available yet.');
            return;
        }
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const modal = document.createElement('div');
        modal.className = 'transcript-modal';
        modal.style.cssText = `
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 20px;
            max-width: 80%;
            max-height: 80%;
            overflow-y: auto;
            color: #ffffff;
        `;
        
        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0; color: #ffffff;">Full Transcript</h2>
                <button onclick="this.closest('.modal-overlay').remove()" style="
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 12px;
                    cursor: pointer;
                ">Close</button>
            </div>
            <div style="
                background: #111;
                border: 1px solid #333;
                border-radius: 8px;
                padding: 16px;
                white-space: pre-wrap;
                font-family: monospace;
                font-size: 13px;
                line-height: 1.5;
                color: #e5e7eb;
            ">${this.escapeHtml(this.fullTranscription)}</div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
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
     * Add participant to the UI
     */
    addParticipant(participant) {
        const participantsList = document.getElementById('participants-list');
        if (!participantsList) return;

        const participantElement = document.createElement('div');
        participantElement.className = 'participant-item';
        participantElement.dataset.participantId = participant.id;
        
        participantElement.innerHTML = `
            <div class="participant-avatar">${participant.avatar || '👤'}</div>
            <div class="participant-info">
                <span class="participant-name">${participant.name}</span>
                <span class="participant-role">${participant.role || ''}</span>
                <span class="participant-status">${participant.status || 'Listening'}</span>
            </div>
            <div class="participant-indicators">
                <span class="activity-indicator ${participant.isActive ? 'active' : ''}"></span>
            </div>
        `;
        
        participantsList.appendChild(participantElement);
    }

    /**
     * Remove participant from the UI
     */
    removeParticipant(participantId) {
        const participantElement = document.querySelector(`[data-participant-id="${participantId}"]`);
        if (participantElement) {
            participantElement.remove();
        }
    }

    /**
     * Update participant status
     */
    updateParticipantStatus(participantId, status, isActive = false) {
        const participantElement = document.querySelector(`[data-participant-id="${participantId}"]`);
        if (!participantElement) return;

        const statusElement = participantElement.querySelector('.participant-status');
        const indicatorElement = participantElement.querySelector('.activity-indicator');
        
        if (statusElement) statusElement.textContent = status;
        if (indicatorElement) {
            indicatorElement.classList.toggle('active', isActive);
        }
    }

    /**
     * Clear all participants
     */
    clearParticipants() {
        const participantsList = document.getElementById('participants-list');
        if (participantsList) {
            participantsList.innerHTML = '';
        }
    }

    /**
     * Initialize with mock keywords for UI development
     */
    initializeMockKeywords() {
        // Add comprehensive demo keywords with rich context
        const mockKeywords = [
            { 
                text: 'project timeline', 
                importance: 'high', 
                frequency: 4,
                contexts: [
                    'We need to review the project timeline for Q2 deliverables',
                    'The project timeline has shifted due to client feedback',
                    'Sarah mentioned concerns about the project timeline during standup'
                ],
                definition: 'A schedule of planned activities and milestones for project completion',
                relatedTerms: ['milestone', 'deadline', 'deliverable', 'sprint']
            },
            { 
                text: 'budget constraints', 
                importance: 'high', 
                frequency: 3,
                contexts: [
                    'Budget constraints are affecting our hiring plans',
                    'We need to work within budget constraints for the next quarter'
                ],
                definition: 'Financial limitations that restrict project scope or resource allocation',
                relatedTerms: ['cost', 'funding', 'resources', 'ROI']
            },
            { 
                text: 'client requirements', 
                importance: 'high', 
                frequency: 5,
                contexts: [
                    'The client requirements have changed significantly since last week',
                    'We need to clarify client requirements before proceeding',
                    'Client requirements include mobile responsiveness and accessibility'
                ],
                definition: 'Specific needs and expectations defined by the client for project delivery',
                relatedTerms: ['specifications', 'scope', 'deliverables', 'acceptance criteria']
            },
            { 
                text: 'team collaboration', 
                importance: 'medium', 
                frequency: 2,
                contexts: [
                    'Team collaboration tools need to be updated',
                    'Better team collaboration will improve our velocity'
                ],
                definition: 'The process of team members working together effectively to achieve common goals',
                relatedTerms: ['communication', 'teamwork', 'coordination', 'synergy']
            },
            { 
                text: 'technical debt', 
                importance: 'high', 
                frequency: 2,
                contexts: [
                    'We need to address technical debt in the authentication system',
                    'Technical debt is slowing down our development velocity'
                ],
                definition: 'The implied cost of additional rework caused by choosing quick solutions over better approaches',
                relatedTerms: ['refactoring', 'code quality', 'maintenance', 'architecture']
            },
            { 
                text: 'user experience', 
                importance: 'high', 
                frequency: 3,
                contexts: [
                    'User experience testing revealed several pain points',
                    'The new design significantly improves user experience',
                    'Alex is leading the user experience optimization initiative'
                ],
                definition: 'The overall experience of a person using a product or service',
                relatedTerms: ['UX', 'usability', 'interface', 'design', 'accessibility']
            },
            { 
                text: 'sprint planning', 
                importance: 'medium', 
                frequency: 2,
                contexts: [
                    'Sprint planning meeting is scheduled for Monday morning',
                    'We need better estimation during sprint planning'
                ],
                definition: 'A collaborative event where the team plans work to be performed during a sprint',
                relatedTerms: ['agile', 'scrum', 'backlog', 'estimation', 'velocity']
            },
            { 
                text: 'performance optimization', 
                importance: 'medium', 
                frequency: 1,
                contexts: [
                    'Performance optimization should be a priority for the next release'
                ],
                definition: 'The process of improving system efficiency and reducing resource consumption',
                relatedTerms: ['speed', 'efficiency', 'scalability', 'monitoring']
            },
            { 
                text: 'security audit', 
                importance: 'high', 
                frequency: 1,
                contexts: [
                    'The security audit identified several vulnerabilities'
                ],
                definition: 'A systematic evaluation of system security measures and potential vulnerabilities',
                relatedTerms: ['vulnerability', 'compliance', 'encryption', 'authentication']
            },
            { 
                text: 'stakeholder feedback', 
                importance: 'medium', 
                frequency: 2,
                contexts: [
                    'Stakeholder feedback has been generally positive',
                    'We need to incorporate stakeholder feedback into the next iteration'
                ],
                definition: 'Input and opinions from individuals or groups with interest in the project outcome',
                relatedTerms: ['requirements', 'approval', 'communication', 'expectations']
            }
        ];
        
        mockKeywords.forEach(mock => {
            this.keywords.set(mock.text, {
                frequency: mock.frequency,
                importance: mock.importance,
                contexts: mock.contexts,
                definition: mock.definition,
                relatedTerms: mock.relatedTerms,
                lastSeen: Date.now()
            });
        });
        
        // Add mock recent speech
        this.recentSpeechSegments = [
            { text: "We need to discuss the project timeline and budget constraints", timestamp: "12:30:15" },
            { text: "The client requirements have changed significantly", timestamp: "12:30:45" },
            { text: "Team collaboration is essential for meeting our deadline", timestamp: "12:31:20" }
        ];
        
        this.renderKeywords();
        this.renderRecentSpeech();
        this.updateStats();
    }

    /**
     * Initialize with mock participants for UI development
     */
    initializeMockParticipants() {
        const mockParticipants = [
            {
                id: 'current-user',
                name: 'You',
                avatar: '👤',
                status: 'Speaking',
                isActive: true
            },
            {
                id: 'user-2',
                name: 'Sarah Johnson',
                avatar: '👩‍💼',
                status: 'Listening',
                isActive: false,
                role: 'Product Manager'
            },
            {
                id: 'user-3',
                name: 'Mike Chen',
                avatar: '👨‍💻',
                status: 'Taking notes',
                isActive: false,
                role: 'Senior Developer'
            },
            {
                id: 'user-4',
                name: 'Alex Rivera',
                avatar: '👨‍🎨',
                status: 'Listening',
                isActive: false,
                role: 'UI/UX Designer'
            },
            {
                id: 'user-5',
                name: 'Emily Davis',
                avatar: '👩‍🔬',
                status: 'Listening',
                isActive: false,
                role: 'Data Scientist'
            },
            {
                id: 'user-6',
                name: 'James Wilson',
                avatar: '👨‍💼',
                status: 'On mute',
                isActive: false,
                role: 'Project Manager'
            },
            {
                id: 'user-7',
                name: 'Lisa Park',
                avatar: '👩‍💻',
                status: 'Typing',
                isActive: false,
                role: 'Frontend Developer'
            },
            {
                id: 'user-8',
                name: 'David Kim',
                avatar: '👨‍🔧',
                status: 'Listening',
                isActive: false,
                role: 'DevOps Engineer'
            },
            {
                id: 'user-9',
                name: 'Maria Garcia',
                avatar: '👩‍📊',
                status: 'Taking notes',
                isActive: false,
                role: 'Business Analyst'
            },
            {
                id: 'user-10',
                name: 'Robert Taylor',
                avatar: '👨‍🏫',
                status: 'Listening',
                isActive: false,
                role: 'Tech Lead'
            }
        ];

        // Clear existing participants first
        this.clearParticipants();
        
        // Add mock participants
        mockParticipants.forEach(participant => {
            this.addParticipant(participant);
        });
    }

    /**
     * Simulate random participant activity for UI development
     */
    simulateParticipantActivity() {
        const participants = document.querySelectorAll('.participant-item');
        const statuses = ['Speaking', 'Listening', 'Taking notes', 'Typing', 'On mute'];
        
        participants.forEach((participantElement, index) => {
            // Skip the current user (first participant)
            if (index === 0) return;
            
            const participantId = participantElement.dataset.participantId;
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const isActive = randomStatus === 'Speaking' && Math.random() > 0.7;
            
            this.updateParticipantStatus(participantId, randomStatus, isActive);
        });
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
