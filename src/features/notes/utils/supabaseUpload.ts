import { supabase } from "@/integrations/supabase/client";
import { getPublicUrlSafe } from '@/lib/storageHelpers';

const BUCKET_CANDIDATES = ['note-media', 'note-attachments'] as const;

const getMediaUrl = async (bucket: string, filePath: string) => {
  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365);

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const url = getPublicUrlSafe(bucket, filePath);
  if (url) return url;

  throw new Error('Upload succeeded but media URL could not be generated.');
};

export const uploadNoteMedia = async (file: File, type: 'image' | 'video' | 'audio') => {
import { safeGetUser } from '@/lib/supabaseAuth';
  const { data: authData } = await safeGetUser();
  const user = authData.user;
  if (!user) {
    throw new Error('Please sign in to upload media.');
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`;
  let lastError: any = null;

  try {
    for (const bucket of BUCKET_CANDIDATES) {
      const filePath = `${user.id}/${type}s/${fileName}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type || undefined,
          upsert: false,
        });

      if (!error) {
        return await getMediaUrl(bucket, filePath);
      }

      const msg = error.message || '';
      const bucketMissing =
        msg.includes('Bucket not found') ||
        msg.includes('does not exist') ||
        msg.includes('not found');

      if (bucketMissing) {
        lastError = error;
        continue;
      }

      lastError = error;
      break;
    }

    if (lastError) {
      console.error('Upload error details:', lastError);
      
      // Handle specific error cases with user-friendly messages
      const errorMsg = lastError.message || '';
      
      if (errorMsg.includes('bucket') || errorMsg.includes('Bucket') || errorMsg.includes('row-level security')) {
        throw new Error(
          'Storage not configured for notes uploads. Please create one of these buckets in Supabase Storage: "note-media" or "note-attachments".\n' +
          '1. Go to Supabase Dashboard > Storage\n' +
          '2. Click "New Bucket"\n' +
          '3. Name: "note-media"\n' +
          '4. Enable "Public access"\n' +
          '5. Set max file size to 50MB'
        );
      }
      if (errorMsg.includes('size') || errorMsg.includes('Size')) {
        throw new Error('File is too large. Maximum size is 50MB.');
      }
      if (errorMsg.includes('mime') || errorMsg.includes('type') || errorMsg.includes('format')) {
        throw new Error('File type not allowed. Please use: JPG, PNG, GIF, MP4, or WebM.');
      }
      
      throw new Error(`Upload failed: ${errorMsg}`);
    }

    throw new Error('Upload failed: no storage bucket available.');
  } catch (err: any) {
    console.error('Upload failed:', err);
    throw err;
  }
};
