-- Add email column to profiles table for password reset and user lookup
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

-- Create unique index on email for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (LOWER(email));

-- Add email from auth.users where available
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND p.email IS NULL;

-- Add constraint to ensure email is not null for new inserts
ALTER TABLE public.profiles
ALTER COLUMN email SET NOT NULL;

-- Add RLS policy to allow users to read their own email
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own email"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
