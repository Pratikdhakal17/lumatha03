'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AlertTriangle, Ban, EyeOff, PencilLine, RefreshCw, Search, Trash2, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';

type SectionKey = 'overview' | 'posts' | 'comments' | 'messages' | 'marketplace' | 'likes' | 'notes' | 'follows' | 'users' | 'aiChats';

type AdminRow = {
  id: string;
  section: SectionKey;
  table: string;
  createdAt: string | null;
  updatedAt: string | null;
  userId: string | null;
  userLabel: string;
  userRole?: string | null;
  userStatus?: string | null;
  secondaryUserId?: string | null;
  secondaryUserLabel?: string | null;
  preview: string;
  title?: string | null;
  content?: string | null;
  visibility?: string | null;
  isPrivate?: boolean | null;
  status?: string | null;
  noteType?: string | null;
  color?: string | null;
  isPinned?: boolean | null;
  isArchived?: boolean | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  viewsCount?: number | null;
  price?: number | null;
  currency?: string | null;
  location?: string | null;
  type?: string | null;
  role?: string | null;
  link?: string | null;
  followerId?: string | null;
  followingId?: string | null;
  postId?: string | null;
  listingId?: string | null;
  referenceId?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  editedAt?: string | null;
  groupId?: string | null;
  isRead?: boolean | null;
  avatarUrl?: string | null;
  totalFollowers?: number | null;
  totalFollowing?: number | null;
  totalPosts?: number | null;
  raw?: any;
};

type SectionData = {
  rows: AdminRow[];
  summary: Record<string, number>;
};

type EditDraft = {
  id: string;
  table: string;
  section: SectionKey;
  values: Record<string, string>;
};

const SECTION_CONFIG: Array<{ key: SectionKey; label: string; description: string }> = [
  { key: 'overview', label: 'Overview', description: 'Live counts' },
  { key: 'posts', label: 'Posts', description: 'Feed content' },
  { key: 'comments', label: 'Comments', description: 'Post + marketplace comments' },
  { key: 'messages', label: 'Messages', description: 'Chat moderation' },
  { key: 'marketplace', label: 'Marketplace', description: 'Listings control' },
  { key: 'likes', label: 'Likes', description: 'Post + listing likes' },
  { key: 'notes', label: 'Notes', description: 'Keep notes' },
  { key: 'follows', label: 'Follows', description: 'Connections' },
  { key: 'users', label: 'Users', description: 'Roles + status' },
  { key: 'aiChats', label: 'AI Chats', description: 'Assistant history' },
];

const defaultSummary = SECTION_CONFIG.reduce((acc, section) => {
  if (section.key !== 'overview') acc[section.key] = 0;
  return acc;
}, {} as Record<string, number>);

const defaultSectionData = (): Record<SectionKey, SectionData> => ({
  overview: { rows: [], summary: defaultSummary },
  posts: { rows: [], summary: defaultSummary },
  comments: { rows: [], summary: defaultSummary },
  messages: { rows: [], summary: defaultSummary },
  marketplace: { rows: [], summary: defaultSummary },
  likes: { rows: [], summary: defaultSummary },
  notes: { rows: [], summary: defaultSummary },
  follows: { rows: [], summary: defaultSummary },
  users: { rows: [], summary: defaultSummary },
  aiChats: { rows: [], summary: defaultSummary },
});

const contentFields = (row: AdminRow) => {
  if (row.section === 'posts') return ['title', 'content', 'visibility'];
  if (row.section === 'comments' || row.section === 'messages' || row.section === 'aiChats') return ['content'];
  if (row.section === 'marketplace') return ['title', 'content', 'status'];
  if (row.section === 'notes') return ['title', 'content'];
  if (row.section === 'users') return ['status', 'role'];
  return [];
};

const displayLabel = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'Unknown';
  return String(value);
};

const shorten = (value: string, limit = 110) => (value.length > limit ? `${value.slice(0, limit)}...` : value);

const formatDate = (value: string | null) => {
  if (!value) return 'Unknown';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unknown' : parsed.toLocaleString();
};

const buildDraft = (row: AdminRow): EditDraft => {
  const values: Record<string, string> = {};
  for (const field of contentFields(row)) {
    values[field] = row[field as keyof AdminRow] == null ? '' : String(row[field as keyof AdminRow]);
  }
  return { id: row.id, table: row.table, section: row.section, values };
};

