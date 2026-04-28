import { createClient } from '@supabase/supabase-js';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

async function requireAuth(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase auth config missing');
  }
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error('Unauthorized');
  }
  return data.user;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    await requireAuth(req);
    const { channel, uid } = req.body || {};
    if (!channel) return res.status(400).json({ error: 'channel required' });
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    if (!appId || !appCertificate) return res.status(500).json({ error: 'Agora credentials not configured' });

    const role = RtcRole.PUBLISHER;
    // token valid for 1 hour
    const expireTime = 60 * 60;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expireTime;

    const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channel, uid || 0, role, privilegeExpiredTs);
    return res.status(200).json({ token, expire_at: privilegeExpiredTs, appId });
  } catch (error) {
    console.error('Agora token error', error);
    const message = (error && error.message) || String(error);
    if (message === 'Unauthorized') {
      return res.status(401).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
}
