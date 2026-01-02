-- Create notifications table for job postings
-- Notifications expire after 72 hours and are auto-deleted

CREATE TABLE IF NOT EXISTS job_post_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'job_posted', -- 'job_posted', 'job_updated', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '72 hours'),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_post_notifications_user_id ON job_post_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_post_notifications_user_email ON job_post_notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_job_post_notifications_is_read ON job_post_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_job_post_notifications_created_at ON job_post_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_post_notifications_expires_at ON job_post_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_job_post_notifications_job_id ON job_post_notifications(job_id);

-- Enable Row Level Security
ALTER TABLE job_post_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON job_post_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON job_post_notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON job_post_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON job_post_notifications;

-- Policy: Users can view their own notifications (from last 72 hours)
CREATE POLICY "Users can view their own notifications" ON job_post_notifications
  FOR SELECT
  USING (
    auth.uid() = user_id 
    AND expires_at > NOW()
  );

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON job_post_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON job_post_notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Allow system/service role to insert notifications
-- Note: This requires service role key in application code
CREATE POLICY "System can insert notifications" ON job_post_notifications
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- Function to auto-delete expired notifications
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

-- Create trigger to auto-delete expired notifications on insert/update
-- Note: For automatic deletion, you'll need to set up a cron job or Edge Function
-- This trigger won't work for time-based deletion, but we'll use it for reference

-- Comment for documentation
COMMENT ON TABLE job_post_notifications IS 'Notifications for job postings. Auto-expires after 72 hours.';
COMMENT ON COLUMN job_post_notifications.expires_at IS 'Notifications are automatically deleted after this timestamp (72 hours from creation)';

