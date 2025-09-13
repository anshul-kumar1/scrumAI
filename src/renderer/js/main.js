/**
 * Main Renderer Process Controller
 * 
 * This is the primary JavaScript file for the renderer process.
 * Responsibilities:
 * - Initialize all UI components and managers
 * - Coordinate between different modules (audio, AI, database)
 * - Handle main application state and event flow
 * - Manage meeting lifecycle and user interactions
 * - Provide centralized error handling and logging
 */

class ScrumAIApp {
    constructor() {
        this.isInitialized = false;
        this.currentMeeting = null;
        this.meetingStartTime = null;
        this.meetingTimer = null;
        
        // Component instances
        this.audioManager = null;
        this.aiInterface = null;
        this.databaseClient = null;
        this.uiController = null;
        
        // Application state
        this.state = {
            isMeetingActive: false,
            isAudioEnabled: true,
            participants: [],
            currentInsights: {
                sentiment: 'neutral',
                keywords: [],
                actionItems: []
            }
        };
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing ScrumAI Meeting Assistant...');
            
            // Show loading overlay
            this.showLoading('Initializing application...');
            
            // Initialize components
            await this.initializeComponents();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize UI state
            this.initializeUI();
            
            // Hide loading overlay
            this.hideLoading();
            
            this.isInitialized = true;
            console.log('ScrumAI Meeting Assistant initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.handleError('Initialization failed', error);
        }
    }

    /**
     * Initialize all component managers
     */
    async initializeComponents() {
        // Initialize audio manager
        this.audioManager = new AudioManager();
        await this.audioManager.init();
        
        // Initialize AI interface
        this.aiInterface = new AIInterface();
        this.aiInterface.init();
        
        // Initialize UI controller
        this.uiController = new UIController();
        this.uiController.init();
        
        // Set up inter-component communication
        this.setupComponentCommunication();
    }

    /**
     * Set up communication between components
     */
    setupComponentCommunication() {
        // Audio data flow: AudioManager → AIInterface
        this.audioManager.onAudioData((audioData) => {
            this.aiInterface.processAudio(audioData);
        });
        
        // AI results flow: AIInterface → UI updates
        this.aiInterface.onResults((results) => {
            this.handleAIResults(results);
        });
        
        // Database real-time updates (commented out - no database client)
        // this.databaseClient.onRealtimeUpdate((update) => {
        //     this.handleRealtimeUpdate(update);
        // });
    }

