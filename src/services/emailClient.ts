import { supabase } from '@/integrations/supabase/client';

async function buildAuthHeaders() {
  const { data } = await safeGetSession();
  const accessToken = data.session?.access_token;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export const sendTransactionalEmail = async (payload: { type: 'reset' | 'verification' | 'welcome' | 'custom'; email: string; name?: string; link?: string; subject?: string; html?: string }) => {
  const authHeaders = await buildAuthHeaders();
  const resp = await fetch('/api/resend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send email');
  }
  return resp.json();
};
