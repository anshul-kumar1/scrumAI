/**
 * Main Renderer Process Controller
 * 
 * This is the primary JavaScript file for the renderer process.
 * Responsibilities:
 * - Initialize UI components
 * - Handle main application state and event flow
 * - Manage meeting lifecycle and user interactions
 * - Provide centralized error handling and logging
 */

import { UIController } from './ui-controller.js';

class ScrumAIApp {
    constructor() {
        this.isInitialized = false;
        this.currentMeeting = null;
        this.meetingStartTime = null;
        this.meetingTimer = null;
        
        // Component instances
        this.uiController = null;
        
        // Application state
        this.state = {
            isMeetingActive: false,
            isMuted: false,
            participants: [],
            activeTab: 'keywords'
        };
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing ScrumAI Meeting Assistant...');
            
            // Initialize components
            await this.initializeComponents();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize UI state
            this.initializeUI();
            
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
        // Initialize UI controller
        this.uiController = new UIController();
        this.uiController.init();
        
        // Make UI controller globally accessible for keyword tooltips
        window.uiController = this.uiController;
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
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab || e.target.closest('.tab-btn').dataset.tab);
            });
        });
        
        // Export functionality
        document.getElementById('export-content').addEventListener('click', () => {
            this.exportContent();
        });
        
        document.getElementById('clear-content').addEventListener('click', () => {
            this.clearContent();
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
                participants: ['Demo User']
            };
            
            console.log('Meeting data:', meetingData);
            
            this.currentMeeting = meetingData;
            this.meetingStartTime = Date.now();
            this.state.isMeetingActive = true;
            
            // Update UI
            this.updateMeetingStatus(true);
            this.startMeetingTimer();
            
            // Initialize mock participants for UI development
            this.initializeMockParticipants();
            
            // Initialize mock keywords for UI development
            this.uiController.initializeMockKeywords();
            
            // Initialize mock transcript
            this.initializeMockTranscript();
            
            console.log('Meeting started successfully');
            
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
            
            // Update meeting end time
            if (this.currentMeeting) {
                this.currentMeeting.endTime = new Date().toISOString();
                this.currentMeeting.duration = Date.now() - this.meetingStartTime;
            }
            
            // Reset state
            this.state.isMeetingActive = false;
            this.currentMeeting = null;
            this.meetingStartTime = null;
            this.state.participants = [];
            
            // Clear participants from UI
            this.uiController.clearParticipants();
            
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
     * Toggle mute state
     */
    toggleMute() {
        this.state.isMuted = !this.state.isMuted;
        this.updateMuteButton();
        console.log(`Audio ${this.state.isMuted ? 'muted' : 'unmuted'}`);
    }

    /**
     * Update mute button appearance
     */
    updateMuteButton() {
        const muteBtn = document.getElementById('mute-btn');
        const icon = muteBtn.querySelector('.btn-icon');
        
        if (this.state.isMuted) {
            icon.textContent = '🔇';
            muteBtn.classList.add('active');
            muteBtn.innerHTML = '<span class="btn-icon">🔇</span>Unmute';
        } else {
            icon.textContent = '🔊';
            muteBtn.classList.remove('active');
            muteBtn.innerHTML = '<span class="btn-icon">🔊</span>Mute';
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


    /**
     * Utility methods
     */
    switchTab(tabName) {
        if (!tabName) return;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        this.state.activeTab = tabName;
        console.log(`Switched to ${tabName} tab`);
    }

    exportContent() {
        if (this.state.activeTab === 'keywords') {
            const transcription = this.uiController.getTranscriptionText();
            console.log('Exporting keywords:', transcription);
        } else if (this.state.activeTab === 'transcript') {
            const transcript = document.getElementById('transcript-content').textContent;
            console.log('Exporting transcript:', transcript);
        }
    }

    clearContent() {
        if (this.state.activeTab === 'keywords') {
            this.uiController.clearTranscription();
        } else if (this.state.activeTab === 'transcript') {
            const transcriptContent = document.getElementById('transcript-content');
            transcriptContent.innerHTML = '<p class="placeholder-text">Start a meeting to see transcript...</p>';
        }
    }

    /**
     * Add participant to meeting
     */
    addParticipant(participant) {
        this.state.participants.push(participant);
        this.uiController.addParticipant(participant);
        console.log('Participant added:', participant.name);
    }

    /**
     * Remove participant from meeting
     */
    removeParticipant(participantId) {
        this.state.participants = this.state.participants.filter(p => p.id !== participantId);
        this.uiController.removeParticipant(participantId);
        console.log('Participant removed:', participantId);
    }

    /**
     * Initialize mock participants for UI development
     */
    initializeMockParticipants() {
        // Initialize mock participants in UI
        this.uiController.initializeMockParticipants();
        
        // Start activity simulation every 5 seconds for demo purposes
        setInterval(() => {
            if (this.state.isMeetingActive) {
                this.uiController.simulateParticipantActivity();
            }
        }, 5000);
    }

    /**
     * Initialize mock transcript for UI development
     */
    initializeMockTranscript() {
        const transcriptContent = document.getElementById('transcript-content');
        const mockTranscript = `
[00:00:15] John Smith: Good morning everyone, thanks for joining today's sprint planning meeting.

[00:00:22] Sarah Johnson: Morning! I've prepared the user stories for review.

[00:00:35] Mike Chen: Great, I've also updated the technical requirements document.

[00:00:48] John Smith: Perfect. Let's start by reviewing the project timeline and our current velocity.

[00:01:12] Alex Rodriguez: Based on last sprint, our velocity was 32 story points. Should we plan for similar capacity?

[00:01:28] Sarah Johnson: I think we can be a bit more ambitious. The team has been working well together.

[00:01:45] Mike Chen: Agreed. The technical debt cleanup from last sprint should help us move faster.

[00:02:03] John Smith: Excellent. Let's aim for 35-38 story points this sprint. Sarah, can you walk us through the priority user stories?

[00:02:20] Sarah Johnson: Absolutely. The top priority is the user authentication system. It's critical for the Q2 release.

[00:02:38] Alex Rodriguez: I can take the lead on the authentication API. I have experience with OAuth implementations.

[00:02:55] Mike Chen: I'll handle the frontend integration and user interface components.

[00:03:12] John Smith: Great collaboration. What about the database migrations needed for this feature?

[00:03:28] Alex Rodriguez: I've already drafted the migration scripts. They should be ready for review by tomorrow.

[00:03:45] Sarah Johnson: Perfect. The next priority item is the client dashboard improvements.

[00:04:02] Mike Chen: I've been working on the wireframes. The new layout should improve user experience significantly.

[00:04:20] John Smith: Sounds promising. Any technical challenges we should be aware of?

[00:04:35] Alex Rodriguez: The main challenge will be maintaining backwards compatibility with existing client data.

[00:04:52] Sarah Johnson: We'll need to coordinate with the QA team for comprehensive testing.

[00:05:08] John Smith: Absolutely. I'll schedule a meeting with the QA team for tomorrow afternoon.
        `.trim();
        
        transcriptContent.innerHTML = `<pre style="white-space: pre-wrap; margin: 0; font-family: inherit;">${mockTranscript}</pre>`;
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
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new ScrumAIApp();
    app.init();
    
    // Make app instance globally available for debugging
    window.scrumAI = app;
});
