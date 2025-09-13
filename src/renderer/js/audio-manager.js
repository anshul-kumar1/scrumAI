/**
 * Audio Manager - Real-time Audio Processing
 * 
 * This module handles all audio-related functionality for the meeting application.
 * Responsibilities:
 * - Real-time audio capture from microphone using Web Audio API
 * - Audio stream processing and formatting for AI analysis
 * - Audio visualization and level monitoring
 * - Managing audio devices and permissions
 * - Streaming audio data to Python AI subprocess via main process
 */

class AudioManager {
    constructor() {
        this.isRecording = false;
        this.isMuted = false;
        this.audioContext = null;
        this.mediaStream = null;
        this.analyser = null;
        this.microphone = null;
        this.processor = null;
        
        // Audio processing settings
        this.sampleRate = 16000; // Optimal for speech recognition
        this.bufferSize = 4096;
        this.channelCount = 1; // Mono audio
        
        // Visualization
        this.canvas = null;
        this.canvasContext = null;
        this.animationFrame = null;
        
        // Audio data buffer for AI processing
        this.audioBuffer = [];
        this.bufferDuration = 3000; // 3 seconds of audio for processing
        
        // Callbacks
        this.onAudioDataCallbacks = [];
        this.onVolumeChangeCallbacks = [];
    }

    /**
     * Initialize audio system
     */
    async init() {
        try {
            console.log('Initializing Audio Manager...');
            
            // Check for Web Audio API support
            if (!window.AudioContext && !window.webkitAudioContext) {
                throw new Error('Web Audio API not supported');
            }
            
            // Request microphone permissions
            await this.requestMicrophonePermissions();
            
            // Initialize canvas for visualization
            this.initializeVisualization();
            
            console.log('Audio Manager initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Audio Manager:', error);
            throw error;
        }
    }

