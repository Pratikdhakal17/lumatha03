import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const DEFAULT_LIMIT = 40;
const REDACTED_TEXT = '[Hidden by admin]';

const SECTION_TABLES = {
  overview: [],
  posts: ['posts'],
  comments: ['comments', 'marketplace_comments'],
  messages: ['messages'],
  marketplace: ['marketplace_listings'],
  likes: ['likes', 'marketplace_likes'],
  notes: ['keep_notes'],
  follows: ['follows'],
  users: ['profiles'],
  aiChats: ['ai_chat_history'],
};

const safeJson = (value) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
};

const readToken = (req) => {
  const header = req.headers.authorization || req.headers.Authorization || '';
  return header.toString().replace(/^Bearer\s+/i, '').trim();
};

const createPublicClient = (token) =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  });

const createAdminClient = () =>
  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

const normalizeText = (value, fallback = '') => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return fallback;
};

const truncate = (value, limit = 140) => {
  const text = normalizeText(value);
  if (!text) return '';
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
};

const pickPreview = (record, fields) => {
  for (const field of fields) {
    const value = record?.[field];
    if (typeof value === 'string' && value.trim()) return truncate(value.trim());
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return normalizeText(record?.id, 'No preview');
};

const uniqueIds = (...groups) => {
  const ids = new Set();
  groups.flat().forEach((id) => {
    if (typeof id === 'string' && id.trim()) ids.add(id.trim());
  });
  return Array.from(ids);
};

const profileLabel = (profile) => profile?.username || profile?.name || profile?.id || 'Unknown user';

const getProfileMap = async (adminClient, ids) => {
  if (!ids.length) return new Map();
  const { data } = await adminClient
    .from('profiles')
    .select('id, username, name, role, status, avatar_url, total_followers, total_following, total_posts')
    .in('id', ids);
  return new Map((data || []).map((profile) => [profile.id, profile]));
};

const makeRow = ({ section, table, record, profileMap, userId, secondaryUserId, previewFields, extra = {} }) => {
  const userProfile = userId ? profileMap.get(userId) : null;
  const secondaryProfile = secondaryUserId ? profileMap.get(secondaryUserId) : null;

  return {
    id: record.id,
    section,
    table,
    createdAt: record.created_at || null,
    updatedAt: record.updated_at || null,
    userId: userId || null,
    userLabel: profileLabel(userProfile),
    userRole: userProfile?.role || null,
    userStatus: userProfile?.status || null,
    secondaryUserId: secondaryUserId || null,
    secondaryUserLabel: secondaryProfile ? profileLabel(secondaryProfile) : null,
    preview: pickPreview(record, previewFields),
    ...extra,
    raw: safeJson(record),
  };
};

const countRows = async (adminClient, table) => {
  const { count, error } = await adminClient.from(table).select('id', { count: 'exact', head: true });
  return error ? 0 : count || 0;
};

const buildOverview = async (adminClient) => {
  const sections = ['posts', 'comments', 'messages', 'marketplace', 'likes', 'notes', 'follows', 'users', 'aiChats'];
  const counts = {};
  for (const section of sections) {
    const tables = SECTION_TABLES[section] || [];
    let total = 0;
    for (const table of tables) {
      total += await countRows(adminClient, table);
    }
    counts[section] = total;
  }
  return counts;
};

const fetchRows = async (adminClient, table, columns, limit) => {
  const { data, error } = await adminClient.from(table).select(columns).order('created_at', { ascending: false }).limit(limit);
  if (error) {
    return [];
  }
  return data || [];
};

const loadSection = async (adminClient, section, limit = DEFAULT_LIMIT) => {
  const normalizedLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 5), 100) : DEFAULT_LIMIT;
  const sectionKey = section in SECTION_TABLES ? section : 'posts';
  const payload = { section: sectionKey, rows: [] };

  if (sectionKey === 'posts') {
    const rows = await fetchRows(adminClient, 'posts', 'id, created_at, updated_at, title, content, visibility, is_private, likes_count, comments_count, user_id', normalizedLimit);
    const profiles = await getProfileMap(adminClient, uniqueIds(rows.map((row) => row.user_id)));
    payload.rows = rows.map((row) => makeRow({ section: 'posts', table: 'posts', record: row, profileMap: profiles, userId: row.user_id, previewFields: ['title', 'content'], extra: { title: row.title, content: row.content, visibility: row.visibility, isPrivate: row.is_private, likesCount: row.likes_count, commentsCount: row.comments_count } }));
  }

  if (sectionKey === 'comments') {
    const [comments, marketplaceComments] = await Promise.all([
      fetchRows(adminClient, 'comments', 'id, created_at, updated_at, content, post_id, reference_id, user_id', normalizedLimit),
      fetchRows(adminClient, 'marketplace_comments', 'id, created_at, updated_at, content, listing_id, user_id', normalizedLimit),
    ]);
    const profiles = await getProfileMap(adminClient, uniqueIds(comments.map((row) => row.user_id), marketplaceComments.map((row) => row.user_id)));
    payload.rows = [
      ...comments.map((row) => makeRow({ section: 'comments', table: 'comments', record: row, profileMap: profiles, userId: row.user_id, previewFields: ['content'], extra: { content: row.content, postId: row.post_id, referenceId: row.reference_id } })),
      ...marketplaceComments.map((row) => makeRow({ section: 'comments', table: 'marketplace_comments', record: row, profileMap: profiles, userId: row.user_id, previewFields: ['content'], extra: { content: row.content, listingId: row.listing_id } })),
    ];
  }

  if (sectionKey === 'messages') {
    const rows = await fetchRows(adminClient, 'messages', 'id, created_at, updated_at, edited_at, content, media_url, media_type, sender_id, receiver_id, group_id, is_read', normalizedLimit);
    const profiles = await getProfileMap(adminClient, uniqueIds(rows.map((row) => row.sender_id), rows.map((row) => row.receiver_id)));
    payload.rows = rows.map((row) => makeRow({ section: 'messages', table: 'messages', record: row, profileMap: profiles, userId: row.sender_id, secondaryUserId: row.receiver_id, previewFields: ['content', 'media_url'], extra: { content: row.content, editedAt: row.edited_at, mediaUrl: row.media_url, mediaType: row.media_type, receiverId: row.receiver_id, senderId: row.sender_id, groupId: row.group_id, isRead: row.is_read } }));
  }

  if (sectionKey === 'marketplace') {
    const rows = await fetchRows(adminClient, 'marketplace_listings', 'id, created_at, updated_at, title, description, status, type, price, currency, location, likes_count, comments_count, views_count, user_id', normalizedLimit);
    const profiles = await getProfileMap(adminClient, uniqueIds(rows.map((row) => row.user_id)));
    payload.rows = rows.map((row) => makeRow({ section: 'marketplace', table: 'marketplace_listings', record: row, profileMap: profiles, userId: row.user_id, previewFields: ['title', 'description'], extra: { title: row.title, content: row.description, status: row.status, type: row.type, price: row.price, currency: row.currency, location: row.location, likesCount: row.likes_count, commentsCount: row.comments_count, viewsCount: row.views_count } }));
  }

  if (sectionKey === 'likes') {
    const [likes, marketplaceLikes] = await Promise.all([
      fetchRows(adminClient, 'likes', 'id, created_at, user_id, post_id', normalizedLimit),
      fetchRows(adminClient, 'marketplace_likes', 'id, created_at, user_id, listing_id', normalizedLimit),
    ]);
    const profiles = await getProfileMap(adminClient, uniqueIds(likes.map((row) => row.user_id), marketplaceLikes.map((row) => row.user_id)));
    payload.rows = [
      ...likes.map((row) => makeRow({ section: 'likes', table: 'likes', record: row, profileMap: profiles, userId: row.user_id, previewFields: ['post_id'], extra: { postId: row.post_id, kind: 'post-like' } })),
      ...marketplaceLikes.map((row) => makeRow({ section: 'likes', table: 'marketplace_likes', record: row, profileMap: profiles, userId: row.user_id, previewFields: ['listing_id'], extra: { listingId: row.listing_id, kind: 'marketplace-like' } })),
    ];
  }

  if (sectionKey === 'notes') {
    const rows = await fetchRows(adminClient, 'keep_notes', 'id, created_at, updated_at, title, body, note_type, color, is_pinned, is_archived, tags, word_count, user_id', normalizedLimit);
    const profiles = await getProfileMap(adminClient, uniqueIds(rows.map((row) => row.user_id)));
    payload.rows = rows.map((row) => makeRow({ section: 'notes', table: 'keep_notes', record: row, profileMap: profiles, userId: row.user_id, previewFields: ['title', 'body'], extra: { title: row.title, content: row.body, noteType: row.note_type, color: row.color, isPinned: row.is_pinned, isArchived: row.is_archived, tags: row.tags, wordCount: row.word_count } }));
  }

  if (sectionKey === 'follows') {
    const rows = await fetchRows(adminClient, 'follows', 'id, created_at, follower_id, following_id', normalizedLimit);
    const profiles = await getProfileMap(adminClient, uniqueIds(rows.map((row) => row.follower_id), rows.map((row) => row.following_id)));
    payload.rows = rows.map((row) => makeRow({ section: 'follows', table: 'follows', record: row, profileMap: profiles, userId: row.follower_id, secondaryUserId: row.following_id, previewFields: ['follower_id', 'following_id'], extra: { followerId: row.follower_id, followingId: row.following_id, link: `${profileLabel(profiles.get(row.follower_id))} → ${profileLabel(profiles.get(row.following_id))}` } }));
  }

  if (sectionKey === 'users') {
    const rows = await fetchRows(adminClient, 'profiles', 'id, created_at, updated_at, username, name, role, status, avatar_url, total_followers, total_following, total_posts', normalizedLimit);
    payload.rows = rows.map((row) => ({
      id: row.id,
      section: 'users',
      table: 'profiles',
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null,
      userId: row.id,
      userLabel: profileLabel(row),
      userRole: row.role || null,
      userStatus: row.status || null,
      secondaryUserId: null,
      secondaryUserLabel: null,
      preview: `${row.name || row.username || row.id}`,
      role: row.role || null,
      status: row.status || null,
      username: row.username || null,
      name: row.name || null,
      avatarUrl: row.avatar_url || null,
      totalFollowers: row.total_followers || 0,
      totalFollowing: row.total_following || 0,
      totalPosts: row.total_posts || 0,
      raw: safeJson(row),
    }));
  }

  if (sectionKey === 'aiChats') {
    const rows = await fetchRows(adminClient, 'ai_chat_history', 'id, created_at, updated_at, user_id, content, title, role, message, prompt, conversation_id', normalizedLimit);
    const profiles = await getProfileMap(adminClient, uniqueIds(rows.map((row) => row.user_id)));
    payload.rows = rows.map((row) => makeRow({ section: 'aiChats', table: 'ai_chat_history', record: row, profileMap: profiles, userId: row.user_id, previewFields: ['content', 'message', 'prompt', 'title'], extra: { content: row.content || row.message || row.prompt, title: row.title, role: row.role, conversationId: row.conversation_id } }));
  }

  return payload;
};

