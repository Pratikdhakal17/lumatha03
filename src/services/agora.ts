import { supabase } from '@/integrations/supabase/client';

async function buildAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export const fetchAgoraToken = async (channel: string, uid?: number | string) => {
  const authHeaders = await buildAuthHeaders();
  const resp = await fetch('/api/agora-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({ channel, uid }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get Agora token');
  }
  return resp.json();
};

export const initAgoraRTC = async (client: any, channel: string, uid?: number | string) => {
  // Acquire token from server
  const { token, appId } = await fetchAgoraToken(channel, uid);
  // The calling code should use the appId and token to initialize Agora SDK
  return { token, appId };
};
