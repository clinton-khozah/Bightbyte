-- Add posted_by field to jobs table to track which user/recruiter posted the job
-- This allows us to filter jobs by the logged-in user even when company_id is null

-- Add posted_by column (UUID to reference auth.users)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON jobs(posted_by);

-- Update existing jobs with null company_id to have posted_by set to the creator
-- Note: This assumes jobs were created by authenticated users
-- You may need to manually update this based on your data

-- Add comment for documentation
COMMENT ON COLUMN jobs.posted_by IS 'UUID of the user who posted this job (from auth.users). Allows filtering jobs by poster even when company_id is null.';

