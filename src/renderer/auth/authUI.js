/**
 * Simple Authentication UI
 * 
 * Creates a simple login/signup modal that works with existing HTML structure
 */

import { authManager } from './authManager.js';

class AuthUI {
    constructor() {
        this.modal = null;
        this.currentMode = 'signin'; // 'signin', 'signup', 'magic'
    }

    /**
     * Initialize and show auth UI
     */
    init() {
        this.createModal();
        this.setupEventListeners();
        
        // Show modal if not authenticated
        if (!authManager.isUserAuthenticated()) {
            this.show();
        }

        // Listen for auth state changes
        authManager.onAuthChange((event) => {
            if (event === 'signed-in') {
                this.hide();
            } else if (event === 'signed-out') {
                this.show();
            }
        });
    }

    /**
     * Create the auth modal
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'auth-modal';
        this.modal.className = 'auth-modal';
        this.modal.innerHTML = `
            <div class="auth-modal-content">
                <div class="auth-header">
                    <h2>Welcome to ScrumAI</h2>
                    <p>Please sign in to continue</p>
                </div>
                
                <div class="auth-tabs">
                    <button id="signin-tab" class="auth-tab active">Sign In</button>
                    <button id="signup-tab" class="auth-tab">Sign Up</button>
                    <button id="magic-tab" class="auth-tab">Magic Link</button>
                </div>
                
                <div id="auth-forms">
                    <!-- Sign In Form -->
                    <form id="signin-form" class="auth-form active">
                        <div class="form-group">
                            <input type="email" id="signin-email" placeholder="Email" required>
                        </div>
                        <div class="form-group">
                            <input type="password" id="signin-password" placeholder="Password" required>
                        </div>
                        <button type="submit" class="auth-btn">Sign In</button>
                    </form>
                    
                    <!-- Sign Up Form -->
                    <form id="signup-form" class="auth-form">
                        <div class="form-group">
                            <input type="text" id="signup-name" placeholder="Full Name" required>
                        </div>
                        <div class="form-group">
                            <input type="email" id="signup-email" placeholder="Email" required>
                        </div>
                        <div class="form-group">
                            <input type="password" id="signup-password" placeholder="Password" required>
                        </div>
                        <button type="submit" class="auth-btn">Sign Up</button>
                    </form>
                    
                    <!-- Magic Link Form -->
                    <form id="magic-form" class="auth-form">
                        <div class="form-group">
                            <input type="email" id="magic-email" placeholder="Email" required>
                        </div>
                        <button type="submit" class="auth-btn">Send Magic Link</button>
                        <p class="auth-note">Check your email for the login link!</p>
                    </form>
                </div>
                
                <div id="auth-message" class="auth-message"></div>
            </div>
        `;

        // Add styles
        this.addStyles();
        document.body.appendChild(this.modal);
    }

    /**
     * Add CSS styles
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .auth-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            .auth-modal.hidden {
                display: none;
            }
            
            .auth-modal-content {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                width: 90%;
                max-width: 400px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }
            
            .auth-header h2 {
                margin: 0 0 0.5rem 0;
                color: #333;
                text-align: center;
            }
            
            .auth-header p {
                margin: 0 0 2rem 0;
                color: #666;
                text-align: center;
            }
            
            .auth-tabs {
                display: flex;
                margin-bottom: 2rem;
                border-bottom: 1px solid #eee;
            }
            
            .auth-tab {
                flex: 1;
                padding: 0.75rem;
                border: none;
                background: none;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                transition: all 0.2s;
            }
            
            .auth-tab.active {
                border-bottom-color: #007cba;
                color: #007cba;
                font-weight: 500;
            }
            
            .auth-form {
                display: none;
            }
            
            .auth-form.active {
                display: block;
            }
            
            .form-group {
                margin-bottom: 1rem;
            }
            
            .form-group input {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 1rem;
                box-sizing: border-box;
            }
            
            .form-group input:focus {
                outline: none;
                border-color: #007cba;
                box-shadow: 0 0 0 2px rgba(0, 124, 186, 0.1);
            }
            
            .auth-btn {
                width: 100%;
                padding: 0.75rem;
                background: #007cba;
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 1rem;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .auth-btn:hover {
                background: #005a8b;
            }
            
            .auth-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
            }
            
            .auth-message {
                margin-top: 1rem;
                padding: 0.75rem;
                border-radius: 4px;
                text-align: center;
                display: none;
            }
            
            .auth-message.success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
                display: block;
            }
            
            .auth-message.error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                display: block;
            }
            
            .auth-note {
                margin-top: 1rem;
                font-size: 0.9rem;
                color: #666;
                text-align: center;
                display: none;
            }
            
            #magic-form.active .auth-note {
                display: block;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Tab switching
        document.getElementById('signin-tab').addEventListener('click', () => this.switchTab('signin'));
        document.getElementById('signup-tab').addEventListener('click', () => this.switchTab('signup'));
        document.getElementById('magic-tab').addEventListener('click', () => this.switchTab('magic'));

        // Form submissions
        document.getElementById('signin-form').addEventListener('submit', (e) => this.handleSignIn(e));
        document.getElementById('signup-form').addEventListener('submit', (e) => this.handleSignUp(e));
        document.getElementById('magic-form').addEventListener('submit', (e) => this.handleMagicLink(e));
    }

    /**
     * Switch between tabs
     */
    switchTab(mode) {
        this.currentMode = mode;

        // Update tab buttons
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${mode}-tab`).classList.add('active');

        // Update forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${mode}-form`).classList.add('active');

