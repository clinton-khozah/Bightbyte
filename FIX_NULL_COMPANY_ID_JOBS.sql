-- Fix jobs with null company_id
-- This script updates jobs that were created with null company_id
-- by linking them to the mentor/company based on the user who created them

-- First, let's see which jobs have null company_id
SELECT id, title, company_id, created_at 
FROM jobs 
WHERE company_id IS NULL;

-- Option 1: If mentors table maps to companies (mentor.id = company.id)
-- Update jobs with null company_id to use the mentor's id from mentors table
-- Note: This assumes mentors and companies share the same ID structure
-- You may need to adjust this based on your actual data structure

-- Option 2: Create a company record for each mentor if it doesn't exist
-- Then link jobs to those companies

-- For now, let's update jobs to link to mentors based on created_at timestamp
-- This is a temporary fix - you should ensure company_id is set correctly going forward

-- Example: If you know which mentor created which job, you can update manually:
-- UPDATE jobs SET company_id = 29 WHERE id = 'b919eb1b-c88e-4881-be3d-0c77e20f8de5';

-- Or update all null company_id jobs to a default company (NOT RECOMMENDED for production)
-- UPDATE jobs SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;

-- Better approach: Link jobs to mentors based on user_id if you have that relationship
-- This requires additional columns or a join table

