/**
 * Chat Controller
 *
 * Handles the AnythingLLM chat interface and communication with the chatbot service
 */

class ChatController {
    constructor() {
        this.isInitialized = false;
        this.chatbotService = null;
        this.chatMessages = null;
        this.chatInput = null;
        this.chatSendBtn = null;
        this.chatStatus = null;
        this.messageHistory = [];
        this.isConnected = false;
        this.isConnecting = false;
    }

    /**
     * Initialize the chat controller
     */
    async init() {
        try {
            console.log('Initializing chat controller...');

            // Get DOM elements
            this.chatMessages = document.getElementById('chat-messages');
            this.chatInput = document.getElementById('chat-input');
            this.chatSendBtn = document.getElementById('chat-send');
            this.chatStatus = document.getElementById('chat-status-text');

            if (!this.chatMessages || !this.chatInput || !this.chatSendBtn || !this.chatStatus) {
                throw new Error('Chat DOM elements not found');
            }

            // Set up event listeners
            this.setupEventListeners();

            // Initialize chatbot service connection
            await this.initializeChatbotService();

            // Start chatbot service after initialization
            await this.connectChatbotService();

            this.isInitialized = true;
            console.log('Chat controller initialized successfully');

        } catch (error) {
            console.error('Failed to initialize chat controller:', error);
            this.updateStatus('error', 'Failed to initialize chat');
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Send button click
        this.chatSendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter key in input
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Input change to enable/disable send button
        this.chatInput.addEventListener('input', () => {
            const hasText = this.chatInput.value.trim().length > 0;
            this.chatSendBtn.disabled = !hasText || !this.isConnected;
        });

        // Listen for app events
        document.addEventListener('app-initialized', () => {
            console.log('App initialized, connecting chatbot service...');
            this.connectChatbotService();
        });
    }

    /**
     * Initialize chatbot service
     */
    async initializeChatbotService() {
        try {
            this.updateStatus('connecting', 'Initializing chatbot...');

            // Initialize chatbot service via IPC
            const result = await window.electronAPI?.initializeChatbot();

            if (result && result.success) {
                this.updateStatus('connected', 'Connected');
                this.isConnected = true;
                this.chatSendBtn.disabled = this.chatInput.value.trim().length === 0;
            } else {
                throw new Error(result?.error || 'Failed to initialize chatbot');
            }

        } catch (error) {
            console.error('Chatbot service initialization failed:', error);
            this.updateStatus('error', 'Connection failed');
            this.isConnected = false;
            this.chatSendBtn.disabled = true;
        }
    }

    /**
     * Connect to chatbot service
     */
    async connectChatbotService() {
        if (this.isConnecting || this.isConnected) {
            return;
        }

        try {
            this.isConnecting = true;
            this.updateStatus('connecting', 'Connecting...');

            const result = await window.electronAPI?.startChatbot();

            if (result && result.success) {
                this.updateStatus('connected', 'Connected');
                this.isConnected = true;
                this.chatSendBtn.disabled = this.chatInput.value.trim().length === 0;
            } else {
                throw new Error(result?.error || 'Failed to start chatbot');
            }

        } catch (error) {
            console.error('Chatbot connection failed:', error);
            this.updateStatus('error', 'Connection failed');
            this.isConnected = false;
            this.chatSendBtn.disabled = true;
        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * Send a message to the chatbot
     */
    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || !this.isConnected) {
            return;
        }

        try {
            // Clear input and disable button
            this.chatInput.value = '';
            this.chatSendBtn.disabled = true;

            // Add user message to UI
            this.addMessage(message, 'user');

            // Add loading message
            const loadingId = this.addMessage('...', 'assistant', true);

            // Send to chatbot service
            const response = await window.electronAPI?.sendChatMessage(message);

            // Remove loading message
            this.removeMessage(loadingId);

            if (response && response.success) {
                this.addMessage(response.data, 'assistant');
            } else {
                this.addMessage('Sorry, I encountered an error processing your message.', 'error');
            }

        } catch (error) {
            console.error('Failed to send message:', error);
            this.addMessage('Sorry, I encountered an error processing your message.', 'error');
        } finally {
            this.chatSendBtn.disabled = this.chatInput.value.trim().length === 0 || !this.isConnected;
        }
    }

    /**
     * Add a message to the chat interface
     */
    addMessage(text, type = 'assistant', isLoading = false) {
        const messageId = Date.now() + '_' + Math.random();
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${type}`;
        messageEl.setAttribute('data-message-id', messageId);

        if (isLoading) {
            messageEl.classList.add('streaming');
        }

        messageEl.textContent = text;

        // Remove welcome message if it exists
        const welcomeEl = this.chatMessages.querySelector('.chat-welcome');
        if (welcomeEl) {
            welcomeEl.remove();
        }

        this.chatMessages.appendChild(messageEl);
        this.scrollToBottom();

        // Store in history
        this.messageHistory.push({
            id: messageId,
            text,
            type,
            timestamp: new Date()
        });

        return messageId;
    }

    /**
     * Remove a message from the chat interface
     */
    removeMessage(messageId) {
        const messageEl = this.chatMessages.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            messageEl.remove();
        }

        // Remove from history
        this.messageHistory = this.messageHistory.filter(msg => msg.id !== messageId);
    }

    /**
     * Update chat status
     */
    updateStatus(status, message) {
        if (!this.chatStatus) return;

        this.chatStatus.textContent = message;
        this.chatStatus.className = `chat-status-text ${status}`;
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        if (this.chatMessages) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    /**
     * Clear chat messages
     */
    clearMessages() {
        if (this.chatMessages) {
            this.chatMessages.innerHTML = `
                <div class="chat-welcome">
                    <p>💬 AnythingLLM Assistant</p>
                    <p class="chat-subtitle">Ask questions about your meeting or anything else!</p>
                </div>
            `;
        }
        this.messageHistory = [];
    }

    /**
     * Get chat status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isConnected: this.isConnected,
            isConnecting: this.isConnecting,
            messageCount: this.messageHistory.length
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        this.isInitialized = false;
        this.isConnected = false;
        this.isConnecting = false;
        this.messageHistory = [];

        // Remove event listeners would go here if needed
    }
}

export { ChatController };