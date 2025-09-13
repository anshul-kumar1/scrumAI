/**
 * AI Interface - Stub for Python AI Communication
 * 
 * This module provides a placeholder interface for AI processing functionality.
 * In the full implementation, this would handle communication with Python AI models.
 * Currently provides mock responses for testing the application structure.
 * 
 * Responsibilities:
 * - Interface with Python AI subprocess (when implemented)
 * - Process audio data for AI analysis
 * - Generate mock insights for testing
 * - Handle AI results and format them for UI
 */

class AIInterface {
    constructor() {
        this.isReady = false;
        this.isProcessing = false;
        this.resultCallbacks = [];
        
        // Mock AI state for testing
        this.mockSentimentScore = 0.0;
        this.mockKeywords = ['meeting', 'progress', 'tasks'];
        this.mockActionItems = [];
    }

    /**
     * Initialize AI interface
     */
    init() {
        console.log('Initializing AI Interface (Mock Mode)...');
        
        // Simulate AI initialization delay
        setTimeout(() => {
            this.isReady = true;
            console.log('AI Interface ready (Mock Mode)');
        }, 1000);
    }

    /**
     * Process audio data (mock implementation)
     */
    processAudio(audioData) {
        if (!this.isReady || this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        
        // Simulate processing delay
        setTimeout(() => {
            const mockResults = this.generateMockResults(audioData);
            this.handleResults(mockResults);
            this.isProcessing = false;
        }, 500);
    }

    /**
     * Generate mock AI results for testing
     */
    generateMockResults(audioData) {
        // Generate random mock data for testing
        const transcriptions = [
            "Let's start today's meeting.",
            "We need to review the sprint progress.",
            "I think we should focus on the user interface.",
            "The database integration is almost complete.",
            "We have some blockers that need attention."
        ];

        const sentiments = ['positive', 'neutral', 'negative'];
        const keywords = ['sprint', 'database', 'interface', 'blockers', 'progress', 'review'];

        // Random selection for demo
        const randomTranscription = transcriptions[Math.floor(Math.random() * transcriptions.length)];
        const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
        
        // Update sentiment score
        this.mockSentimentScore = Math.random() * 2 - 1; // -1 to 1

        // Add random keyword
        if (Math.random() > 0.7) {
            const newKeyword = keywords[Math.floor(Math.random() * keywords.length)];
            if (!this.mockKeywords.includes(newKeyword)) {
                this.mockKeywords.push(newKeyword);
            }
        }

        // Occasionally generate action items
        if (Math.random() > 0.8) {
            this.mockActionItems.push({
                id: Date.now(),
                text: `Action item: ${randomTranscription}`,
                priority: 'medium',
                timestamp: new Date().toISOString()
            });
        }

        return {
            transcription: randomTranscription,
            sentiment: randomSentiment,
            sentimentScore: this.mockSentimentScore,
            keywords: [...this.mockKeywords],
            actionItems: [...this.mockActionItems],
            confidence: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
            timestamp: Date.now()
        };
    }

    /**
     * Handle AI processing results
     */
    handleResults(results) {
        console.log('AI Results:', results);
        
        // Notify all callbacks
        this.resultCallbacks.forEach(callback => {
            try {
                callback(results);
            } catch (error) {
                console.error('AI results callback error:', error);
            }
        });
    }

    /**
     * Register callback for AI results
     */
    onResults(callback) {
        this.resultCallbacks.push(callback);
    }

    /**
     * Remove results callback
     */
    removeResultsCallback(callback) {
        const index = this.resultCallbacks.indexOf(callback);
        if (index > -1) {
            this.resultCallbacks.splice(index, 1);
        }
    }

    /**
     * Get current AI status
     */
    getStatus() {
        return {
            isReady: this.isReady,
            isProcessing: this.isProcessing,
            mode: 'mock'
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('Cleaning up AI Interface...');
        this.isReady = false;
        this.isProcessing = false;
        this.resultCallbacks = [];
        console.log('AI Interface cleanup complete');
    }
}