    /**
     * Request microphone permissions
     */
    async requestMicrophonePermissions() {
        try {
            const constraints = {
                audio: {
                    channelCount: this.channelCount,
                    sampleRate: this.sampleRate,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            
            this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Microphone access granted');
            
        } catch (error) {
            console.error('Failed to access microphone:', error);
            throw new Error('Microphone access denied. Please grant permission and reload.');
        }
    }

    /**
     * Start audio recording and processing
     */
    async startRecording() {
        try {
            if (this.isRecording) {
                console.warn('Recording already in progress');
                return;
            }
            
            console.log('Starting audio recording...');
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate
            });
            
            // Create microphone input
            this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // Create analyser for visualization
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.85;
            
            // Create audio processor
            this.processor = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1);
            
            // Connect audio nodes
            this.microphone.connect(this.analyser);
            this.microphone.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            
            // Set up audio processing
            this.processor.addEventListener('audioprocess', (event) => {
                this.processAudioData(event);
            });
            
            this.isRecording = true;
            this.startVisualization();
            
            console.log('Audio recording started successfully');
            
        } catch (error) {
            console.error('Failed to start audio recording:', error);
            throw error;
        }
    }

    /**
     * Stop audio recording
     */
    stopRecording() {
        try {
            if (!this.isRecording) {
                console.warn('No recording in progress');
                return;
            }
            
            console.log('Stopping audio recording...');
            
            // Disconnect audio nodes
            if (this.microphone) {
                this.microphone.disconnect();
            }
            
            if (this.processor) {
                this.processor.disconnect();
                this.processor.removeEventListener('audioprocess', this.processAudioData);
            }
            
            if (this.analyser) {
                this.analyser.disconnect();
            }
            
            // Close audio context
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
            
            this.isRecording = false;
            this.stopVisualization();
            
            console.log('Audio recording stopped');
            
        } catch (error) {
            console.error('Failed to stop audio recording:', error);
        }
    }

    /**
     * Process audio data for AI analysis
     */
    processAudioData(event) {
        if (!this.isRecording || this.isMuted) return;
        
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Convert to 16-bit PCM
        const pcmData = this.floatTo16BitPCM(inputData);
        
        // Add to buffer
        this.audioBuffer.push(...pcmData);
        
        // Check if buffer is ready for processing
        const targetBufferSize = this.sampleRate * (this.bufferDuration / 1000);
        
        if (this.audioBuffer.length >= targetBufferSize) {
            // Send audio data for AI processing
            const audioData = {
                data: Array.from(this.audioBuffer),
                sampleRate: this.sampleRate,
                channels: this.channelCount,
                timestamp: Date.now()
            };
            
            // Notify callbacks
            this.onAudioDataCallbacks.forEach(callback => {
                try {
                    callback(audioData);
                } catch (error) {
                    console.error('Audio data callback error:', error);
                }
            });
            
            // Clear buffer (keep some overlap for continuity)
            const overlapSize = Math.floor(targetBufferSize * 0.1);
            this.audioBuffer = this.audioBuffer.slice(-overlapSize);
        }
        
        // Calculate and emit volume level
        this.calculateVolumeLevel(inputData);
    }

    /**
     * Convert float audio data to 16-bit PCM
     */
    floatTo16BitPCM(floatArray) {
        const buffer = new ArrayBuffer(floatArray.length * 2);
        const view = new DataView(buffer);
        
        for (let i = 0; i < floatArray.length; i++) {
            let sample = Math.max(-1, Math.min(1, floatArray[i]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(i * 2, sample, true);
        }
        
        return new Int16Array(buffer);
    }

    /**
     * Calculate audio volume level for UI feedback
     */
    calculateVolumeLevel(audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        
        const rms = Math.sqrt(sum / audioData.length);
        const volume = Math.min(100, rms * 100 * 10); // Scale to 0-100
        
        // Update UI level indicator
        const levelIndicator = document.getElementById('mic-level');
        if (levelIndicator) {
            levelIndicator.style.width = `${volume}%`;
            levelIndicator.style.backgroundColor = volume > 70 ? '#ff4444' : volume > 30 ? '#ffaa00' : '#44ff44';
        }
        
        // Notify volume change callbacks
        this.onVolumeChangeCallbacks.forEach(callback => {
            try {
                callback(volume);
            } catch (error) {
                console.error('Volume change callback error:', error);
            }
        });
    }

    /**
     * Initialize audio visualization
     */
    initializeVisualization() {
        this.canvas = document.getElementById('audio-canvas');
        if (!this.canvas) {
            console.warn('Audio canvas not found');
            return;
        }
        
        this.canvasContext = this.canvas.getContext('2d');
        
        // Set canvas size
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * devicePixelRatio;
        this.canvas.height = rect.height * devicePixelRatio;
        this.canvasContext.scale(devicePixelRatio, devicePixelRatio);
    }

    /**
     * Start audio visualization
     */
    startVisualization() {
        if (!this.analyser || !this.canvasContext) return;
        
        const animate = () => {
            if (!this.isRecording) return;
            
            this.animationFrame = requestAnimationFrame(animate);
            this.drawVisualization();
        };
        
        animate();
    }

    /**
     * Stop audio visualization
     */
    stopVisualization() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Clear canvas
        if (this.canvasContext) {
            this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Draw audio waveform visualization
     */
    drawVisualization() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        
        const width = this.canvas.width / devicePixelRatio;
        const height = this.canvas.height / devicePixelRatio;
        
        // Clear canvas
        this.canvasContext.fillStyle = '#1a1a1a';
        this.canvasContext.fillRect(0, 0, width, height);
        
        // Draw frequency bars
        const barWidth = width / bufferLength * 2;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * height * 0.8;
            
            // Create gradient
            const gradient = this.canvasContext.createLinearGradient(0, height, 0, height - barHeight);
            gradient.addColorStop(0, '#4ade80');
            gradient.addColorStop(0.5, '#22d3ee');
            gradient.addColorStop(1, '#8b5cf6');
            
            this.canvasContext.fillStyle = gradient;
            this.canvasContext.fillRect(x, height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }

    /**
     * Set mute state
     */
    setMuted(muted) {
        this.isMuted = muted;
        console.log(`Audio ${muted ? 'muted' : 'unmuted'}`);
    }

    /**
     * Get current audio devices
     */
    async getAudioDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'audioinput');
        } catch (error) {
            console.error('Failed to get audio devices:', error);
            return [];
        }
    }

    /**
     * Event listener registration
     */
    onAudioData(callback) {
        this.onAudioDataCallbacks.push(callback);
    }

    onVolumeChange(callback) {
        this.onVolumeChangeCallbacks.push(callback);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('Cleaning up Audio Manager...');
        
        this.stopRecording();
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        this.onAudioDataCallbacks = [];
        this.onVolumeChangeCallbacks = [];
        
        console.log('Audio Manager cleanup complete');
    }
}
