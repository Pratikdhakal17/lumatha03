-- Marketplace + Notes hardening migration
-- Ensures key columns/tables exist in environments with partial migrations.

ALTER TABLE IF EXISTS public.marketplace_profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS location text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_phone_verified boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.keep_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT,
  media_urls TEXT[] DEFAULT '{}',
  note_type TEXT DEFAULT 'text' CHECK (note_type IN ('text', 'image', 'drawing', 'video', 'mixed')),
  color TEXT DEFAULT '#1a2332',
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  word_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_keep_notes_user_id ON public.keep_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_keep_notes_updated_at ON public.keep_notes(updated_at DESC);

CREATE OR REPLACE FUNCTION public.update_keep_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_keep_notes_updated_at ON public.keep_notes;
CREATE TRIGGER trigger_keep_notes_updated_at
  BEFORE UPDATE ON public.keep_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_keep_notes_updated_at();

ALTER TABLE public.keep_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'keep_notes'
      AND policyname = 'Users can view their own notes'
  ) THEN
    CREATE POLICY "Users can view their own notes"
      ON public.keep_notes
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'keep_notes'
      AND policyname = 'Users can insert their own notes'
  ) THEN
    CREATE POLICY "Users can insert their own notes"
      ON public.keep_notes
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'keep_notes'
      AND policyname = 'Users can update their own notes'
  ) THEN
    CREATE POLICY "Users can update their own notes"
      ON public.keep_notes
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'keep_notes'
      AND policyname = 'Users can delete their own notes'
  ) THEN
    CREATE POLICY "Users can delete their own notes"
      ON public.keep_notes
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END
$$;