const requireAdmin = async (req) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Supabase admin credentials are not configured', status: 500 };
  }

  const token = readToken(req);
  if (!token) {
    return { error: 'Unauthorized', status: 401 };
  }

  const publicClient = createPublicClient(token);
  const { data: userData, error: userError } = await publicClient.auth.getUser();
  if (userError || !userData?.user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, role, status, username, name')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: 'Forbidden', status: 403 };
  }

  if (profile.status && ['banned', 'suspended'].includes(String(profile.status))) {
    return { error: 'Account restricted', status: 403 };
  }

  if (profile.role !== 'admin') {
    return { error: 'Forbidden', status: 403 };
  }

  return { user: userData.user, adminClient };
};

const reply = (res, status, body) => res.status(status).json(body);

export default async function handler(req, res) {
  try {
    const guard = await requireAdmin(req);
    if (guard.error) {
      return reply(res, guard.status, { error: guard.error });
    }

    const { adminClient } = guard;

    if (req.method === 'GET') {
      const section = (req.query.section || 'overview').toString();
      const limit = req.query.limit || DEFAULT_LIMIT;

      if (section === 'overview') {
        const summary = await buildOverview(adminClient);
        return reply(res, 200, { success: true, section: 'overview', summary });
      }

      const sectionData = await loadSection(adminClient, section, limit);
      const summary = await buildOverview(adminClient);
      return reply(res, 200, { success: true, ...sectionData, summary });
    }

    if (req.method !== 'POST') {
      return reply(res, 405, { error: 'Method Not Allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action, table, id, userId, patch = {}, field, value, postId, listingId, targetId } = body;

    if (!action || !table) {
      return reply(res, 400, { error: 'action and table are required' });
    }

    const updatePatch = { ...patch };
    if (field && typeof field === 'string') {
      updatePatch[field] = value;
    }

    if (action === 'delete') {
      if (!id) return reply(res, 400, { error: 'id is required' });

      if (table === 'likes' || table === 'marketplace_likes') {
        const countTable = table === 'likes' ? 'posts' : 'marketplace_listings';
        const countField = 'likes_count';
        const relationId = targetId || postId || listingId || patch.postId || patch.listingId || null;
        if (relationId) {
          const { data: currentTarget } = await adminClient.from(countTable).select(countField).eq('id', relationId).maybeSingle();
          const nextCount = Math.max(0, (currentTarget?.[countField] || 0) - 1);
          await adminClient.from(countTable).update({ [countField]: nextCount }).eq('id', relationId);
        }
      }

      if (table === 'marketplace_comments') {
        const relationId = listingId || patch.listingId || null;
        if (relationId) {
          const { data: currentTarget } = await adminClient.from('marketplace_listings').select('comments_count').eq('id', relationId).maybeSingle();
          const nextCount = Math.max(0, (currentTarget?.comments_count || 0) - 1);
          await adminClient.from('marketplace_listings').update({ comments_count: nextCount }).eq('id', relationId);
        }
      }

      if (table === 'profiles' && userId) {
        await adminClient.from('profiles').delete().eq('id', userId);
        const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
        if (authDeleteError) {
          return reply(res, 400, { error: authDeleteError.message });
        }
        return reply(res, 200, { success: true });
      }

      const { error } = await adminClient.from(table).delete().eq('id', id);
      if (error) return reply(res, 400, { error: error.message });
      return reply(res, 200, { success: true });
    }

    if (action === 'edit') {
      if (!id) return reply(res, 400, { error: 'id is required' });
      if (!Object.keys(updatePatch).length) return reply(res, 400, { error: 'patch is required' });

      const { error } = await adminClient.from(table).update(updatePatch).eq('id', id);
      if (error) return reply(res, 400, { error: error.message });
      return reply(res, 200, { success: true });
    }

    if (action === 'hide') {
      if (!id) return reply(res, 400, { error: 'id is required' });

      let error = null;
      const now = new Date().toISOString();

      if (table === 'posts') {
        ({ error } = await adminClient.from('posts').update({ visibility: 'private', is_private: true }).eq('id', id));
      } else if (table === 'marketplace_listings') {
        ({ error } = await adminClient.from('marketplace_listings').update({ status: 'closed' }).eq('id', id));
      } else if (table === 'keep_notes') {
        ({ error } = await adminClient.from('keep_notes').update({ is_archived: true }).eq('id', id));
      } else if (table === 'comments' || table === 'marketplace_comments' || table === 'messages' || table === 'ai_chat_history') {
        const payload = table === 'messages' ? { content: REDACTED_TEXT, updated_at: now, edited_at: now } : { content: REDACTED_TEXT, updated_at: now };
        ({ error } = await adminClient.from(table).update(payload).eq('id', id));
      } else if (table === 'profiles' && userId) {
        ({ error } = await adminClient.from('profiles').update({ status: 'suspended' }).eq('id', userId));
      } else {
        ({ error } = await adminClient.from(table).delete().eq('id', id));
      }

      if (error) return reply(res, 400, { error: error.message });
      return reply(res, 200, { success: true });
    }

    if (action === 'ban' || action === 'suspend' || action === 'restore') {
      const targetUserId = userId || id;
      if (!targetUserId) return reply(res, 400, { error: 'userId is required' });

      const nextStatus = action === 'ban' ? 'banned' : action === 'suspend' ? 'suspended' : 'active';
      const { error } = await adminClient.from('profiles').update({ status: nextStatus }).eq('id', targetUserId);
      if (error) return reply(res, 400, { error: error.message });
      return reply(res, 200, { success: true });
    }

    return reply(res, 400, { error: `Unsupported action: ${action}` });
  } catch (error) {
    console.error('[admin] error', error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}