-- Unified Comments System: Add parent_id, media_url, and RLS to all comment tables
-- This migration ensures all comment tables support threading, attachments, and proper security

-- 1. Enhance main comments table
ALTER TABLE IF EXISTS public.comments
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.comments
ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.comments
ADD COLUMN IF NOT EXISTS media_url text;

-- Create indexes for parent comments (threading)
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

-- Create comprehensive RLS policies for comments
CREATE POLICY "Anyone can view public comments"
  ON public.comments
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON public.comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Enhance travel_comments table (if exists)
ALTER TABLE IF EXISTS public.travel_comments
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.travel_comments(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.travel_comments
ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.travel_comments
ADD COLUMN IF NOT EXISTS media_url text;

CREATE INDEX IF NOT EXISTS idx_travel_comments_parent_id ON public.travel_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_travel_comments_story_id ON public.travel_comments(story_id);
CREATE INDEX IF NOT EXISTS idx_travel_comments_user_id ON public.travel_comments(user_id);

ALTER TABLE IF EXISTS public.travel_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view travel comments" ON public.travel_comments;
DROP POLICY IF EXISTS "Users can create travel comments" ON public.travel_comments;
DROP POLICY IF EXISTS "Users can update own travel comments" ON public.travel_comments;
DROP POLICY IF EXISTS "Users can delete own travel comments" ON public.travel_comments;

CREATE POLICY "Anyone can view travel comments"
  ON public.travel_comments
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create travel comments"
  ON public.travel_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own travel comments"
  ON public.travel_comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own travel comments"
  ON public.travel_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Enhance story_comments table
ALTER TABLE IF EXISTS public.story_comments
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.story_comments(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.story_comments
ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.story_comments
ADD COLUMN IF NOT EXISTS media_url text;

CREATE INDEX IF NOT EXISTS idx_story_comments_parent_id ON public.story_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_created_at ON public.story_comments(created_at DESC);

-- 4. Create comment_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE IF EXISTS public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can like comments" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can unlike comments" ON public.comment_likes;

CREATE POLICY "Anyone can view comment likes"
  ON public.comment_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can like comments"
  ON public.comment_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments"
  ON public.comment_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for comment likes
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_created_at ON public.comment_likes(created_at DESC);

-- 5. Ensure marketplace_comments has all required fields
ALTER TABLE IF EXISTS public.marketplace_comments
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.marketplace_comments(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.marketplace_comments
ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.marketplace_comments
ADD COLUMN IF NOT EXISTS media_url text;

CREATE INDEX IF NOT EXISTS idx_marketplace_comments_parent_id ON public.marketplace_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_comments_listing_id ON public.marketplace_comments(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_comments_user_id ON public.marketplace_comments(user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_comments TO authenticated;
