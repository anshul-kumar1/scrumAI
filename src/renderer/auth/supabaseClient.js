const supabaseUrl = "https://yougbelrgekthpfyutux.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdWdiZWxyZ2VrdGhwZnl1dHV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTUyMTUsImV4cCI6MjA3MzM3MTIxNX0.Y_l0P6pU4-mEyXcFUTxoO0VWra272MC-vbBQmi5LfMQ"

// For Electron with nodeIntegration enabled
let supabase;

try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Supabase client created successfully');
} catch (error) {
    console.error('Failed to create Supabase client:', error);
    supabase = null;
}

export { supabase };