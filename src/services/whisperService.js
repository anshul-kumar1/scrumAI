/**
 * Whisper Transcription Service
 *
 * This service manages the Whisper AI transcription process by spawning
 * a Python child process and handling real-time communication.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class WhisperService {
    constructor() {
        this.transcriptionProcess = null;
        this.isRunning = false;
        this.transcriptBuffer = [];
        this.onTranscriptCallback = null;
        this.onErrorCallback = null;
        this.onStatusCallback = null;
    }

    /**
     * Start the Whisper transcription service
     */
    async start() {
        if (this.isRunning) {
            throw new Error('Whisper service is already running');
        }

        try {
            // Check if Python is available
            const pythonPath = await this.findPython();
            if (!pythonPath) {
                throw new Error('Python not found. Please ensure Python is installed and in PATH');
            }

            // Check if required files exist
            this.checkRequiredFiles();

            // Start the transcription process using new meeting transcriber
            const scriptPath = path.join(__dirname, '..', '..', 'whisper', 'meeting_transcriber.py');
            const workingDir = path.join(__dirname, '..', '..', 'whisper');

            console.log('Starting Whisper transcription process...');
            console.log('Script path:', scriptPath);
            console.log('Working directory:', workingDir);

            this.transcriptionProcess = spawn(pythonPath, [scriptPath], {
                cwd: workingDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.isRunning = true;
            this.setupProcessHandlers();

            // Give the process a moment to start
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('Whisper service started successfully');
            return true;

        } catch (error) {
            console.error('Failed to start Whisper service:', error);
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Stop the Whisper transcription service
     */
    async stop() {
        if (!this.isRunning || !this.transcriptionProcess) {
            return;
        }

        try {
            console.log('Stopping Whisper service...');

            // Send SIGINT to gracefully stop the process
            this.transcriptionProcess.kill('SIGINT');

            // Wait for process to exit
            await new Promise((resolve) => {
                this.transcriptionProcess.on('exit', () => {
                    resolve();
                });

                // Force kill after 5 seconds if not exited
                setTimeout(() => {
                    if (this.transcriptionProcess && !this.transcriptionProcess.killed) {
                        this.transcriptionProcess.kill('SIGKILL');
                        resolve();
                    }
                }, 5000);
            });

            this.transcriptionProcess = null;
            this.isRunning = false;
            console.log('Whisper service stopped');

        } catch (error) {
            console.error('Error stopping Whisper service:', error);
            this.isRunning = false;
        }
    }

    /**
     * Get the full transcript as formatted text
     */
    getFullTranscript() {
        let transcript = '';
        for (const entry of this.transcriptBuffer) {
            if (entry.type === 'transcript') {
                transcript += `[${entry.timestamp}] ${entry.text}\n`;
            }
        }
        return transcript;
    }

    /**
     * Save transcript to a file
     */
    async saveTranscript(filename = null) {
        const transcript = this.getFullTranscript();
        if (!transcript.trim()) {
            throw new Error('No transcript to save');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFilename = `meetingnotes_${timestamp}.txt`;
        const filepath = filename || path.join(require('os').homedir(), defaultFilename);

        await fs.promises.writeFile(filepath, transcript, 'utf8');
        console.log(`Transcript saved to: ${filepath}`);
        return filepath;
    }

    /**
     * Clear the transcript buffer
     */
    clearTranscript() {
        this.transcriptBuffer = [];
    }

    /**
     * Set callback for new transcriptions
     */
    onTranscript(callback) {
        this.onTranscriptCallback = callback;
    }

    /**
     * Set callback for errors
     */
    onError(callback) {
        this.onErrorCallback = callback;
    }

    /**
     * Set callback for status updates
     */
    onStatus(callback) {
        this.onStatusCallback = callback;
    }

    /**
     * Find Python executable
     */
    async findPython() {
        // First try virtual environment
        const venvPython = path.join(__dirname, '..', '..', 'whisper_env', 'Scripts', 'python.exe');
        if (fs.existsSync(venvPython)) {
            console.log(`Found Python in virtual environment: ${venvPython}`);
            return venvPython;
        }

        // Fallback to system Python
        const candidates = ['python', 'python3', 'py'];

        for (const candidate of candidates) {
            try {
                const { spawn } = require('child_process');
                const result = await new Promise((resolve) => {
                    const proc = spawn(candidate, ['--version'], { stdio: 'pipe' });
                    let output = '';

                    proc.stdout.on('data', (data) => {
                        output += data.toString();
                    });

                    proc.stderr.on('data', (data) => {
                        output += data.toString();
                    });

                    proc.on('close', (code) => {
                        resolve({ code, output });
                    });

                    proc.on('error', () => {
                        resolve({ code: -1, output: '' });
                    });
                });

                if (result.code === 0 && result.output.includes('Python')) {
                    console.log(`Found Python: ${candidate} (${result.output.trim()})`);
                    return candidate;
                }
            } catch (error) {
                // Continue to next candidate
                continue;
            }
        }

        return null;
    }

    /**
     * Check if all required files exist
     */
    checkRequiredFiles() {
        const requiredFiles = [
            'whisper/transcriber_for_nodejs.py',
            'whisper/standalone_model.py',
            'whisper/standalone_whisper.py',
            'whisper/config.yaml',
            'whisper/mel_filters.npz',
            'whisper/models/WhisperEncoder.onnx',
            'whisper/models/WhisperDecoder.onnx'
        ];

        const workingDir = path.join(__dirname, '..', '..');

        for (const file of requiredFiles) {
            const filePath = path.join(workingDir, file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Required file not found: ${file}`);
            }
        }

        console.log('All required Whisper files found');
    }

    /**
     * Setup handlers for the transcription process
     */
    setupProcessHandlers() {
        if (!this.transcriptionProcess) return;

        // Handle stdout (JSON transcription data)
        this.transcriptionProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    this.handleTranscriptionData(parsed);
                } catch (error) {
                    // Non-JSON output, treat as plain text
                    console.log('Whisper output:', line);
                }
            }
        });

        // Handle stderr
        this.transcriptionProcess.stderr.on('data', (data) => {
            console.error('Whisper error:', data.toString());
            if (this.onErrorCallback) {
                this.onErrorCallback(data.toString());
            }
        });

        // Handle process exit
        this.transcriptionProcess.on('close', (code) => {
            console.log(`Whisper process exited with code ${code}`);
            this.isRunning = false;
            this.transcriptionProcess = null;
        });

        // Handle process errors
        this.transcriptionProcess.on('error', (error) => {
            console.error('Whisper process error:', error);
            this.isRunning = false;
            if (this.onErrorCallback) {
                this.onErrorCallback(error.message);
            }
        });
    }

    /**
     * Handle transcription data from the Python process
     */
    handleTranscriptionData(data) {
        // Add to buffer
        this.transcriptBuffer.push(data);

        // Limit buffer size to prevent memory issues
        if (this.transcriptBuffer.length > 1000) {
            this.transcriptBuffer = this.transcriptBuffer.slice(-800);
        }

        // Call appropriate callback based on data type
        switch (data.type) {
            case 'transcript':
                console.log(`[${data.timestamp}] Transcript: ${data.text}`);
                if (this.onTranscriptCallback) {
                    // Include transcript file path in the callback data
                    const callbackData = {
                        ...data,
                        transcriptFile: data.transcriptFile
                    };
                    this.onTranscriptCallback(callbackData);
                }
                break;

            case 'status':
                console.log(`[${data.timestamp}] Status: ${data.message}`);
                if (this.onStatusCallback) {
                    this.onStatusCallback(data);
                }
                break;

            case 'error':
                console.error(`[${data.timestamp}] Error: ${data.error}`);
                if (this.onErrorCallback) {
                    this.onErrorCallback(data.error);
                }
                break;

            default:
                console.log('Unknown data type:', data);
        }
    }

    /**
     * Check if the service is running
     */
    isServiceRunning() {
        return this.isRunning && this.transcriptionProcess && !this.transcriptionProcess.killed;
    }
}

module.exports = WhisperService;