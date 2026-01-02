-- Auto-delete expired job post notifications (older than 72 hours)
-- This can be run as a cron job or Edge Function

-- Function to delete expired notifications
-- Drop existing function if it exists (in case return type changed)
DROP FUNCTION IF EXISTS delete_expired_job_notifications();

CREATE FUNCTION delete_expired_job_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM job_post_notifications
  WHERE expires_at <= NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- To schedule this function to run automatically (requires pg_cron extension):
-- SELECT cron.schedule('delete-expired-job-notifications', '0 * * * *', 'SELECT delete_expired_job_notifications();');
-- This runs every hour

-- To manually run the deletion:
-- SELECT delete_expired_job_notifications();

-- To check how many notifications will be deleted:
-- SELECT COUNT(*) FROM job_post_notifications WHERE expires_at <= NOW();

