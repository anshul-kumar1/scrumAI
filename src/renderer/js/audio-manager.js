/**
 * Audio Manager
 * Handles audio recording and management for meetings
 */

export class AudioManager {
    constructor() {
        this.isRecording = false;
        this.isReady = false;
        this.stream = null;
        this.mediaRecorder = null;
        this.callbacks = [];
    }

    async init() {
        try {
            console.log('Initializing Audio Manager...');
            
            // Request microphone permission
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            this.isReady = true;
            console.log('Audio Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this.isReady = false;
        }
    }

    async startRecording() {
        if (!this.isReady || this.isRecording) {
            console.warn('Cannot start recording: not ready or already recording');
            return;
        }

        try {
            this.mediaRecorder = new MediaRecorder(this.stream);
            const audioChunks = [];

            this.mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                    
                    // Convert Blob to base64 for IPC transmission
                    try {
                        const arrayBuffer = await event.data.arrayBuffer();
                        const base64Data = this.arrayBufferToBase64(arrayBuffer);
                        
                        console.log(`Audio chunk: ${event.data.size} bytes -> ${base64Data.length} base64 chars`);
                        
                        // Notify callbacks with base64 audio data
                        this.callbacks.forEach(callback => callback(base64Data));
                    } catch (error) {
                        console.error('Failed to convert audio data:', error);
                    }
                }
            };

            this.mediaRecorder.start(1000); // Capture data every second
            this.isRecording = true;
            console.log('Audio recording started');
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            console.log('Audio recording stopped');
        }
    }

    setMuted(muted) {
        if (this.stream) {
            this.stream.getAudioTracks().forEach(track => {
                track.enabled = !muted;
            });
            console.log('Audio muted:', muted);
        }
    }

    onAudioData(callback) {
        this.callbacks.push(callback);
    }

    /**
     * Convert ArrayBuffer to base64 string for IPC transmission
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    cleanup() {
        this.stopRecording();
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.isReady = false;
        console.log('Audio Manager cleanup completed');
    }
}