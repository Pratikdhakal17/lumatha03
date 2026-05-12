-- Add media_url column to comments table for comment attachments
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_comments_media_url ON public.comments(media_url) WHERE media_url IS NOT NULL;

-- Comment explaining the new column
-- media_url: Optional URL for images or videos attached to comments
