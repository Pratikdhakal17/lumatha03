import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
}

const AuthContext = createContext<AuthContextType | null>(null);

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
        supabase.auth.getSession().then(({ data: { session } }) => {
          setUser(session?.user ?? null);
          if (session?.user) {
            loadProfile(session.user.id);
            upsertStoredAccount(session);
          }
        });
      }
    } catch (e) {
      // fall back to normal behavior
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
          upsertStoredAccount(session);
        }
      });
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

    return () => subscription.unsubscribe();
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

  const switchAccount = async (accountUserId: string): Promise<boolean> => {
    const target = accountSessions.find((item) => item.userId === accountUserId);
    if (!target) return false;
    if (user?.id === target.userId) return true;

    const { error } = await supabase.auth.setSession({
      access_token: target.accessToken,
      refresh_token: target.refreshToken,
    });

    return !error;
  };

  const removeAccount = async (accountUserId: string): Promise<boolean> => {
    const exists = accountSessions.some((item) => item.userId === accountUserId);
    if (!exists) return false;

    const isActive = user?.id === accountUserId;
    const remaining = accountSessions.filter((item) => item.userId !== accountUserId);

    if (isActive) {
      if (remaining.length > 0) {
        const next = remaining[0];
        const { error } = await supabase.auth.setSession({
          access_token: next.accessToken,
          refresh_token: next.refreshToken,
        });
        if (error) return false;
      } else {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
      }
    }

    setAccountSessions(remaining);
    saveStoredSessions(remaining);
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const activeAccountId = user?.id || null;
  const canAddAccount = accountSessions.length < MAX_SWITCH_ACCOUNTS;

  return (
    <AuthContext.Provider value={{ user, profile, accountSessions, activeAccountId, canAddAccount, switchAccount, removeAccount, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