const contentSummary = (row: AdminRow) => {
  if (row.section === 'messages' && row.secondaryUserLabel) return `${row.userLabel} → ${row.secondaryUserLabel}`;
  if (row.section === 'follows' && row.link) return row.link;
  if (row.section === 'likes' && row.postId) return row.table === 'marketplace_likes' ? `Listing ${row.listingId}` : `Post ${row.postId}`;
  if (row.section === 'users') return `${row.userLabel}${row.userRole ? ` · ${row.userRole}` : ''}${row.userStatus ? ` · ${row.userStatus}` : ''}`;
  return row.preview || row.title || row.content || row.id;
};

const actionAvailability = (row: AdminRow) => ({
  canEdit: ['posts', 'comments', 'messages', 'marketplace', 'notes', 'users', 'aiChats'].includes(row.section),
  canHide: true,
  canBan: row.section !== 'overview',
});

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [data, setData] = useState<Record<SectionKey, SectionData>>(defaultSectionData);
  const [loadingSection, setLoadingSection] = useState<SectionKey | null>('overview');
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    if (user && profile && profile.role !== 'admin') {
      navigate('/');
    }
  }, [navigate, profile, user]);

  const getAuthHeader = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('No active session');
    return { Authorization: `Bearer ${token}` };
  }, []);

  const loadSection = useCallback(async (section: SectionKey) => {
    if (!user || !profile || profile.role !== 'admin') return;

    if (section === 'overview') {
      setLoadingSection('overview');
      try {
        const headers = await getAuthHeader();
        const response = await fetch('/api/admin?section=overview', { headers });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'Failed to load overview');

        setData((current) => ({
          ...current,
          overview: { rows: [], summary: body.summary || defaultSummary },
        }));
      } catch (err: any) {
        setError(err?.message || 'Failed to load overview');
        toast.error(err?.message || 'Failed to load overview');
      } finally {
        setLoadingSection(null);
      }
      return;
    }

    setLoadingSection(section);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/admin?section=${encodeURIComponent(section)}&limit=50`, { headers });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `Failed to load ${section}`);

      setData((current) => ({
        ...current,
        [section]: {
          rows: Array.isArray(body.rows) ? body.rows : [],
          summary: body.summary || current.overview.summary,
        },
        overview: body.summary ? { rows: [], summary: body.summary } : current.overview,
      }));
    } catch (err: any) {
      setError(err?.message || 'Failed to load admin data');
      toast.error(err?.message || 'Failed to load admin data');
    } finally {
      setLoadingSection(null);
    }
  }, [getAuthHeader, profile, user]);

  useEffect(() => {
    if (!user || !profile || profile.role !== 'admin') return;
    void loadSection(activeSection);
  }, [activeSection, loadSection, profile, refreshCounter, user]);

  const currentRows = useMemo(() => {
    const rows = data[activeSection]?.rows || [];
    const lowered = query.trim().toLowerCase();
    if (!lowered) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.userLabel,
        row.secondaryUserLabel,
        row.preview,
        row.title,
        row.content,
        row.status,
        row.visibility,
        row.role,
        row.link,
        row.table,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(lowered);
    });
  }, [activeSection, data, query]);

  const summaryCards = useMemo(() => {
    const summary = data.overview.summary || defaultSummary;
    return [
      { key: 'posts', label: 'Posts', value: summary.posts || 0 },
      { key: 'comments', label: 'Comments', value: summary.comments || 0 },
      { key: 'messages', label: 'Messages', value: summary.messages || 0 },
      { key: 'marketplace', label: 'Marketplace', value: summary.marketplace || 0 },
      { key: 'users', label: 'Users', value: summary.users || 0 },
      { key: 'likes', label: 'Likes', value: summary.likes || 0 },
    ];
  }, [data.overview.summary]);

  const refreshCurrent = async () => {
    setRefreshCounter((value) => value + 1);
    await loadSection(activeSection);
  };

  const mutate = useCallback(async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const headers = await getAuthHeader();
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Action failed');
      toast.success('Action completed');
      await refreshCurrent();
    } catch (err: any) {
      toast.error(err?.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  }, [getAuthHeader]);

  const openEdit = (row: AdminRow) => setEditDraft(buildDraft(row));

  const submitEdit = async () => {
    if (!editDraft) return;
    await mutate({ action: 'edit', table: editDraft.table, id: editDraft.id, patch: editDraft.values });
    setEditDraft(null);
  };

  const handleDelete = async (row: AdminRow) => {
    if (!window.confirm(`Delete this ${row.section === 'users' ? 'user account' : row.table} entry?`)) return;
    await mutate({
      action: 'delete',
      table: row.table,
      id: row.id,
      userId: row.userId,
      postId: row.postId,
      listingId: row.listingId,
      targetId: row.postId || row.listingId || null,
    });
  };

  const handleHide = async (row: AdminRow) => {
    await mutate({ action: 'hide', table: row.table, id: row.id, userId: row.userId, listingId: row.listingId });
  };

  const handleBan = async (row: AdminRow) => {
    await mutate({ action: 'ban', table: 'profiles', id: row.userId || row.id, userId: row.userId || row.id });
  };

  const pageLabel = SECTION_CONFIG.find((section) => section.key === activeSection)?.label || 'Overview';

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-slate-100 flex items-center justify-center px-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-slate-300 shadow-2xl shadow-black/30">
          Loading admin session...
        </div>
      </div>
    );
  }

  if (profile.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
          <aside className="rounded-[28px] border border-white/10 bg-[#111827] p-4 shadow-2xl shadow-black/30">
            <div className="mb-5 rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-950 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
                  <UserCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/80">Lumatha Admin</p>
                  <h1 className="text-xl font-semibold text-white">Meta Console</h1>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-400">Moderate posts, comments, messages, likes, listings, notes, follows, and accounts from one place.</p>
            </div>

            <div className="space-y-2">
              {SECTION_CONFIG.map((section) => {
                const active = activeSection === section.key;
                const count = section.key === 'overview' ? 0 : data.overview.summary?.[section.key] || data[section.key]?.rows?.length || 0;
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveSection(section.key)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all',
                      active ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 bg-white/0 text-slate-300 hover:border-white/20 hover:bg-white/5'
                    )}
                  >
                    <div>
                      <div className="text-sm font-semibold">{section.label}</div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{section.description}</div>
                    </div>
                    <Badge variant="secondary" className="border-white/10 bg-white/5 text-slate-200">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="rounded-[28px] border border-white/10 bg-[#111827]/95 shadow-2xl shadow-black/30">
            <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Control center</p>
                  <h2 className="mt-1 text-3xl font-semibold text-white">{pageLabel}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    Meta-level control over user-generated content and account state. Actions are executed through the serverless admin endpoint with the service role key.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" onClick={() => void refreshCurrent()} disabled={loadingSection !== null || saving}>
                    <RefreshCw className={cn('mr-2 h-4 w-4', (loadingSection !== null || saving) && 'animate-spin')} />
                    Refresh
                  </Button>
                  <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={() => setActiveSection('users')}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Review users
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                {summaryCards.map((card) => (
                  <button key={card.key} type="button" onClick={() => setActiveSection(card.key as SectionKey)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/5">
                    <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{card.label}</div>
                    <div className="mt-1 text-2xl font-semibold text-white">{card.value}</div>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-400">
                  <Search className="h-4 w-4 text-slate-500" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search usernames, previews, statuses, links..."
                    className="border-0 bg-transparent p-0 text-slate-100 placeholder:text-slate-500 focus-visible:ring-0"
                  />
                </div>
                <div className="text-sm text-slate-400">
                  Signed in as <span className="text-white">{displayLabel(profile.username || profile.name || user.email || user.id)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {error && (
                <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}

              {activeSection === 'overview' ? (
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {sectionConfig.filter((section) => section.key !== 'overview').map((section) => (
                    <button key={section.key} type="button" onClick={() => setActiveSection(section.key)} className="rounded-3xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/5">
                      <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{section.label}</div>
                      <div className="mt-2 text-3xl font-semibold text-white">{data.overview.summary?.[section.key] || 0}</div>
                      <div className="mt-2 text-sm text-slate-400">Open this section to review, edit, hide, delete, or ban related records.</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-white/10">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                      <thead className="bg-white/5 text-left text-[11px] uppercase tracking-[0.3em] text-slate-400">
                        <tr>
                          <th className="px-4 py-4 font-medium">User</th>
                          <th className="px-4 py-4 font-medium">Content preview</th>
                          <th className="px-4 py-4 font-medium">Date</th>
                          <th className="px-4 py-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-[#0d1117]">
                        {(loadingSection === activeSection ? [] : currentRows).map((row) => {
                          const actions = actionAvailability(row);
                          const summary = shorten(contentSummary(row));
                          return (
                            <tr key={`${row.table}-${row.id}`} className="align-top transition hover:bg-white/5">
                              <td className="px-4 py-4">
                                <div className="text-sm font-medium text-white">{row.userLabel}</div>
                                <div className="mt-1 text-xs text-slate-500">{displayLabel(row.userRole || row.userStatus || row.userId)}</div>
                                {row.secondaryUserLabel && <div className="mt-1 text-xs text-slate-500">{row.secondaryUserLabel}</div>}
                              </td>
                              <td className="px-4 py-4">
                                <div className="max-w-xl text-sm text-slate-300">{summary}</div>
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                                  {row.visibility && <span className="rounded-full border border-white/10 px-2 py-1">{row.visibility}</span>}
                                  {row.status && <span className="rounded-full border border-white/10 px-2 py-1">{row.status}</span>}
                                  {row.isArchived !== undefined && <span className="rounded-full border border-white/10 px-2 py-1">{row.isArchived ? 'archived' : 'active'}</span>}
                                  {row.isPrivate !== undefined && <span className="rounded-full border border-white/10 px-2 py-1">{row.isPrivate ? 'private' : 'public'}</span>}
                                  {row.price != null && <span className="rounded-full border border-white/10 px-2 py-1">{row.currency || 'NPR'} {row.price}</span>}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-400">{formatDate(row.createdAt || row.updatedAt)}</td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" onClick={() => handleDelete(row)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </Button>
                                  {actions.canEdit && (
                                    <Button variant="outline" size="sm" className="border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20" onClick={() => openEdit(row)}>
                                      <PencilLine className="mr-2 h-4 w-4" />
                                      Edit
                                    </Button>
                                  )}
                                  {actions.canHide && (
                                    <Button variant="outline" size="sm" className="border-amber-400/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20" onClick={() => handleHide(row)}>
                                      <EyeOff className="mr-2 h-4 w-4" />
                                      Hide
                                    </Button>
                                  )}
                                  {actions.canBan && (
                                    <Button variant="outline" size="sm" className="border-rose-400/30 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20" onClick={() => handleBan(row)}>
                                      <Ban className="mr-2 h-4 w-4" />
                                      Ban
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {loadingSection === activeSection && (
                          <tr>
                            <td colSpan={4} className="px-4 py-16 text-center text-sm text-slate-400">
                              Loading {pageLabel.toLowerCase()}...
                            </td>
                          </tr>
                        )}

                        {loadingSection !== activeSection && currentRows.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-16 text-center text-sm text-slate-400">
                              No records found for this section.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <Dialog open={!!editDraft} onOpenChange={(open) => !open && setEditDraft(null)}>
        <DialogContent className="max-w-2xl border-white/10 bg-[#111827] text-slate-100">
          <DialogHeader>
            <DialogTitle>Edit record</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update the record and save to push the change through the admin API.
            </DialogDescription>
          </DialogHeader>

          {editDraft && (
            <div className="space-y-4">
              {contentFields({ section: editDraft.section, table: editDraft.table, id: editDraft.id, createdAt: null, updatedAt: null, userId: null, userLabel: '', preview: '' } as AdminRow).map((field) => (
                <div key={field} className="space-y-2">
                  <div className="text-sm font-medium text-white">{field}</div>
                  {field === 'content' ? (
                    <Textarea
                      value={editDraft.values[field] || ''}
                      onChange={(event) => setEditDraft((current) => current ? { ...current, values: { ...current.values, [field]: event.target.value } } : current)}
                      className="min-h-[120px] border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
                    />
                  ) : (
                    <Input
                      value={editDraft.values[field] || ''}
                      onChange={(event) => setEditDraft((current) => current ? { ...current, values: { ...current.values, [field]: event.target.value } } : current)}
                      className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" onClick={() => setEditDraft(null)}>
              Cancel
            </Button>
            <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={() => void submitEdit()} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminDashboard;