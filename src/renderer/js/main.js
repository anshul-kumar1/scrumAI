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
            activeTab: 'keywords',
            isPostMeeting: false
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
        
        // Notion export buttons
        document.getElementById('export-notes-notion').addEventListener('click', () => {
            this.exportToNotion('notes');
        });
        
        document.getElementById('export-strategy-notion').addEventListener('click', () => {
            this.exportToNotion('strategy');
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
            
            // Reset to live meeting state if coming from post-meeting
            if (this.state.isPostMeeting) {
                this.resetToLiveMeeting();
            }
            
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
            
            // Transition to post-meeting state
            this.transitionToPostMeeting();
            
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

    /**
     * Transition to post-meeting state
     */
    transitionToPostMeeting() {
        this.state.isPostMeeting = true;
        
        // Hide live meeting tabs and content
        document.querySelector('.live-tabs').classList.add('hidden');
        document.querySelector('.live-content').classList.add('hidden');
        
        // Show post-meeting tabs and content
        document.querySelector('.post-meeting-tabs').classList.remove('hidden');
        document.querySelector('.post-meeting-content').classList.remove('hidden');
        
        // Set default active tab to notes
        this.state.activeTab = 'notes';
        
        // Generate post-meeting content
        this.generateMeetingNotes();
        this.generateStrategy();
        
        console.log('Transitioned to post-meeting state');
    }

    /**
     * Reset to live meeting state
     */
    resetToLiveMeeting() {
        this.state.isPostMeeting = false;
        
        // Show live meeting tabs and content
        document.querySelector('.live-tabs').classList.remove('hidden');
        document.querySelector('.live-content').classList.remove('hidden');
        
        // Hide post-meeting tabs and content
        document.querySelector('.post-meeting-tabs').classList.add('hidden');
        document.querySelector('.post-meeting-content').classList.add('hidden');
        
        // Reset to keywords tab
        this.state.activeTab = 'keywords';
        this.switchTab('keywords');
        
        console.log('Reset to live meeting state');
    }

    /**
     * Generate meeting notes from transcript and keywords
     */
    generateMeetingNotes() {
        const notesContent = document.getElementById('notes-content');
        const mockNotes = `
## Meeting Summary
**Date:** ${new Date().toLocaleDateString()}
**Duration:** ${this.formatDuration(this.currentMeeting?.duration || 300000)}
**Participants:** John Smith, Sarah Johnson, Mike Chen, Alex Rodriguez

### Key Discussion Points
• **Project Timeline Review**: Discussed current sprint velocity (32 story points) and planned capacity for next sprint (35-38 story points)
• **User Authentication System**: Identified as top priority for Q2 release
• **Client Dashboard Improvements**: Reviewed wireframes and new layout designs
• **Technical Requirements**: Updated documentation and database migration scripts

### Decisions Made
1. **Sprint Capacity**: Agreed to target 35-38 story points for next sprint
2. **Authentication Lead**: Alex Rodriguez to lead API development
3. **Frontend Integration**: Mike Chen to handle UI components
4. **QA Coordination**: John Smith to schedule meeting with QA team

### Key Insights
• Team velocity has improved due to technical debt cleanup
• Strong collaboration between team members
• Focus on maintaining backwards compatibility with existing client data
• Need for comprehensive testing coordination

### Meeting Metrics
• **Keywords Discussed:** ${document.getElementById('keyword-count').textContent || 0}
• **Action Items Generated:** 4
• **Follow-up Meetings Scheduled:** 1
        `.trim();
        
        notesContent.innerHTML = `<pre style="white-space: pre-wrap; margin: 0; font-family: inherit; font-size: 14px; line-height: 1.6;">${mockNotes}</pre>`;
    }

    /**
     * Generate strategy and action items
     */
    generateStrategy() {
        const strategyContent = document.getElementById('strategy-content');
        const mockStrategy = `
## Strategic Outcomes & Next Steps

### 🎯 Sprint Goals
**Primary Objective:** Deliver user authentication system for Q2 release
**Secondary Objectives:** 
- Complete client dashboard improvements
- Maintain technical debt reduction momentum
- Strengthen QA collaboration processes

### 📋 Action Items

#### High Priority (This Week)
- [ ] **Alex Rodriguez**: Draft authentication API migration scripts
  - *Due: Tomorrow*
  - *Impact: Critical for Q2 release*

- [ ] **John Smith**: Schedule QA coordination meeting
  - *Due: Tomorrow afternoon*
  - *Impact: Ensures testing coverage*

#### Medium Priority (Next Sprint)
- [ ] **Mike Chen**: Complete authentication UI components
  - *Due: End of sprint*
  - *Dependencies: API completion*

- [ ] **Sarah Johnson**: Review and prioritize remaining user stories
  - *Due: Sprint planning*
  - *Impact: Sprint velocity optimization*

### 🚀 Strategic Recommendations

#### Technical Strategy
1. **Maintain Momentum**: Continue technical debt reduction to sustain improved velocity
2. **API-First Approach**: Prioritize backend completion before frontend integration
3. **Testing Integration**: Embed QA processes earlier in development cycle

#### Team Collaboration
1. **Cross-functional Pairing**: Encourage collaboration between frontend/backend developers
2. **Regular Check-ins**: Implement daily standups for authentication feature
3. **Documentation**: Maintain updated technical requirements throughout development

### 📊 Success Metrics
- **Sprint Velocity Target**: 35-38 story points
- **Authentication Completion**: 100% by sprint end
- **Technical Debt Reduction**: Continue 20% allocation
- **QA Integration**: Zero critical bugs in production

### 🔄 Follow-up Actions
- **Next Review**: Sprint retrospective
- **Stakeholder Update**: Weekly progress report to management
- **Risk Assessment**: Monitor backwards compatibility requirements
        `.trim();
        
        strategyContent.innerHTML = `<pre style="white-space: pre-wrap; margin: 0; font-family: inherit; font-size: 14px; line-height: 1.6;">${mockStrategy}</pre>`;
    }

    /**
     * Export content to Notion
     */
    exportToNotion(contentType) {
        const content = contentType === 'notes' ? 
            document.getElementById('notes-content').textContent :
            document.getElementById('strategy-content').textContent;
        
        // Simulate Notion export
        console.log(`Exporting ${contentType} to Notion...`);
        console.log('Content:', content);
        
        // Show success message
        const button = document.getElementById(`export-${contentType}-notion`);
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="btn-icon">✅</span>Exported!';
        button.disabled = true;
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);
        
        // In a real implementation, this would integrate with Notion API
        alert(`${contentType === 'notes' ? 'Meeting Notes' : 'Strategy & Actions'} exported to Notion successfully!`);
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
