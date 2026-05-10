import { supabase } from '@/integrations/supabase/client';
import { getPublicUrlSafe } from '@/lib/storageHelpers';

const DEFAULT_STORY_BUCKETS = ['stories-media', 'stories', 'posts-media'] as const;

let cachedStoryBucket: string | null = null;

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const getStoryBucketCandidates = (): string[] => {
  const envBucket = (import.meta.env.VITE_STORIES_BUCKET || import.meta.env.VITE_STORY_BUCKET || '').trim();
  return unique([envBucket, ...DEFAULT_STORY_BUCKETS]);
};

const isBucketMissingError = (message: string) => {
  const msg = message.toLowerCase();
  return (
    msg.includes('bucket not found') ||
    msg.includes('does not exist') ||
    (msg.includes('bucket') && msg.includes('not found'))
  );
};

const extensionFromMime = (mimeType: string) => {
  if (mimeType.includes('jpeg')) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mpeg')) return 'mp3';
  return 'bin';
};

const buildStoryPath = (userId: string, fileName: string, contentType: string) => {
  const maybeExt = fileName.includes('.') ? fileName.split('.').pop() || '' : '';
  const ext = maybeExt || extensionFromMime(contentType);
  return `${userId}/stories/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
};

const resolveStoryBucket = async (): Promise<string[]> => {
  const candidates = getStoryBucketCandidates();

  if (cachedStoryBucket && candidates.includes(cachedStoryBucket)) {
    return [cachedStoryBucket, ...candidates.filter((bucket) => bucket !== cachedStoryBucket)];
  }

  try {
    const { data } = await supabase.storage.listBuckets();
    if (data?.length) {
      const names = new Set(data.map((bucket) => bucket.id || bucket.name));
      const found = candidates.find((bucket) => names.has(bucket));
      if (found) {
        cachedStoryBucket = found;
        return [found, ...candidates.filter((bucket) => bucket !== found)];
      }
    }
  } catch {
    // If listing buckets is blocked by policy, fallback to upload probing.
  }

  return candidates;
};

export async function uploadStoryMediaWithFallback(options: {
  userId: string;
  data: File | Blob;
  fileName?: string;
  contentType?: string;
}) {
  const contentType = options.contentType || (options.data instanceof File ? options.data.type : 'application/octet-stream');
  const fileName = options.fileName || (options.data instanceof File ? options.data.name : `story.${extensionFromMime(contentType)}`);
  const filePath = buildStoryPath(options.userId, fileName, contentType);

  const buckets = await resolveStoryBucket();
  let lastError: string | null = null;
  let missingBucketCount = 0;

  for (const bucket of buckets) {
    const { error } = await supabase.storage.from(bucket).upload(filePath, options.data, {
      cacheControl: '3600',
      upsert: false,
      contentType,
    });

    if (!error) {
      cachedStoryBucket = bucket;
        return { bucket, path: filePath, publicUrl: getPublicUrlSafe(bucket, filePath) ?? '' };
    }

    const message = error.message || 'Unknown storage error';
    lastError = `${bucket}: ${message}`;

    if (isBucketMissingError(message)) {
      missingBucketCount += 1;
      continue;
    }
  }

  if (missingBucketCount === buckets.length) {
    throw new Error(
      `Story storage bucket not found. Create one of: ${buckets.map((b) => `"${b}"`).join(', ')}.`
    );
  }

  throw new Error(lastError || 'Story media upload failed.');
}
