import { useState, useEffect } from 'react';
import { supabase, signInAnonymously, getCurrentUser } from '../lib/supabase';
import { User } from '../types/database';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check for existing session
    console.log('Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('getSession error:', error);
        setError(error as any);
        setLoading(false);
        return;
      }
      if (session?.user) {
        console.log('Found session, loading user:', session.user.id);
        loadUserData(session.user.id);
      } else {
        console.log('No session found');
        setLoading(false);
      }
    }).catch((err) => {
      console.error('getSession exception:', err);
      setError(err);
      setLoading(false);
    });

    // Listen for auth changes
    let isInitialLoad = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('onAuthStateChange event:', event, 'hasSession:', !!session, 'isInitialLoad:', isInitialLoad);
      
      if (session?.user) {
        isInitialLoad = false;
        loadUserData(session.user.id);
      } else {
        // Only clear user on explicit sign out events, not during initial load or token refresh
        // SIGNED_OUT means the user explicitly logged out
        // TOKEN_REFRESHED with no session means the token expired and couldn't be refreshed
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          console.log('Auth state change: Clearing user due to', event);
          setUser(null);
          setLoading(false);
        } else if (event === 'INITIAL_SESSION' && !session) {
          // During initial session check, if no session, we already handled it above
          // Don't clear user here as it might be a temporary state
          console.log('Auth state change: Initial session check, no session found');
          setLoading(false);
        } else if (!isInitialLoad) {
          // If this is not the initial load and there's no session, it might be a real logout
          // But be conservative - only clear if it's been a while since initial load
          console.log('Auth state change: No session after initial load, event:', event);
          // Don't clear user immediately - wait for explicit SIGNED_OUT
        }
        isInitialLoad = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      console.log('Loading user data for:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading user data:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      if (!data) {
        console.log('User record missing for', userId);
        setUser(null);
      } else {
        console.log('User data loaded:', data?.id);
        setUser(data);
      }
    } catch (err: any) {
      console.error('loadUserData error:', err);
      console.error('Error message:', err?.message);
      console.error('Error code:', err?.code);
      console.error('Error details:', err?.details);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (authUser?.id) {
        setLoading(true);
        await loadUserData(authUser.id);
      }
    } catch (err) {
      setError(err as Error);
    }
  };

  const createAnonymousUser = async (username?: string) => {
    try {
      setLoading(true);
      const authData = await signInAnonymously();
      if (!authData.user) throw new Error('Failed to create anonymous user');

      const userId = authData.user.id;

      // Create user record
      console.log('Creating user record...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          username: username || null,
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating user:', userError);
        console.error('Error code:', userError.code);
        console.error('Error message:', userError.message);
        console.error('Error details:', userError.details);
        throw userError;
      }
      console.log('User created:', userData?.id);

      // Create initial strain
      console.log('Creating initial strain...');
      const { data: strainData, error: strainError } = await supabase
        .from('strains')
        .insert({
          origin_user_id: userId,
        })
        .select()
        .single();

      if (strainError) {
        console.error('Error creating strain:', strainError);
        console.error('Error code:', strainError.code);
        console.error('Error message:', strainError.message);
        throw strainError;
      }
      console.log('Strain created:', strainData?.id);

      // Update user with strain
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          current_strain_id: strainData.id,
          root_user_id: userId,
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    createAnonymousUser,
    refreshUser,
  };
}

