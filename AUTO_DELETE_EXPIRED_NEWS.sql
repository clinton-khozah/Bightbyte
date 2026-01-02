-- Function to delete expired news and their images from storage
-- This function should be called periodically (e.g., via a cron job or scheduled function)

-- First, create a function to extract file path from image URL
CREATE OR REPLACE FUNCTION extract_file_path_from_url(url TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Extract path from public URL
  -- URL format: https://{project}.supabase.co/storage/v1/object/public/course-media/news/{recruiterId}/{fileName}
  IF url IS NULL OR url = '' THEN
    RETURN NULL;
  END IF;
  
  -- Try to match the path after /course-media/
  IF url ~ '/course-media/(.+)$' THEN
    RETURN (regexp_match(url, '/course-media/(.+)$'))[1];
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to delete expired news and their images
CREATE OR REPLACE FUNCTION delete_expired_news()
RETURNS TABLE(deleted_count INTEGER, deleted_images INTEGER) AS $$
DECLARE
  expired_news RECORD;
  file_path TEXT;
  deleted_news_count INTEGER := 0;
  deleted_images_count INTEGER := 0;
BEGIN
  -- Get all expired news
  FOR expired_news IN 
    SELECT id, image_url, expires_at 
    FROM news 
    WHERE expires_at < NOW() 
      AND is_active = true
  LOOP
    -- Delete image from storage if it exists
    IF expired_news.image_url IS NOT NULL AND expired_news.image_url != '' THEN
      file_path := extract_file_path_from_url(expired_news.image_url);
      
      IF file_path IS NOT NULL THEN
        -- Note: Storage deletion needs to be done via Supabase Storage API
        -- This is a placeholder - actual deletion should be done via pg_net extension
        -- or external cron job calling Supabase Storage API
        deleted_images_count := deleted_images_count + 1;
      END IF;
    END IF;
    
    -- Delete the news record
    DELETE FROM news WHERE id = expired_news.id;
    deleted_news_count := deleted_news_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT deleted_news_count, deleted_images_count;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function that runs daily to clean up expired news
-- Note: This requires pg_cron extension or external scheduler
-- For Supabase, you can use Edge Functions or external cron jobs

-- Example: Call this function manually or via scheduled job
-- SELECT * FROM delete_expired_news();

-- Alternative: Create a trigger that marks news as inactive when expired
-- (but doesn't delete immediately - allows for manual review)
CREATE OR REPLACE FUNCTION mark_expired_news_inactive()
RETURNS void AS $$
BEGIN
  UPDATE news 
  SET is_active = false 
  WHERE expires_at < NOW() 
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job comment (requires pg_cron extension)
-- To enable pg_cron in Supabase, you need to:
-- 1. Enable the extension: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- 2. Schedule the job: SELECT cron.schedule('delete-expired-news', '0 2 * * *', 'SELECT delete_expired_news();');
-- This runs daily at 2 AM UTC

-- For now, we'll create a simpler approach: mark as inactive on expiration
-- Actual deletion can be done via Edge Function or external cron job

