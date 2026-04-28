# Email System Setup Guide

## Overview
Lumatha uses a two-tier email system:
1. **Supabase Auth** - for core authentication emails (password reset tokens)
2. **Resend** - for branded, transactional email templates

## Setting Up Supabase Email (Required)

### 1. Configure SMTP in Supabase Dashboard

Go to your [Supabase Project](https://supabase.com/dashboard):

1. Navigate to **Settings** → **Email Provider**
2. Choose one of these options:
   - **Supabase Email Provider** (default, limited to 50 emails/day)
   - **SendGrid** (recommended for production)
   - **AWS SES**
   - **Custom SMTP**

### 2. For Production (SendGrid Recommended)

1. Create a SendGrid account at https://sendgrid.com
2. Get your API key
3. In Supabase, select "SendGrid" as provider
4. Paste your SendGrid API key
5. Set the sender email (e.g., `noreply@lumatha.com`)

### 3. Test Supabase Email

```sql
-- In Supabase SQL Editor
select auth.users.email, auth.users.created_at
from auth.users
limit 1;
```

Then test password reset via the Auth.tsx forgot password flow.

---

## Setting Up Resend (Optional but Recommended)

Resend provides beautiful email templates and better deliverability. Perfect for welcome emails and notifications.

### 1. Create Resend Account

1. Go to https://resend.com
2. Sign up and create a project
3. Create a **Public API Key** (safe for frontend)
4. Verify your sender domain (or use default `noreply@resend.dev`)

### 2. Configure in Lumatha

1. Copy your Resend public API key
2. In `.env.local`, add:
   ```
   VITE_RESEND_API_KEY="your-resend-api-key-here"
   ```
3. In `.env` (for Vercel), add the same:
   ```
   VITE_RESEND_API_KEY=your-resend-api-key-here
   ```

### 3. Test Email Sending

The email service is in `src/services/email.ts`. It includes:

- `sendPasswordResetEmail()` - Password reset emails (Note: Supabase handles this)
- `sendVerificationEmail()` - Email verification (for future use)
- `sendWelcomeEmail()` - Welcome emails for new users

---

## Database Schema

### Profiles Table
The profiles table now stores email for faster lookups:

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (LOWER(email));
```

**Migration Applied**: `20260428_add_email_to_profiles.sql`

### Row Level Security (RLS)

Users can only read/update their own email:

```sql
CREATE POLICY "Users can view their own email"
ON public.profiles FOR SELECT
USING (auth.uid() = id);
```

---

## Password Reset Flow

### Current Implementation

1. User enters email in forgot password modal
2. System looks up email in `profiles` table (now has email!)
3. If found, shows user avatar and name for confirmation
4. On confirmation, calls `supabase.auth.resetPasswordForEmail()`
5. Supabase sends password reset email with magic link
6. User receives email with reset code/link
7. User verifies code using `supabase.auth.verifyOtp()`
8. User creates new password with `supabase.auth.updateUser()`

### Error Handling

```typescript
// Email not found
if (error || !data) { 
  setForgotError('Email not found in our system'); 
}

// Invalid code
if (error && error.message?.includes('invalid')) { 
  setForgotError('Invalid or expired code'); 
}

// Session expired
if (error && error.message?.includes('session')) { 
  setForgotError('Session expired. Please request a new reset code.'); 
}
```

---

## Troubleshooting

### "Email not found in our system"

**Possible Causes:**
1. Email was never added to profiles table
2. Email mismatch between signup and lookup
3. Profile RLS policies blocking access

**Solution:**
```sql
-- Check if email exists in profiles
SELECT * FROM public.profiles WHERE email = 'user@email.com';

-- Check auth user
SELECT * FROM auth.users WHERE email = 'user@email.com';

-- Manual email sync (admin only)
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND p.email IS NULL;
```

### Password reset email not received

1. Check Supabase email provider status (Settings → Email Provider)
2. Check spam/junk folder
3. Verify sender domain is trusted
4. For SendGrid: Check bounce/invalid emails list
5. Check Supabase logs in Realtime Inspector

### Resend emails not sending

1. Verify `VITE_RESEND_API_KEY` is set correctly
2. Check browser console for errors
3. Verify sender email is configured in Resend
4. For domain emails, ensure SPF/DKIM records are set

---

## Environment Variables Checklist

### Required
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] Supabase Email Provider configured (in dashboard)

### Recommended  
- [ ] `VITE_RESEND_API_KEY` - Resend API key (for transactional emails)

### Optional
- [ ] Custom sender email address
- [ ] DKIM/SPF records for domain

---

## Next Steps

1. **[URGENT]** Configure Supabase email provider (default was limited)
2. Set up SendGrid for production email sending
3. Add Resend API key for branded emails
4. Test entire password reset flow
5. Add email verification for new signups
6. Set up email templates for notifications

---

## Code References

- **Auth Flow**: `src/pages/Auth.tsx` (lines 195-300)
- **Email Service**: `src/services/email.ts`
- **Profile Storage**: `src/pages/Auth.tsx` (handleSignup, line 287)
- **Migration**: `supabase/migrations/20260428_add_email_to_profiles.sql`

---

## Questions?

For issues or questions:
1. Check Supabase Docs: https://supabase.com/docs/guides/auth/passwords
2. Check Resend Docs: https://resend.com/docs
3. Review Auth.tsx error messages in browser console
