import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TravelStory as TravelStoryType } from '@/integrations/supabase/types';

interface StoryProfile {
  username: string;
  avatar_url: string;
  name: string;
}

export interface TravelStoryItem extends TravelStoryType {
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

interface CreateStoryInput {
  title: string;
  description: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  photos: string[];
}

const normalizeStoryText = (value: string) => value.replace(/\s+/g, ' ').trim();

const storyUniqueCharRatio = (value: string) => {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normalized) return 0;
  return new Set(normalized.split('')).size / normalized.length;
};

const isLowQualityStoryTitle = (value: string) => {
  const title = normalizeStoryText(value);
  if (title.length < 3) return true;
  const words = title.split(' ').filter((word) => /[a-z]/i.test(word));
  if (words.length < 2) return true;
  if (/^([a-z0-9])\1+$/i.test(title.replace(/\s+/g, ''))) return true;
  if (/^\d+$/.test(title.replace(/\s+/g, ''))) return true;
  return storyUniqueCharRatio(title) < 0.4;
};

export function useTravelStories() {
  const { user } = useAuth();
  const [stories, setStories] = useState<TravelStoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likedStoryIds, setLikedStoryIds] = useState<Set<string>>(new Set());
  const [savedStoryIds, setSavedStoryIds] = useState<Set<string>>(new Set());

  const fetchStories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use legacy-safe query to avoid schema-specific 400 errors in production environments.
      const { data: legacyRows, error: legacyError } = await supabase
        .from('posts')
        .select('id,user_id,title,content,location,media_urls,created_at,updated_at,likes_count,category,visibility')
        .or(user?.id ? `visibility.eq.public,user_id.eq.${user.id}` : 'visibility.eq.public')
        .in('category', ['travel_story', 'travel'])
        .order('created_at', { ascending: false })
        .limit(200);

      if (legacyError) {
        throw legacyError;
      }

      const storyRows = legacyRows || [];

      // Also query the dedicated `travel_stories` table and merge results so all stories show up.
      let travelRows: any[] = [];
      try {
        const { data: trows, error: tErr } = await supabase
          .from('travel_stories')
          .select('id,user_id,title,content,description,location,photos,cover_image,created_at,updated_at,likes_count')
          .order('created_at', { ascending: false })
          .limit(200 as any);
        if (!tErr && Array.isArray(trows)) travelRows = trows;
      } catch (e) {
        // non-fatal: continue with legacy posts-only results
        console.warn('Failed to fetch travel_stories table, continuing with posts table only', e);
      }

      const safeStoryRows = [...storyRows, ...travelRows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        title: r.title,
        content: r.content || r.description,
        location: r.location,
        media_urls: r.photos || (r.cover_image ? [r.cover_image] : []),
        created_at: r.created_at,
        updated_at: r.updated_at,
        likes_count: r.likes_count || 0,
        category: 'travel_story',
        visibility: 'public',
      }))];

      console.log(`Fetched ${safeStoryRows.length} travel stories (posts + travel_stories)`);

      const storyIds = safeStoryRows.map((story) => story.id).filter(Boolean);
      const { data: reportRows } = storyIds.length > 0
        ? await (supabase as any).from('post_report_counts').select('post_id,reports_count').in('post_id', storyIds)
        : { data: [] as Array<{ post_id: string; reports_count: number }> };

      const reportCountByPostId = new Map<string, number>();
      (reportRows || []).forEach((row) => {
        const nextCount = typeof row.reports_count === 'number' && Number.isFinite(row.reports_count)
          ? row.reports_count
          : 0;
        reportCountByPostId.set(row.post_id, nextCount);
      });

      const filteredRows = safeStoryRows.filter((story) => {
        const reportCount = reportCountByPostId.get(story.id) || 0;
        if (reportCount >= 3 && story.user_id !== user?.id) return false;
        if (isLowQualityStoryTitle(story.title || '') && story.user_id !== user?.id) return false;
        return true;
      });
      
      const userIds = Array.from(new Set(safeStoryRows.map((story) => story.user_id)));

      type ProfileRow = { id: string; username: string | null; avatar_url: string | null; name: string };
      type LikeRow = { post_id: string };
      type SaveRow = { post_id: string };

      const [{ data: profileRows }, { data: likesRows }, { data: savesRows }] = await Promise.all([
        userIds.length > 0
          ? supabase.from('profiles').select('id,username,avatar_url,name').in('id', userIds)
          : Promise.resolve({ data: [] as ProfileRow[] }),
        user?.id
          ? supabase.from('likes').select('post_id').eq('user_id', user.id)
          : Promise.resolve({ data: [] as LikeRow[] }),
        user?.id
          ? supabase.from('saved').select('post_id').eq('user_id', user.id)
          : Promise.resolve({ data: [] as SaveRow[] }),
      ]);

      const profileById = new Map(
        (profileRows || []).map((profile) => [
          profile.id,
          {
            username: profile.username || profile.name?.toLowerCase().replace(/\s+/g, '_') || 'user',
            avatar_url: profile.avatar_url || '',
            name: profile.name || 'Traveler',
          } satisfies StoryProfile,
        ]),
      );

      const nextLikedIds = new Set((likesRows || []).map((entry) => entry.post_id));
      const nextSavedIds = new Set((savesRows || []).map((entry) => entry.post_id));

      setLikedStoryIds(nextLikedIds);
      setSavedStoryIds(nextSavedIds);

      const mappedStories: TravelStoryItem[] = filteredRows.map((story) => {
        const photos = Array.isArray(story.media_urls) && story.media_urls.length > 0
          ? story.media_urls.filter((url) => typeof url === 'string' && url.length > 0)
          : [];

        const profile = profileById.get(story.user_id) || {
          username: 'user',
          avatar_url: '',
          name: 'Traveler',
        };

        return {
          id: story.id,
          user_id: story.user_id,
          title: story.title || '',
          description: story.content || '',
          location: typeof story.location === 'string' ? story.location : '',
          latitude: null,
          longitude: null,
          photos,
          is_saved: nextSavedIds.has(story.id),
          created_at: story.created_at,
          updated_at: story.updated_at,
          profiles: profile,
          likes_count: story.likes_count || 0,
          comments_count: 0,
          is_liked: nextLikedIds.has(story.id),
        };
      });

      setStories(mappedStories);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to fetch travel stories';
      console.error('Travel stories fetch failed:', fetchError);
      setError(message);
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const createStory = useCallback(
    async (data: CreateStoryInput): Promise<boolean> => {
      if (!user?.id) {
        setError('Please sign in to publish a story.');
        return false;
      }

      const cleanPhotos = data.photos.filter((photo) => photo.trim().length > 0);
      const mediaTypes = cleanPhotos.map(() => 'image');

      try {
        const legacyPayload: Record<string, any> = {
          user_id: user.id,
          title: data.title.trim(),
          content: data.description.trim(),
          location: data.location.trim() || null,
          media_urls: cleanPhotos,
          media_types: mediaTypes,
          file_url: cleanPhotos[0] || null,
          file_type: cleanPhotos[0] ? 'image' : null,
          visibility: 'public',
          category: 'travel_story',
        };

        const { error: insertError } = await supabase.from('posts').insert(legacyPayload as any);

        if (insertError) {
          const errorMsg = `Failed to create story in posts table: ${insertError.message}`;
          console.error('Travel story insert error (posts):', insertError);
          setError(errorMsg);
          return false;
        }

        // Also insert into the dedicated `travel_stories` table so stories reliably appear in the Travel Stories subsection.
        try {
          const { error: tErr } = await supabase.from('travel_stories').insert({
            user_id: user.id,
            title: data.title.trim(),
            content: data.description.trim(),
            description: data.description.trim().slice(0, 200) || null,
            location: data.location.trim() || null,
            cover_image: cleanPhotos[0] || null,
            photos: cleanPhotos,
            moods: [],
            tags: [],
            audience: 'global',
            is_deleted: false,
          });
          if (tErr) console.warn('Travel story inserted into posts but failed to insert into travel_stories:', tErr);
        } catch (e) {
          console.warn('Non-fatal error inserting into travel_stories:', e);
        }

        console.log('Travel story created successfully (posts + travel_stories), refreshing feed...');
        await fetchStories();
        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error creating story';
        console.error('Travel story creation error:', err);
        setError(errorMsg);
        return false;
      }
    },
    [fetchStories, user?.id],
  );

  const saveStory = useCallback(
    async (storyId: string): Promise<void> => {
      if (!user?.id) return;

      const isSaved = savedStoryIds.has(storyId);
      if (isSaved) {
        const { error: deleteError } = await supabase
          .from('saved')
          .delete()
          .eq('post_id', storyId)
          .eq('user_id', user.id);
        if (!deleteError) {
          setSavedStoryIds((prev) => {
            const next = new Set(prev);
            next.delete(storyId);
            return next;
          });
          setStories((prev) => prev.map((story) => (story.id === storyId ? { ...story, is_saved: false } : story)));
        }
      } else {
        const { error: insertError } = await supabase
          .from('saved')
          .insert({ post_id: storyId, user_id: user.id });
        if (!insertError) {
          setSavedStoryIds((prev) => new Set(prev).add(storyId));
          setStories((prev) => prev.map((story) => (story.id === storyId ? { ...story, is_saved: true } : story)));
        }
      }
    },
    [savedStoryIds, user?.id],
  );

  const likeStory = useCallback(
    async (storyId: string): Promise<void> => {
      if (!user?.id) return;

      const isLiked = likedStoryIds.has(storyId);
      if (isLiked) {
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', storyId)
          .eq('user_id', user.id);
        if (!deleteError) {
          setLikedStoryIds((prev) => {
            const next = new Set(prev);
            next.delete(storyId);
            return next;
          });
          setStories((prev) =>
            prev.map((story) =>
              story.id === storyId
                ? { ...story, is_liked: false, likes_count: Math.max(0, story.likes_count - 1) }
                : story,
            ),
          );
        }
      } else {
        const { error: insertError } = await supabase
          .from('likes')
          .insert({ post_id: storyId, user_id: user.id });
        if (!insertError) {
          setLikedStoryIds((prev) => new Set(prev).add(storyId));
          setStories((prev) =>
            prev.map((story) =>
              story.id === storyId
                ? { ...story, is_liked: true, likes_count: story.likes_count + 1 }
                : story,
            ),
          );
        }
      }
    },
    [likedStoryIds, user?.id],
  );

  const savedStories = useMemo(() => stories.filter((story) => savedStoryIds.has(story.id)), [savedStoryIds, stories]);

  useEffect(() => {
    void fetchStories();
  }, [fetchStories]);

  return {
    stories,
    savedStories,
    loading,
    error,
    fetchStories,
    createStory,
    saveStory,
    likeStory,
  };
}
