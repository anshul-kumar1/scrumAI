/**
 * AnythingLLM Chatbot Service
 *
 * This service manages the AnythingLLM chatbot process by spawning
 * a Python child process and handling real-time communication.
 * Similar pattern to whisperService.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ChatbotService {
    constructor() {
        this.chatbotProcess = null;
        this.isRunning = false;
        this.onResponseCallback = null;
        this.onErrorCallback = null;
        this.onStatusCallback = null;
        this.messageQueue = [];
        this.isProcessingMessage = false;
    }

    /**
     * Start the chatbot service
     */
    async start() {
        if (this.isRunning) {
            throw new Error('Chatbot service is already running');
        }

        try {
            // Check if Python is available
            const pythonPath = await this.findPython();
            if (!pythonPath) {
                throw new Error('Python not found. Please ensure Python is installed and in PATH');
            }

            // Check if required files exist
            this.checkRequiredFiles();

            // Start the chatbot process
            const scriptPath = path.join(__dirname, '..', '..', 'whisper', 'anythingLLM', 'chatbot_client.py');
            const workingDir = path.join(__dirname, '..', '..', 'whisper', 'anythingLLM');

            console.log('Starting AnythingLLM chatbot process...');
            console.log('Script path:', scriptPath);
            console.log('Working directory:', workingDir);
            console.log('Python command:', pythonPath);

            this.chatbotProcess = spawn(pythonPath, [scriptPath], {
                cwd: workingDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.setupProcessHandlers();

            // Wait for process to fully initialize before marking as running
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    if (!this.isRunning) {
                        reject(new Error('Chatbot process failed to start within timeout'));
                    } else {
                        resolve();
                    }
                }, 5000);

                // Listen for initial stderr/stdout to confirm process started
                const onData = (data) => {
                    console.log('Chatbot process initial output:', data.toString());
                    this.isRunning = true;
                    clearTimeout(timeout);
                    resolve();
                };

                const onError = (error) => {
                    console.error('Chatbot process startup error:', error);
                    clearTimeout(timeout);
                    reject(error);
                };

                this.chatbotProcess.stdout.once('data', onData);
                this.chatbotProcess.stderr.once('data', onData);
                this.chatbotProcess.once('error', onError);

                // If no output after 2 seconds, assume it started successfully
                setTimeout(() => {
                    if (!this.isRunning) {
                        console.log('No initial output from chatbot process, assuming started');
                        this.isRunning = true;
                        clearTimeout(timeout);
                        resolve();
                    }
                }, 2000);
            });

            console.log('Chatbot service started successfully');

            if (this.onStatusCallback) {
                this.onStatusCallback('started');
            }

            return true;

        } catch (error) {
            console.error('Failed to start chatbot service:', error);
            this.isRunning = false;

            if (this.onErrorCallback) {
                this.onErrorCallback(error);
            }

            throw error;
        }
    }

    /**
     * Stop the chatbot service
     */
    async stop() {
        if (!this.isRunning || !this.chatbotProcess) {
            return;
        }

        console.log('Stopping chatbot service...');

        try {
            // Send quit command
            if (this.chatbotProcess.stdin && !this.chatbotProcess.stdin.destroyed) {
                this.chatbotProcess.stdin.write('quit\n');
                this.chatbotProcess.stdin.end();
            }

            // Wait for graceful shutdown
            await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    if (this.chatbotProcess) {
                        this.chatbotProcess.kill('SIGTERM');
                    }
                    resolve();
                }, 3000);

                this.chatbotProcess.on('close', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });

        } catch (error) {
            console.error('Error during chatbot service shutdown:', error);
        } finally {
            this.isRunning = false;
            this.chatbotProcess = null;
            this.messageQueue = [];
            this.isProcessingMessage = false;

            if (this.onStatusCallback) {
                this.onStatusCallback('stopped');
            }

            console.log('Chatbot service stopped');
        }
    }

    /**
     * Set the live transcript file path
     */
    setLiveTranscriptFile(filePath) {
        this.liveTranscriptFile = filePath;
        console.log('Live transcript file set:', filePath);
    }

    /**
     * Send a message to the chatbot with intelligent context switching
     */
    async sendMessage(message, stream = false, useRAG = false) {
        if (!this.chatbotProcess) {
            throw new Error('Chatbot process not initialized. Please start the chatbot service first.');
        }

        if (!this.isRunning) {
            throw new Error('Chatbot service is not running. Process may have crashed or failed to start.');
        }

        if (this.chatbotProcess.killed || this.chatbotProcess.exitCode !== null) {
            throw new Error('Chatbot process has terminated unexpectedly. Please restart the service.');
        }

        // Determine which mode to use
        const command = this._determineCommand(message, stream, useRAG);
        const data = JSON.stringify({
            command,
            message,
            transcript_file: this.liveTranscriptFile
        });

        return new Promise((resolve, reject) => {
            this.messageQueue.push({ data, resolve, reject, stream });
            this.processMessageQueue();
        });
    }

    /**
     * Determine which command to use based on message type and preferences
     */
    _determineCommand(message, stream, useRAG) {
        if (stream) {
            return 'stream';
        }

        // Use RAG for complex analytical questions
        if (useRAG || this._isComplexQuery(message)) {
            return 'chat_rag';
        }

        // Use live context for recent/immediate questions
        return 'chat';
    }

    /**
     * Determine if a query requires RAG capabilities
     */
    _isComplexQuery(message) {
        const complexKeywords = [
            'summarize', 'summary', 'overview', 'analyze', 'analysis',
            'compare', 'contrast', 'trend', 'pattern', 'insight',
            'decision', 'conclusion', 'recommendation', 'action item',
            'meeting notes', 'key points', 'takeaway'
        ];

        const lowerMessage = message.toLowerCase();
        return complexKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    /**
     * Process the message queue
     */
    processMessageQueue() {
        if (this.isProcessingMessage || this.messageQueue.length === 0) {
            return;
        }

        this.isProcessingMessage = true;
        const { data, resolve, reject, stream } = this.messageQueue.shift();

        let responseBuffer = '';
        let streamBuffer = [];
        const timeout = setTimeout(() => {
            reject(new Error('Message timeout'));
            this.isProcessingMessage = false;
            this.processMessageQueue();
        }, 30000);

        const handleResponse = (chunk) => {
            try {
                const lines = chunk.toString().split('\n').filter(line => line.trim());

                for (const line of lines) {
                    const parsed = JSON.parse(line);

                    if (parsed.type === 'response') {
                        clearTimeout(timeout);
                        this.isProcessingMessage = false;
                        resolve(parsed.data);
                        this.processMessageQueue();
                        return;
                    }

                    if (parsed.type === 'stream_chunk') {
                        streamBuffer.push(parsed.data);
                        if (this.onResponseCallback) {
                            this.onResponseCallback(parsed.data, true);
                        }
                    }

                    if (parsed.type === 'stream_end') {
                        clearTimeout(timeout);
                        this.isProcessingMessage = false;
                        resolve(streamBuffer.join(''));
                        this.processMessageQueue();
                        return;
                    }

                    if (parsed.type === 'error') {
                        clearTimeout(timeout);
                        this.isProcessingMessage = false;
                        reject(new Error(parsed.data));
                        this.processMessageQueue();
                        return;
                    }
                }
            } catch (error) {
                // Accumulate response if not valid JSON yet
                responseBuffer += chunk.toString();
            }
        };

        this.chatbotProcess.stdout.once('data', handleResponse);
        this.chatbotProcess.stdin.write(data + '\n');
    }

    /**
     * Set up process event handlers
     */
    setupProcessHandlers() {
        this.chatbotProcess.stdout.on('data', (data) => {
            // Handle streaming responses in processMessageQueue
        });

        this.chatbotProcess.stderr.on('data', (data) => {
            console.error('Chatbot stderr:', data.toString());
            if (this.onErrorCallback) {
                this.onErrorCallback(new Error(data.toString()));
            }
        });

        this.chatbotProcess.on('close', (code) => {
            console.log('Chatbot process closed with code:', code);
            this.isRunning = false;
            this.chatbotProcess = null;

            if (this.onStatusCallback) {
                this.onStatusCallback('closed');
            }
        });

        this.chatbotProcess.on('error', (error) => {
            console.error('Chatbot process error:', error);
            this.isRunning = false;

            if (this.onErrorCallback) {
                this.onErrorCallback(error);
            }
        });
    }

    /**
     * Check if required files exist
     */
    checkRequiredFiles() {
        const scriptPath = path.join(__dirname, '..', '..', 'whisper', 'anythingLLM', 'chatbot_client.py');
        const configPath = path.join(__dirname, '..', '..', 'whisper', 'anythingLLM', 'config.yaml');

        if (!fs.existsSync(scriptPath)) {
            throw new Error(`Chatbot script not found: ${scriptPath}`);
        }

        if (!fs.existsSync(configPath)) {
            throw new Error(`Chatbot config not found: ${configPath}. Please create and configure it.`);
        }
    }

    /**
     * Find Python executable
     */
    async findPython() {
        const { spawn } = require('child_process');

        const pythonCommands = ['python', 'python3', 'py'];

        for (const cmd of pythonCommands) {
            try {
                const result = await new Promise((resolve) => {
                    const proc = spawn(cmd, ['--version'], { stdio: 'pipe' });
                    proc.on('close', (code) => {
                        resolve(code === 0 ? cmd : null);
                    });
                    proc.on('error', () => resolve(null));
                });

                if (result) {
                    return result;
                }
            } catch (error) {
                continue;
            }
        }

        return null;
    }

    /**
     * Set callback for responses
     */
    setOnResponseCallback(callback) {
        this.onResponseCallback = callback;
    }

    /**
     * Set callback for errors
     */
    setOnErrorCallback(callback) {
        this.onErrorCallback = callback;
    }

    /**
     * Set callback for status changes
     */
    setOnStatusCallback(callback) {
        this.onStatusCallback = callback;
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            hasProcess: !!this.chatbotProcess,
            queueLength: this.messageQueue.length,
            isProcessing: this.isProcessingMessage
        };
    }
}

module.exports = ChatbotService;