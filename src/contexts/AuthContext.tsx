import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { safeGetSession, safeSignOut } from '@/lib/supabaseAuth';

const ACCOUNT_SESSIONS_STORAGE_KEY = 'lumatha_account_sessions';
const MAX_SWITCH_ACCOUNTS = 2;

interface StoredAccountSession {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  displayName: string;
  username: string;
  avatarUrl: string;
  lastUsedAt: string;
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: any;
  accountSessions: StoredAccountSession[];
  activeAccountId: string | null;
  canAddAccount: boolean;
  switchAccount: (accountUserId: string) => Promise<boolean>;
  removeAccount: (accountUserId: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: (userId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
let authBootstrapPromise: Promise<void> | null = null;

const parseStoredSessions = (): StoredAccountSession[] => {
  try {
    const raw = localStorage.getItem(ACCOUNT_SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === 'object' && typeof item.userId === 'string')
      .slice(0, MAX_SWITCH_ACCOUNTS);
  } catch {
    return [];
  }
};

const saveStoredSessions = (sessions: StoredAccountSession[]) => {
  localStorage.setItem(ACCOUNT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SWITCH_ACCOUNTS)));
};

const buildStoredSession = (session: Session, profile?: any): StoredAccountSession => {
  const fallbackName =
    profile?.name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
    session.user.user_metadata?.name ||
    session.user.email ||
    'User';

  return {
    userId: session.user.id,
    email: session.user.email || '',
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at || null,
    displayName: fallbackName,
    username: profile?.username || session.user.user_metadata?.username || '',
    avatarUrl: profile?.avatar_url || session.user.user_metadata?.avatar_url || '',
    lastUsedAt: new Date().toISOString(),
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [accountSessions, setAccountSessions] = useState<StoredAccountSession[]>(() => parseStoredSessions());

  const upsertStoredAccount = (session: Session, profileData?: any) => {
    const nextItem = buildStoredSession(session, profileData);
    setAccountSessions((prev) => {
      const withoutCurrent = prev.filter((item) => item.userId !== nextItem.userId);
      const next = [nextItem, ...withoutCurrent].slice(0, MAX_SWITCH_ACCOUNTS);
      saveStoredSessions(next);
      return next;
    });
  };

  const updateStoredAccountProfile = (userId: string, profileData: any) => {
    setAccountSessions((prev) => {
      const next = prev.map((item) => {
        if (item.userId !== userId) return item;
        return {
          ...item,
          displayName:
            profileData?.name ||
            [profileData?.first_name, profileData?.last_name].filter(Boolean).join(' ').trim() ||
            item.displayName,
          username: profileData?.username || item.username,
          avatarUrl: profileData?.avatar_url || item.avatarUrl,
          lastUsedAt: new Date().toISOString(),
        };
      });
      saveStoredSessions(next);
      return next;
    });
  };

  useEffect(() => {
    if (!authBootstrapPromise) {
      authBootstrapPromise = Promise.resolve().then(() => undefined);
    }

    // Dev bypass: allow setting a localStorage flag to simulate a logged-in user
    // for local testing without valid Supabase sessions.
    try {
      if (import.meta.env.DEV && localStorage.getItem('lumatha_dev_bypass_auth') === '1') {
        const fakeUser = {
          id: 'dev-user-0001',
          email: 'dev@local.test',
          user_metadata: { name: 'Dev User', username: 'dev' },
        } as any;
        const fakeSession = {
          user: fakeUser,
          access_token: 'dev_access_token',
          refresh_token: 'dev_refresh_token',
          expires_at: null,
        } as any;
        setUser(fakeUser);
        loadProfile(fakeUser.id).catch(() => {});
        upsertStoredAccount(fakeSession, { id: fakeUser.id, name: 'Dev User', avatar_url: '' });
      } else {
        // Get initial session
        authBootstrapPromise = authBootstrapPromise.then(() =>
          safeGetSession().then(({ data: { session } }) => {
          setUser(session?.user ?? null);
          if (session?.user) {
            loadProfile(session.user.id);
            upsertStoredAccount(session);
          }
          })
        );
      }
    } catch (e) {
      // fall back to normal behavior
      authBootstrapPromise = authBootstrapPromise?.then(() =>
        safeGetSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
          upsertStoredAccount(session);
        }
        })
      ) || null;
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        upsertStoredAccount(session);
      } else {
        setProfile(null);
        if (event === 'SIGNED_OUT') {
          setAccountSessions(parseStoredSessions());
        }
      }
    });

    // Defensive: if there's no active session but the browser still contains
    // Supabase-stored tokens in localStorage (from a previous session), clear
    // them to avoid the client attempting background refreshes with invalid
    // tokens which produce repeated 400s in the console.
    safeGetSession().then(({ data: { session } }) => {
      if (!session) {
        try {
          const keys = Object.keys(localStorage || {});
          const maybeTokenKey = keys.find((k) => /(^sb:)|supabase|supabase.auth.token/i.test(k));
          if (maybeTokenKey) {
            // Attempt a signOut to clear client storage; ignore network errors.
            safeSignOut().catch(() => {});
            setAccountSessions([]);
            saveStoredSessions([]);
          }
        } catch (e) {
          // ignore
        }
      }
    }).catch(() => {});

    // Global handler: catch unhandled promise rejections that contain the
    // Supabase refresh error and proactively clear stored sessions so the
    // app stops repeatedly attempting invalid refreshes.
    const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
      try {
        const reason = ev && (ev as any).reason;
        const msg = reason && (reason.message || reason.error || String(reason));
        if (typeof msg === 'string' && (msg.includes('Invalid Refresh Token') || msg.includes('Refresh Token Not Found') || msg.includes('Invalid refresh token'))) {
          safeSignOut().catch(() => {});
          setAccountSessions([]);
          saveStoredSessions([]);
        }
      } catch (e) {
        // swallow
      }
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection as EventListener);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', onUnhandledRejection as EventListener);
    };
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
    if (data) updateStoredAccountProfile(userId, data);
  };

  const refreshProfile = async (targetUserId?: string) => {
    const resolvedId = targetUserId || user?.id;
    if (!resolvedId) return;
    await loadProfile(resolvedId);
  };

  const switchAccount = async (accountUserId: string): Promise<boolean> => {
    const target = accountSessions.find((item) => item.userId === accountUserId);
    if (!target) return false;
    if (user?.id === target.userId) return true;

    // Defensive: ensure we have a refresh token to avoid sending empty/invalid tokens
    if (!target.refreshToken) return false;

    // Dev bypass: if using the local dev bypass session tokens, don't call the Supabase
    // backend to set session — just restore the local user state instead.
    try {
      if (
        import.meta.env.DEV &&
        localStorage.getItem('lumatha_dev_bypass_auth') === '1' &&
        target.refreshToken === 'dev_refresh_token'
      ) {
        const fakeUser = {
          id: target.userId,
          email: target.email,
          user_metadata: { name: target.displayName, username: target.username },
        } as any;
        setUser(fakeUser);
        loadProfile(fakeUser.id).catch(() => {});
        upsertStoredAccount({
          user: fakeUser,
          access_token: target.accessToken,
          refresh_token: target.refreshToken,
          expires_at: null,
        } as any);
        return true;
      }

      const { error } = await supabase.auth.setSession({
        access_token: target.accessToken,
        refresh_token: target.refreshToken,
      });

      if (error) {
        // If the refresh token is invalid on the server, remove the stored account
        // so we don't repeatedly attempt to use a bad token.
        try {
          const cleaned = accountSessions.filter((s) => s.userId !== accountUserId);
          setAccountSessions(cleaned);
          saveStoredSessions(cleaned);
        } catch {}
        return false;
      }

      return true;
    } catch (e) {
      // Best-effort: if something goes wrong, remove the stored account to avoid
      // repeated backend 400s and require the user to re-authenticate.
      try {
        const cleaned = accountSessions.filter((s) => s.userId !== accountUserId);
        setAccountSessions(cleaned);
        saveStoredSessions(cleaned);
      } catch {}
      return false;
    }
  };

  const removeAccount = async (accountUserId: string): Promise<boolean> => {
    const exists = accountSessions.some((item) => item.userId === accountUserId);
    if (!exists) return false;

    const isActive = user?.id === accountUserId;
    const remaining = accountSessions.filter((item) => item.userId !== accountUserId);

    if (isActive) {
      if (remaining.length > 0) {
        const next = remaining[0];
        // Defensive: validate next.refreshToken before attempting to set session
        if (!next.refreshToken) {
          // remove the invalid session and continue
          setAccountSessions(remaining.filter((r) => r.userId !== next.userId));
          saveStoredSessions(remaining.filter((r) => r.userId !== next.userId));
        } else if (
          import.meta.env.DEV &&
          localStorage.getItem('lumatha_dev_bypass_auth') === '1' &&
          next.refreshToken === 'dev_refresh_token'
        ) {
          const fakeUser = { id: next.userId, email: next.email, user_metadata: { name: next.displayName, username: next.username } } as any;
          setUser(fakeUser);
          loadProfile(fakeUser.id).catch(() => {});
          upsertStoredAccount({ user: fakeUser, access_token: next.accessToken, refresh_token: next.refreshToken, expires_at: null } as any);
        } else {
          const { error } = await supabase.auth.setSession({
            access_token: next.accessToken,
            refresh_token: next.refreshToken,
          });
          if (error) {
            // drop the invalid token from storage
            const cleaned = remaining.filter((r) => r.userId !== next.userId);
            setAccountSessions(cleaned);
            saveStoredSessions(cleaned);
            return false;
          }
        }
      } else {
        await safeSignOut();
        setUser(null);
        setProfile(null);
      }
    }

    setAccountSessions(remaining);
    saveStoredSessions(remaining);
    return true;
  };

  const logout = async () => {
    await safeSignOut();
    setUser(null);
    setProfile(null);
  };

  const activeAccountId = user?.id || null;
  const canAddAccount = accountSessions.length < MAX_SWITCH_ACCOUNTS;

  return (
    <AuthContext.Provider value={{ user, profile, accountSessions, activeAccountId, canAddAccount, switchAccount, removeAccount, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // During HMR or rare render races components may mount outside the provider.
    // Return a safe fallback to avoid throwing and breaking the entire app while
    // still logging a single helpful error for developers to investigate.
    if (typeof window !== 'undefined' && !(window as any).__lumatha_auth_warning_shown) {
      console.error('useAuth was called outside of AuthProvider — rendering with safe fallback.');
      (window as any).__lumatha_auth_warning_shown = true;
    }

    const fallback: AuthContextType = {
      user: null,
      profile: null,
      accountSessions: [],
      activeAccountId: null,
      canAddAccount: false,
      switchAccount: async () => false,
      removeAccount: async () => false,
      logout: async () => {},
      refreshProfile: async () => {},
    };
    return fallback;
  }
  return context;
};
