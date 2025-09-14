/**
 * AI Interface
 * Handles AI processing and analysis of meeting data
 */

export class AIInterface {
    constructor() {
        this.isReady = false;
        this.callbacks = [];
        this.processingQueue = [];
    }

    init() {
        console.log('Initializing AI Interface...');
        // Simulate AI initialization
        setTimeout(() => {
            this.isReady = true;
            console.log('AI Interface initialized (simulated)');
        }, 1000);
    }

    onResults(callback) {
        this.callbacks.push(callback);
    }

    processAudio(audioData) {
        if (!this.isReady) {
            console.warn('AI Interface not ready');
            return;
        }

        console.log('Processing audio data...');
        
        // Simulate AI processing with mock results
        setTimeout(() => {
            const mockResults = this.generateMockResults();
            this.callbacks.forEach(callback => callback(mockResults));
        }, 2000 + Math.random() * 3000); // Random delay 2-5 seconds
    }

    generateMockResults() {
        const sentiments = ['positive', 'negative', 'neutral'];
        const keywords = [
            ['project', 'deadline', 'meeting'],
            ['team', 'collaboration', 'goals'],
            ['development', 'features', 'testing'],
            ['budget', 'timeline', 'resources'],
            ['client', 'feedback', 'requirements']
        ];
        const actionItems = [
            ['Review project proposal', 'Schedule follow-up meeting'],
            ['Update documentation', 'Contact stakeholders'],
            ['Prepare presentation', 'Analyze user feedback'],
            ['Implement new features', 'Test current build'],
            ['Plan next sprint', 'Allocate resources']
        ];

        return {
            transcription: this.generateMockTranscription(),
            sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
            sentimentScore: Math.random(),
            keywords: keywords[Math.floor(Math.random() * keywords.length)],
            actionItems: actionItems[Math.floor(Math.random() * actionItems.length)]
        };
    }

    generateMockTranscription() {
        const phrases = [
            "Let's discuss the project timeline and deliverables.",
            "We need to review the current sprint progress.",
            "The client feedback has been very positive so far.",
            "I think we should focus on the core features first.",
            "The team has been doing excellent work this week.",
            "We should schedule a follow-up meeting next week.",
            "The budget allocation needs to be reviewed.",
            "User testing results show good engagement."
        ];
        
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    cleanup() {
        this.isReady = false;
        this.callbacks = [];
        this.processingQueue = [];
        console.log('AI Interface cleanup completed');
    }
}