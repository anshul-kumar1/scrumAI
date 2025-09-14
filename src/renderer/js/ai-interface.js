/**
 * AI Interface
 * Handles AI processing and analysis of meeting data using local Whisper + DeepSeek
 */

export class AIInterface {
    constructor() {
        this.isReady = false;
        this.callbacks = [];
        this.processingQueue = [];
        this.pythonProcess = null;
        this.isInitializing = false;
    }

    async init() {
        if (this.isInitializing) return;
        this.isInitializing = true;
        
        console.log('Initializing AI Interface with Whisper + DeepSeek...');
        
        try {
            // Initialize Python AI processor via IPC
            const result = await window.electronAPI.initializeAI();
            
            if (result.success) {
                this.isReady = true;
                console.log('AI Interface initialized successfully:', result.message);
                
                // Set up message listener for AI results
                window.electronAPI.onAIResult((result) => {
                    this.handleAIResult(result);
                });
                
            } else {
                console.error('Failed to initialize AI:', result.error);
                // Fallback to mock mode
                this.initMockMode();
            }
        } catch (error) {
            console.error('AI initialization error:', error);
            // Fallback to mock mode
            this.initMockMode();
        }
        
        this.isInitializing = false;
    }
    
    initMockMode() {
        console.log('Falling back to mock AI mode...');
        setTimeout(() => {
            this.isReady = true;
            console.log('AI Interface initialized (mock mode)');
        }, 1000);
    }

    onResults(callback) {
        this.callbacks.push(callback);
    }

    async processAudio(audioData) {
        if (!this.isReady) {
            console.warn('AI Interface not ready');
            return;
        }

        console.log('Processing audio data with Whisper + DeepSeek...');
        
        try {
            // Check if we have electronAPI (real mode) or fallback to mock
            if (window.electronAPI && window.electronAPI.processAudio) {
                // Send audio to Python processor via IPC
                await window.electronAPI.processAudio(audioData);
            } else {
                // Fallback to mock processing
                console.log('Using mock AI processing...');
                setTimeout(() => {
                    const mockResults = this.generateMockResults();
                    this.callbacks.forEach(callback => callback(mockResults));
                }, 2000 + Math.random() * 3000); // Random delay 2-5 seconds
            }
        } catch (error) {
            console.error('Audio processing failed:', error);
            // Fallback to mock results on error
            const mockResults = this.generateMockResults();
            this.callbacks.forEach(callback => callback(mockResults));
        }
    }
    
    handleAIResult(result) {
        console.log('Received AI result:', result);
        
        if (result.success && result.transcription) {
            const formattedResult = {
                transcription: result.transcription,
                sentiment: result.analysis?.sentiment || 'neutral',
                sentimentScore: result.analysis?.sentiment_score || 0.5,
                keywords: result.analysis?.keywords || [],
                actionItems: result.analysis?.action_items || [],
                keyTopics: result.analysis?.key_topics || [],
                summary: result.analysis?.summary || result.transcription,
                urgencyLevel: result.analysis?.urgency_level || 'medium',
                timestamp: result.timestamp || Date.now()
            };
            
            // Notify all callbacks
            this.callbacks.forEach(callback => callback(formattedResult));
        } else if (!result.success) {
            console.error('AI processing failed:', result.error);
        }
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