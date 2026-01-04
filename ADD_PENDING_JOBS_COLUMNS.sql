-- Add columns for pending jobs system if they don't exist
-- Run this in Supabase SQL Editor

-- Add source column to track where job came from
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS source VARCHAR(100);

-- Add is_automated flag
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_is_automated ON jobs(is_automated);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);

-- Update existing jobs with null company_id to be marked as potentially automated
-- (if they have external application links)
UPDATE jobs 
SET is_automated = TRUE, source = 'automation'
WHERE company_id IS NULL 
  AND application_link IS NOT NULL 
  AND application_link != ''
  AND status = 'pending'
  AND (is_automated IS NULL OR is_automated = FALSE);

-- Verify the columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND column_name IN ('source', 'is_automated', 'status');

