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

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                    // Notify callbacks with audio data
                    this.callbacks.forEach(callback => callback(event.data));
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