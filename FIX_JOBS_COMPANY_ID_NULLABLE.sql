-- Fix jobs table to explicitly allow NULL company_id
-- This allows jobs to be posted without requiring a company_id

-- Drop the foreign key constraint if it exists
ALTER TABLE IF EXISTS jobs DROP CONSTRAINT IF EXISTS jobs_company_id_fkey;

-- Make sure the column allows NULL (check if NOT NULL constraint exists first)
DO $$
BEGIN
  -- Check if column has NOT NULL constraint and remove it if it does
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'jobs' 
      AND column_name = 'company_id' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE jobs ALTER COLUMN company_id DROP NOT NULL;
  END IF;
END $$;

-- Re-add the foreign key constraint (foreign keys allow NULL by default in PostgreSQL)
ALTER TABLE jobs 
ADD CONSTRAINT jobs_company_id_fkey 
FOREIGN KEY (company_id) 
REFERENCES companies(id) 
ON DELETE CASCADE;

-- Note: Foreign key constraints in PostgreSQL allow NULL by default
-- This script ensures the constraint is properly set up to allow NULL values
-- Jobs can now be created with company_id = NULL

