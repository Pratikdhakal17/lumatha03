import { useState, useEffect } from 'react';
import { Play, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { FullScreenMediaViewer } from '@/components/FullScreenMediaViewer';

interface PostData {
  id: string;
  title: string;
  content?: string | null;
  media_urls?: string[] | null;
  media_types?: string[] | null;
  file_url?: string | null;
  file_type?: string | null;
  user_id: string;
  profile?: { name: string; avatar_url?: string | null };
}

interface SharedPostPreviewProps {
  postId: string;
  className?: string;
}

const postCache = new Map<string, PostData | null>();

export function SharedPostPreview({ postId, className }: SharedPostPreviewProps) {
  const [post, setPost] = useState<PostData | null>(postCache.get(postId) || null);
  const [loading, setLoading] = useState(!postCache.has(postId));
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    if (postCache.has(postId)) {
      setPost(postCache.get(postId) || null);
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id, title, content, media_urls, media_types, file_url, file_type, user_id, profiles(name, avatar_url)')
          .eq('id', postId)
          .single();

        if (error || !data) {
          postCache.set(postId, null);
          setLoading(false);
          return;
        }

        const postData: PostData = {
          ...data,
          profile: (data as any).profiles || undefined,
        };
        postCache.set(postId, postData);
        setPost(postData);
      } catch {
        postCache.set(postId, null);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <div className={cn('w-full overflow-hidden', className)}>
        <div className="h-40 bg-muted/50 animate-pulse rounded-lg" />
        <div className="pt-2 space-y-1">
          <div className="h-3 bg-muted/50 animate-pulse rounded w-1/3" />
          <div className="h-2.5 bg-muted/50 animate-pulse rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className={cn('w-full p-2', className)}>
        <p className="text-xs text-muted-foreground">Post unavailable</p>
      </div>
    );
  }

  // Get thumbnail
  const thumbnail = post.media_urls?.[0] || post.file_url;
  const mediaType = post.media_types?.[0] || post.file_type;
  const isVideo = mediaType?.startsWith('video');
  const isImage = mediaType?.startsWith('image');

  const mediaUrls = post.media_urls?.length ? post.media_urls.filter(Boolean) : (post.file_url ? [post.file_url] : []);
  const mediaTypes = post.media_types?.length ? post.media_types : (post.file_type ? [post.file_type] : mediaUrls.map(() => 'image'));

  const handleClick = () => {
    if (mediaUrls.length === 0) return;
    setViewerOpen(true);
  };

  const summary = (post.content || '').trim();
  const shortSummary = summary.length > 110 ? `${summary.slice(0, 110).trim()}...` : summary;
  const publicPostUrl = `/public?post=${post.id}`;

  return (
    <>
    <div className={cn('w-full text-left rounded-xl overflow-hidden', className)}>
      {/* Cover - Click for video/image viewer only */}
      <button
        onClick={handleClick}
        className="block w-full overflow-hidden bg-transparent transition-all text-left relative group"
      >
        {thumbnail && (
          <div className="relative w-full aspect-[4/3] max-h-[320px] overflow-hidden bg-[#0f172a]">
            {isVideo ? (
              <>
                <video
                  src={thumbnail}
                  className="w-full h-full object-cover"
                  preload="metadata"
                  muted
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                  <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                  </div>
                </div>
              </>
            ) : isImage ? (
              <img
                src={thumbnail}
                alt={post.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileText className="w-10 h-10 text-muted-foreground/40" />
              </div>
            )}
          </div>
        )}
      </button>

      {/* Details - Name + Description + See More */}
      <div className="pt-2 space-y-0.5">
        <p className="text-[12px] font-semibold text-white">
          {post.profile?.name || 'Unknown'}
        </p>
        {shortSummary ? (
          <p className="text-[13px] text-[#94A3B8] leading-snug">
            {shortSummary}
            {summary.length > 110 && (
              <a href={publicPostUrl} className="text-[13px] text-[#7C3AED] hover:text-[#A78BFA] ml-1">
                ...see more
              </a>
            )}
          </p>
        ) : (
          <a href={publicPostUrl} className="text-[13px] text-[#7C3AED] hover:text-[#A78BFA]">
            View full post →
          </a>
        )}
      </div>
    </div>
    <FullScreenMediaViewer
      open={viewerOpen}
      onOpenChange={setViewerOpen}
      mediaUrls={mediaUrls}
      mediaTypes={mediaTypes}
      title={post.title}
      minimal
    />
    </>
  );
}

/** Extract post ID from internal URLs */
export function extractInternalPostId(text: string): string | null {
  // Match ?post=UUID pattern
  const match = text.match(/[?&]post=([a-f0-9-]{36})/i);
  return match?.[1] || null;
}

/** Check if text is a shared post message */
export function isSharedPostMessage(content: string): boolean {
  return content.startsWith('📤 Shared a post:') || 
         (content.includes('lovableproject.com') && content.includes('post='));
}
