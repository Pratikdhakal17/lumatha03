import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
}

interface LinkPreviewCardProps {
  url: string;
  className?: string;
}

// Simple in-memory cache
const previewCache = new Map<string, LinkPreviewData | null>();

export function LinkPreviewCard({ url, className }: LinkPreviewCardProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(previewCache.get(url) || null);
  const [loading, setLoading] = useState(!previewCache.has(url));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (previewCache.has(url)) {
      const cached = previewCache.get(url);
      setPreview(cached || null);
      setLoading(false);
      setFailed(!cached);
      return;
    }

    const fetchPreview = async () => {
      try {
        const { data, error } = await db.functions.invoke('link-preview', {
          body: { url },
        });

        if (error || !data?.title) {
          previewCache.set(url, null);
          setFailed(true);
        } else {
          const previewData: LinkPreviewData = {
            title: data.title,
            description: data.description,
            image: data.image,
            siteName: data.siteName,
            url,
          };
          previewCache.set(url, previewData);
          setPreview(previewData);
        }
      } catch {
        previewCache.set(url, null);
        setFailed(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (failed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('flex items-center gap-2 text-xs text-primary underline break-all', className)}
      >
        <ExternalLink className="w-3 h-3 shrink-0" />
        {url}
      </a>
    );
  }

  if (loading) {
    return (
      <div className={cn('rounded-xl overflow-hidden border border-border/40 bg-muted/30', className)}>
        <div className="h-32 bg-muted animate-pulse" />
        <div className="p-3 space-y-2">
          <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-2.5 bg-muted animate-pulse rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!preview) return null;

  const domain = (() => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block rounded-xl overflow-hidden border border-border/30 bg-card/50 hover:bg-card/80 transition-colors no-underline',
        'shadow-sm hover:shadow-md',
        className
      )}
    >
      {preview.image && (
        <div className="w-full h-36 overflow-hidden">
          <img
            src={preview.image}
            alt={preview.title || ''}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-3 space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {preview.siteName || domain}
        </p>
        {preview.title && (
          <p className="text-sm font-semibold leading-snug line-clamp-2 text-foreground">{preview.title}</p>
        )}
        {preview.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{preview.description}</p>
        )}
      </div>
    </a>
  );
}

/** Detect URLs in text */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  return text.match(urlRegex) || [];
}
