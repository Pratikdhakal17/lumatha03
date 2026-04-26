-- Story social tables hardening
-- Adds legacy tables used by story viewers to avoid runtime 404s.

CREATE TABLE IF NOT EXISTS public.story_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_private boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT '❤️',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_comments_story_id ON public.story_comments(story_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_user_id ON public.story_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_story_id ON public.story_reactions(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_user_id ON public.story_reactions(user_id);

CREATE OR REPLACE FUNCTION public.update_story_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_story_comments_updated_at ON public.story_comments;
CREATE TRIGGER trigger_story_comments_updated_at
  BEFORE UPDATE ON public.story_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_story_comments_updated_at();

ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'story_comments' AND policyname = 'Users can view story comments'
  ) THEN
    CREATE POLICY "Users can view story comments"
      ON public.story_comments
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.stories s
          WHERE s.id = story_comments.story_id
            AND (
              s.user_id = auth.uid()
              OR story_comments.is_private = false
              OR story_comments.user_id = auth.uid()
            )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'story_comments' AND policyname = 'Users can insert story comments'
  ) THEN
    CREATE POLICY "Users can insert story comments"
      ON public.story_comments
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'story_comments' AND policyname = 'Users can update own story comments'
  ) THEN
    CREATE POLICY "Users can update own story comments"
      ON public.story_comments
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'story_comments' AND policyname = 'Users can delete own story comments'
  ) THEN
    CREATE POLICY "Users can delete own story comments"
      ON public.story_comments
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'story_reactions' AND policyname = 'Users can view story reactions'
  ) THEN
    CREATE POLICY "Users can view story reactions"
      ON public.story_reactions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'story_reactions' AND policyname = 'Users can insert own story reactions'
  ) THEN
    CREATE POLICY "Users can insert own story reactions"
      ON public.story_reactions
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'story_reactions' AND policyname = 'Users can update own story reactions'
  ) THEN
    CREATE POLICY "Users can update own story reactions"
      ON public.story_reactions
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'story_reactions' AND policyname = 'Users can delete own story reactions'
  ) THEN
    CREATE POLICY "Users can delete own story reactions"
      ON public.story_reactions
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END
$$;
