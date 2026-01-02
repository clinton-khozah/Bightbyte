-- Add company_logo column to jobs table
-- This stores the company logo URL (uploaded to the same bucket as other media)

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS company_logo TEXT;

-- Add comment for documentation
COMMENT ON COLUMN jobs.company_logo IS 'Company logo URL stored in the same storage bucket as other media files';

