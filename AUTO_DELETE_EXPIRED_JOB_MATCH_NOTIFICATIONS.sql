-- Create function to auto-delete expired job match notifications
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION delete_expired_job_match_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete notifications that have expired
  WITH deleted AS (
    DELETE FROM job_match_notifications
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

-- Create a cron job to run this function daily (requires pg_cron extension)
-- Note: This requires pg_cron extension to be enabled in Supabase
-- If pg_cron is not available, you can use Supabase Edge Functions instead

-- Uncomment the following if pg_cron is enabled:
-- SELECT cron.schedule(
--   'delete-expired-job-match-notifications',
--   '0 0 * * *', -- Run daily at midnight
--   $$SELECT delete_expired_job_match_notifications()$$
-- );

-- Add comment
COMMENT ON FUNCTION delete_expired_job_match_notifications IS 'Deletes job match notifications that have expired (older than expires_at)';