    /**
     * Set up main event listeners
     */
    setupEventListeners() {
        // Meeting control buttons
        document.getElementById('start-meeting-btn').addEventListener('click', () => {
            this.startMeeting();
        });
        
        document.getElementById('stop-meeting-btn').addEventListener('click', () => {
            this.stopMeeting();
        });
        
        document.getElementById('mute-btn').addEventListener('click', () => {
            this.toggleMute();
        });
        
        // Tab switching for insights panel
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Export functionality
        document.getElementById('export-transcription').addEventListener('click', () => {
            this.exportTranscription();
        });
        
        document.getElementById('clear-transcription').addEventListener('click', () => {
            this.clearTranscription();
        });
        
        // Window events
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * Initialize UI state
     */
    initializeUI() {
        this.updateMeetingStatus(false);
        this.updateConnectionStatus();
        this.uiController.showWelcomeMessage();
    }

    /**
     * Start a new meeting
     */
    async startMeeting() {
        try {
            console.log('Starting meeting...');
            
            // Create meeting data
            const meetingData = {
                title: `Meeting ${new Date().toLocaleString()}`,
                startTime: new Date().toISOString(),
                participants: ['Current User']
            };
            
            // Start meeting via Electron API
            const result = await window.electronAPI.startMeeting(meetingData);
            
            if (result.success) {
                this.currentMeeting = {
                    id: result.meetingId,
                    ...meetingData
                };
                
                this.meetingStartTime = Date.now();
                this.state.isMeetingActive = true;
                
                // Start audio recording
                await this.audioManager.startRecording();
                
                // Update UI
                this.updateMeetingStatus(true);
                this.startMeetingTimer();
                
                // Save meeting to database (commented out - no database client)
                // await this.databaseClient.saveMeeting(this.currentMeeting);
                
                console.log('Meeting started successfully');
            }
            
        } catch (error) {
            console.error('Failed to start meeting:', error);
            this.handleError('Failed to start meeting', error);
        }
    }

    /**
     * Stop the current meeting
     */
    async stopMeeting() {
        try {
            console.log('Stopping meeting...');
            
            if (!this.state.isMeetingActive) return;
            
            // Stop meeting via Electron API
            await window.electronAPI.stopMeeting();
            
            // Stop audio recording
            this.audioManager.stopRecording();
            
            // Update meeting end time
            if (this.currentMeeting) {
                this.currentMeeting.endTime = new Date().toISOString();
                this.currentMeeting.duration = Date.now() - this.meetingStartTime;
                
                // Save final meeting data (commented out - no database client)
                // await this.databaseClient.updateMeeting(this.currentMeeting);
            }
            
            // Reset state
            this.state.isMeetingActive = false;
            this.currentMeeting = null;
            this.meetingStartTime = null;
            
            // Update UI
            this.updateMeetingStatus(false);
            this.stopMeetingTimer();
            
            console.log('Meeting stopped successfully');
            
        } catch (error) {
            console.error('Failed to stop meeting:', error);
            this.handleError('Failed to stop meeting', error);
        }
    }

    /**
     * Toggle audio mute
     */
    toggleMute() {
        this.state.isAudioEnabled = !this.state.isAudioEnabled;
        this.audioManager.setMuted(!this.state.isAudioEnabled);
        this.uiController.updateMuteButton(this.state.isAudioEnabled);
    }

    /**
     * Handle AI processing results
     */
    handleAIResults(results) {
        try {
            // Update transcription
            if (results.transcription) {
                this.uiController.addTranscription(results.transcription);
            }
            
            // Update sentiment analysis
            if (results.sentiment) {
                this.state.currentInsights.sentiment = results.sentiment;
                this.uiController.updateSentiment(results.sentiment);
            }
            
            // Update keywords
            if (results.keywords) {
                this.state.currentInsights.keywords = results.keywords;
                this.uiController.updateKeywords(results.keywords);
            }
            
            // Update action items
            if (results.actionItems) {
                this.state.currentInsights.actionItems = results.actionItems;
                this.uiController.updateActionItems(results.actionItems);
            }
            
            // Save insights to database (commented out - no database client)
            // if (this.currentMeeting) {
            //     this.databaseClient.saveInsight({
            //         meetingId: this.currentMeeting.id,
            //         timestamp: new Date().toISOString(),
            //         ...results
            //     });
            // }
            
        } catch (error) {
            console.error('Failed to handle AI results:', error);
        }
    }

    /**
     * Handle real-time database updates
     */
    handleRealtimeUpdate(update) {
        console.log('Real-time update received:', update);
        
        // Handle different types of updates
        switch (update.type) {
            case 'participant_joined':
                this.addParticipant(update.participant);
                break;
            case 'participant_left':
                this.removeParticipant(update.participantId);
                break;
            case 'insight_added':
                this.handleAIResults(update.insight);
                break;
        }
    }

    /**
     * Meeting timer functions
     */
    startMeetingTimer() {
        this.meetingTimer = setInterval(() => {
            const duration = Date.now() - this.meetingStartTime;
            const formatted = this.formatDuration(duration);
            document.getElementById('meeting-duration').textContent = formatted;
        }, 1000);
    }

    stopMeetingTimer() {
        if (this.meetingTimer) {
            clearInterval(this.meetingTimer);
            this.meetingTimer = null;
        }
        document.getElementById('meeting-duration').textContent = '00:00:00';
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * UI update methods
     */
    updateMeetingStatus(isActive) {
        const statusIndicator = document.getElementById('meeting-status-indicator');
        const startBtn = document.getElementById('start-meeting-btn');
        const stopBtn = document.getElementById('stop-meeting-btn');
        
        if (isActive) {
            statusIndicator.textContent = 'Recording';
            statusIndicator.className = 'status-indicator active';
            startBtn.disabled = true;
            stopBtn.disabled = false;
        } else {
            statusIndicator.textContent = 'Inactive';
            statusIndicator.className = 'status-indicator inactive';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    }

    updateConnectionStatus() {
        // Update database status (hardcoded to offline since no database client)
        const dbStatus = document.getElementById('db-status');
        if (dbStatus) {
            dbStatus.className = 'status-indicator disconnected';
        }
        
        // Update AI status
        const aiStatus = document.getElementById('ai-status');
        if (aiStatus) {
            aiStatus.className = this.aiInterface && this.aiInterface.isReady ? 'status-indicator connected' : 'status-indicator disconnected';
        }
    }

    /**
     * Utility methods
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    showLoading(message) {
        const overlay = document.getElementById('loading-overlay');
        overlay.querySelector('p').textContent = message;
        overlay.classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    }

    exportTranscription() {
        const transcription = this.uiController.getTranscriptionText();
        // Implementation for exporting transcription
        console.log('Exporting transcription:', transcription);
    }

    clearTranscription() {
        this.uiController.clearTranscription();
    }

    /**
     * Error handling
     */
    handleError(message, error) {
        console.error(message, error);
        // Show user-friendly error message
        alert(`${message}: ${error.message || error}`);
    }

    /**
     * Cleanup on app close
     */
    cleanup() {
        if (this.state.isMeetingActive) {
            this.stopMeeting();
        }
        
        if (this.audioManager) {
            this.audioManager.cleanup();
        }
        
        // Database cleanup (commented out - no database client)
        // if (this.databaseClient) {
        //     this.databaseClient.cleanup();
        // }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new ScrumAIApp();
    app.init();
    
    // Make app instance globally available for debugging
    window.scrumAI = app;
});
