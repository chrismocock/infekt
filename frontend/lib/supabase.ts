import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Log environment variables (for debugging - remove in production)
if (__DEV__) {
  console.log('Supabase URL:', supabaseUrl ? 'Set' : 'MISSING');
  console.log('Supabase Key:', supabaseAnonKey ? 'Set' : 'MISSING');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ Missing Supabase credentials! Create .env file with:');
    console.error('EXPO_PUBLIC_SUPABASE_URL=your_url');
    console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper function for anonymous sign-in
export async function signInAnonymously() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data;
}

// Helper function to get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

