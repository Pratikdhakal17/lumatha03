import { createClient } from '@supabase/supabase-js';

/**
 * Public endpoint to request a password reset for an email.
 * This endpoint accepts POST { email } and uses the Supabase SERVICE_ROLE_KEY
 * to trigger a password recovery email via the Admin API. It intentionally
 * does NOT require a bearer token so users can request resets while logged out.
 * Rate limiting or recaptcha should be added in production.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase service key not configured' });

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Use admin endpoint to send a recovery email
    const { data, error } = await supabase.auth.admin.resetUserPasswordByEmail(email);
    if (error) {
      console.error('Admin reset error:', error);
      // Map common supabase message
      if (error.message?.includes('User not found')) return res.status(404).json({ error: 'User not found' });
      return res.status(500).json({ error: error.message || 'Failed to request reset' });
    }

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('request-reset error', err);
    return res.status(500).json({ error: (err && err.message) || String(err) });
  }
}