        this.hideMessage();
    }

    /**
     * Handle sign in
     */
    async handleSignIn(event) {
        event.preventDefault();
        
        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('signin-password').value;
        
        console.log('AuthUI: Starting sign-in process for', email);
        
        // Basic validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }
        
        console.log('AuthUI: Email validation passed, calling authManager.signIn...');
        this.setLoading(true);
        
        try {
            const result = await authManager.signIn(email, password);
            console.log('AuthUI: Sign-in result:', result);
        
            if (result.success) {
                this.showMessage('Successfully signed in!', 'success');
            } else {
                this.showMessage(result.error.message, 'error');
            }
        } catch (error) {
            console.error('AuthUI: Sign-in error:', error);
            this.showMessage('Sign-in failed: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Handle sign up
     */
    async handleSignUp(event) {
        event.preventDefault();
        
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        console.log('Starting signup process...', { name, email });
        
        // Basic validation
        if (!name.trim()) {
            this.showMessage('Please enter your full name', 'error');
            return;
        }
        
        if (!email.trim()) {
            this.showMessage('Please enter your email', 'error');
            return;
        }
        
        // Enhanced email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(email)) {
            this.showMessage('Please enter a valid email address (e.g., user@example.com)', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters long', 'error');
            return;
        }
        
        this.setLoading(true);
        
        try {
            console.log('Calling authManager.signUp...');
            const result = await authManager.signUp(email, password, { full_name: name });
            console.log('Signup result:', result);
            
            if (result.success) {
                this.showMessage('Account created successfully! You are now signed in.', 'success');
            } else {
                console.error('Signup failed:', result.error);
                this.showMessage(result.error.message || 'Signup failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showMessage('Signup failed: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Handle magic link
     */
    async handleMagicLink(event) {
        event.preventDefault();
        
        const email = document.getElementById('magic-email').value;
        
        // Basic validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }
        
        this.setLoading(true);
        const result = await authManager.signInWithMagicLink(email);
        
        if (result.success) {
            this.showMessage('Magic link sent! Check your email.', 'success');
        } else {
            this.showMessage(result.error.message, 'error');
        }
        
        this.setLoading(false);
    }

    /**
     * Show/hide loading state
     */
    setLoading(loading) {
        const buttons = document.querySelectorAll('.auth-btn');
        buttons.forEach(btn => {
            btn.disabled = loading;
            btn.textContent = loading ? 'Loading...' : btn.getAttribute('data-original-text') || btn.textContent;
            if (!loading && !btn.getAttribute('data-original-text')) {
                btn.setAttribute('data-original-text', btn.textContent);
            }
        });
    }

    /**
     * Show message
     */
    showMessage(message, type) {
        const messageEl = document.getElementById('auth-message');
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
    }

    /**
     * Hide message
     */
    hideMessage() {
        const messageEl = document.getElementById('auth-message');
        messageEl.className = 'auth-message';
    }

    /**
     * Show modal
     */
    show() {
        if (this.modal) {
            this.modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Hide modal
     */
    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
}

export const authUI = new AuthUI();
