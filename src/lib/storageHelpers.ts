import { supabase } from '@/integrations/supabase/client';

export function getPublicUrlSafe(bucket: string, path: string): string | null {
  try {
    const res = supabase.storage.from(bucket).getPublicUrl(path);
    // handle both shapes: res.data.publicUrl or res.data?.publicUrl
    // and guard against undefined
    if (res && (res as any).data) {
      // some SDKs use publicUrl or public_url
      const data = (res as any).data;
      return data.publicUrl || data.public_url || null;
    }
    return null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('getPublicUrlSafe failed', bucket, path, err);
    return null;
  }
}
