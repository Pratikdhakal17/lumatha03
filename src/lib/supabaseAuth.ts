import { supabase } from '@/integrations/supabase/client';

const REFRESH_ERROR_RE = /Invalid Refresh Token|Refresh Token Not Found|Invalid refresh token/i;

export const clearSupabaseAuthStorage = async () => {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // ignore network/storage errors
  }

  try {
    const keys = Object.keys(localStorage || {});
    keys.forEach((key) => {
      if (/^sb:|supabase|supabase\.auth\.token/i.test(key)) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // ignore storage errors
  }
};

const handleAuthError = async (error: unknown) => {
  const message = String((error as any)?.message || error || '');
  if (REFRESH_ERROR_RE.test(message)) {
    await clearSupabaseAuthStorage();
  }
};

export const safeGetSession = async () => {
  try {
    return await supabase.auth.getSession();
  } catch (error) {
    await handleAuthError(error);
    return { data: { session: null }, error } as any;
  }
};

export const safeGetUser = async () => {
  try {
    return await supabase.auth.getUser();
  } catch (error) {
    await handleAuthError(error);
    return { data: { user: null }, error } as any;
  }
};

export const safeSignOut = async () => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    await handleAuthError(error);
  }
};