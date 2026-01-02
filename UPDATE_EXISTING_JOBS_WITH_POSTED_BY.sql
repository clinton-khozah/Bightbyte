-- Update existing jobs to set posted_by based on the user who created them
-- This script attempts to match jobs to users based on company_id or other criteria
-- 
-- IMPORTANT: Run ADD_POSTED_BY_TO_JOBS.sql first to add the column!

-- Option 1: Update jobs where company_id matches a mentor's id
-- This sets posted_by to the mentor's user_id
UPDATE jobs j
SET posted_by = m.user_id
FROM mentors m
WHERE j.company_id = m.id
  AND j.posted_by IS NULL
  AND m.user_id IS NOT NULL;

-- Option 2: Update jobs where company_id matches a company's id  
-- This sets posted_by to the company's user_id
UPDATE jobs j
SET posted_by = c.user_id
FROM companies c
WHERE j.company_id = c.id
  AND j.posted_by IS NULL
  AND c.user_id IS NOT NULL;

-- Option 3: For jobs with null company_id, you'll need to manually update them
-- based on who posted them. You can do this by checking:
-- - The application_email field (if it matches a user's email)
-- - The created_at timestamp (if you know when specific users posted)
-- - Or manually update specific job IDs

-- Example: Update a specific job by ID (replace with actual job ID and user ID)
-- UPDATE jobs 
-- SET posted_by = 'USER_UUID_HERE' 
-- WHERE id = 'JOB_UUID_HERE';

-- Check how many jobs still have null posted_by
SELECT COUNT(*) as jobs_without_poster
FROM jobs
WHERE posted_by IS NULL;

-- View jobs that need manual updating
SELECT 
  id,
  title,
  company_id,
  application_email,
  created_at,
  posted_by
FROM jobs
WHERE posted_by IS NULL
ORDER BY created_at DESC
LIMIT 50;

