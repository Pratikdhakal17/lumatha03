import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

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

/**
 * Vercel Serverless function - Resend integration
 * POST /api/resend
 * Body: { type: 'reset'|'verification'|'welcome', email, name?, link? }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    await requireAuth(req);
    const { type, email, name, link } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });
    const key = process.env.RESEND_API_KEY;
    if (!key) return res.status(500).json({ error: 'Resend API key not configured' });
    const resend = new Resend(key);

    let subject = 'Message from Lumatha';
    let html = '';
    if (type === 'reset') {
      subject = 'Reset Your Lumatha Password';
      html = `Hi ${name || 'there'},\n\nPlease reset your password: ${link}`;
    } else if (type === 'verification') {
      subject = 'Verify Your Lumatha Account';
      html = `Hi ${name || 'there'},\n\nPlease verify your account: ${link}`;
    } else if (type === 'welcome') {
      subject = 'Welcome to Lumatha!';
      html = `Hi ${name || ''},\n\nWelcome to Lumatha!`;
    } else {
      subject = req.body.subject || subject;
      html = req.body.html || '';
    }

    const result = await resend.emails.send({
      from: process.env.RESEND_SENDER || 'noreply@lumatha.com',
      to: email,
      subject,
      html,
    });

    return res.status(200).json({ ok: true, id: result.data?.id || null });
  } catch (error) {
    console.error('Resend API error', error);
    const message = (error && error.message) || String(error);
    if (message === 'Unauthorized') {
      return res.status(401).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
}
