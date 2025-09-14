// Load Supabase credentials from environment variables
function getSupabaseCredentials() {
    let supabaseUrl = null;
    let supabaseAnonKey = null;
    
    try {
        // Try to get environment variables from electronAPI if available
        if (window.electronAPI && window.electronAPI.getEnvVar) {
            supabaseUrl = window.electronAPI.getEnvVar('SUPABASE_URL');
            supabaseAnonKey = window.electronAPI.getEnvVar('SUPABASE_ANON_KEY');
        }
        
        // Fallback: check if we're in a development environment with direct access
        if (!supabaseUrl && typeof process !== 'undefined' && process.env) {
            supabaseUrl = process.env.SUPABASE_URL;
            supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        }
        
        if (!supabaseUrl || !supabaseAnonKey) {
            console.warn('Supabase credentials not found in environment variables');
            return { supabaseUrl: null, supabaseAnonKey: null };
        }
        
        console.log('Supabase credentials loaded from environment variables');
        return { supabaseUrl, supabaseAnonKey };
    } catch (error) {
        console.warn('Failed to load Supabase credentials from environment:', error.message);
        return { supabaseUrl: null, supabaseAnonKey: null };
    }
}

const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();

// For Electron with nodeIntegration enabled
let supabase;

try {
    if (supabaseUrl && supabaseAnonKey) {
        const { createClient } = require('@supabase/supabase-js');
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log('Supabase client created successfully');
    } else {
        console.warn('Supabase client not created: Missing credentials');
        supabase = null;
    }
} catch (error) {
    console.error('Failed to create Supabase client:', error);
    supabase = null;
}

export { supabase };