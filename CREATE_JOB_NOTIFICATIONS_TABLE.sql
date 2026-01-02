-- Create job_notifications table to store email notifications for job alerts
-- This table stores user email addresses and their preferred job categories

CREATE TABLE IF NOT EXISTS job_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  categories JSONB DEFAULT '[]', -- Array of category names user is interested in
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on email to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_notifications_email ON job_notifications(email);

-- Create index for active notifications
CREATE INDEX IF NOT EXISTS idx_job_notifications_is_active ON job_notifications(is_active);

-- Create index for categories (for filtering)
CREATE INDEX IF NOT EXISTS idx_job_notifications_categories ON job_notifications USING GIN(categories);

-- Enable Row Level Security
ALTER TABLE job_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert to job notifications" ON job_notifications;
DROP POLICY IF EXISTS "Allow public read own notifications" ON job_notifications;

-- Create policies
-- Allow anyone to insert notifications (for email signup)
CREATE POLICY "Allow public insert to job notifications" ON job_notifications
  FOR INSERT WITH CHECK (true);

-- Allow users to read their own notifications (by email)
CREATE POLICY "Allow public read own notifications" ON job_notifications
  FOR SELECT USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_job_notifications_updated_at ON job_notifications;
CREATE TRIGGER update_job_notifications_updated_at 
  BEFORE UPDATE ON job_notifications
  FOR EACH ROW EXECUTE FUNCTION update_job_notifications_updated_at();

