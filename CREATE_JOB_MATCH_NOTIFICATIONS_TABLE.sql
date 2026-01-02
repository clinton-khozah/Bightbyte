-- Create job_match_notifications table
-- This table stores notifications sent to applicants when jobs matching their preferences are posted
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS job_match_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  applicant_email VARCHAR(255) NOT NULL,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  job_title VARCHAR(500) NOT NULL,
  company_name VARCHAR(255),
  match_reason TEXT, -- Why this job matched (e.g., "Matches your preferred category: IT")
  notification_sent BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') -- Notifications expire after 7 days
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_match_notifications_applicant_id ON job_match_notifications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_match_notifications_applicant_email ON job_match_notifications(applicant_email);
CREATE INDEX IF NOT EXISTS idx_job_match_notifications_job_id ON job_match_notifications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_match_notifications_created_at ON job_match_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_match_notifications_expires_at ON job_match_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_job_match_notifications_email_sent ON job_match_notifications(email_sent);
CREATE INDEX IF NOT EXISTS idx_job_match_notifications_viewed ON job_match_notifications(viewed);

-- Enable Row Level Security (RLS)
ALTER TABLE job_match_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own notifications
CREATE POLICY "Users can view their own job match notifications"
  ON job_match_notifications
  FOR SELECT
  USING (auth.uid() = applicant_id);

-- Create policy to allow users to update their own notifications (e.g., mark as viewed)
CREATE POLICY "Users can update their own job match notifications"
  ON job_match_notifications
  FOR UPDATE
  USING (auth.uid() = applicant_id);

-- Create policy to allow system to insert notifications (via service role or function)
CREATE POLICY "Allow insert of job match notifications"
  ON job_match_notifications
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow system to delete expired notifications
CREATE POLICY "Allow delete of job match notifications"
  ON job_match_notifications
  FOR DELETE
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE job_match_notifications IS 'Stores notifications sent to applicants when jobs matching their preferences are posted';
COMMENT ON COLUMN job_match_notifications.match_reason IS 'Explanation of why this job matched the applicant''s preferences';
COMMENT ON COLUMN job_match_notifications.email_sent IS 'Whether the email notification was successfully sent';
COMMENT ON COLUMN job_match_notifications.expires_at IS 'When this notification expires and should be deleted';


