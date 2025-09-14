/**
 * Simple Authentication Manager
 * 
 * Handles Supabase authentication with minimal complexity
 */

import { supabase } from './supabaseClient.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.callbacks = [];
    }

    /**
     * Initialize authentication
     */
    async init() {
        try {
            // Get current session
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) throw error;

            if (session) {
                this.currentUser = session.user;
                this.isAuthenticated = true;
                await this.ensureProfile();
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event);
                
                if (event === 'SIGNED_IN' && session) {
                    this.currentUser = session.user;
                    this.isAuthenticated = true;
                    await this.ensureProfile();
                    this.notifyCallbacks('signed-in');
                } else if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                    this.isAuthenticated = false;
                    this.notifyCallbacks('signed-out');
                }
            });

            return { success: true };
        } catch (error) {
            console.error('Auth init failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Sign up with email/password
     */
    async signUp(email, password, userData = {}) {
        try {
            console.log('AuthManager: Starting signup for', email);
            
            if (!supabase) {
                throw new Error('Supabase client not initialized');
            }
            
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: userData.full_name || ''
                    },
                    emailRedirectTo: undefined // Disable email confirmation
                }
            });

            console.log('AuthManager: Supabase signup response', { data, error });

            if (error) {
                console.error('AuthManager: Supabase signup error', error);
                throw error;
            }
            
            console.log('AuthManager: Signup successful', data);
            return { success: true, data };
        } catch (error) {
            console.error('AuthManager: Sign up failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Sign in with email/password
     */
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Sign in failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Sign in with magic link (your existing method)
     */
    async signInWithMagicLink(email) {
        try {
            const { error } = await supabase.auth.signInWithOtp({ 
                email,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Magic link failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Sign out
     */
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Sign out failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Ensure user profile exists in database
     */
    async ensureProfile() {
        if (!this.currentUser) return;

        try {
            // Check if profile exists
            const { data: existingProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (fetchError && fetchError.code === 'PGRST116') {
                // Profile doesn't exist, create it
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: this.currentUser.id,
                        email: this.currentUser.email,
                        full_name: this.currentUser.user_metadata?.full_name || ''
                    }]);

                if (insertError) throw insertError;
                console.log('Profile created for user');
            }
        } catch (error) {
            console.error('Profile creation failed:', error);
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if authenticated
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    /**
     * Add callback for auth state changes
     */
    onAuthChange(callback) {
        this.callbacks.push(callback);
    }

    /**
     * Notify all callbacks
     */
    notifyCallbacks(event) {
        this.callbacks.forEach(callback => callback(event, this.currentUser));
    }
}

// Export singleton
export const authManager = new AuthManager();
