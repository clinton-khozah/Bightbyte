-- Add company_name column to jobs table
-- This allows jobs to have a company name even if company_id is NULL
-- Useful for jobs posted by individuals or when company_id is not available

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_company_name ON jobs(company_name);

-- Add comment for documentation
COMMENT ON COLUMN jobs.company_name IS 'Company name for the job posting. Can be set independently of company_id.';

