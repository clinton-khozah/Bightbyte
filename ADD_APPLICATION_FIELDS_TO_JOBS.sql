-- Add application method fields to jobs table
-- This allows companies to specify how applicants should apply (platform, external link, or email)

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS application_method VARCHAR(50) DEFAULT 'platform',
ADD COLUMN IF NOT EXISTS application_link TEXT,
ADD COLUMN IF NOT EXISTS application_email VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN jobs.application_method IS 'How applicants apply: platform (through our system), external_link (company website), or email';
COMMENT ON COLUMN jobs.application_link IS 'External URL to company application page';
COMMENT ON COLUMN jobs.application_email IS 'Email address for email-based applications';

-- Add index for filtering by application method
CREATE INDEX IF NOT EXISTS idx_jobs_application_method ON jobs(application_method);

