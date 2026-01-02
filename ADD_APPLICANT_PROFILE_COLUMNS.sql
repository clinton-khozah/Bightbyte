-- Add applicant profile columns to students table
-- This allows applicants to save their CV, ID, and job preferences
-- Run this in your Supabase SQL Editor

-- Add columns for applicant profile data
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS cv_document TEXT,
ADD COLUMN IF NOT EXISTS id_document TEXT,
ADD COLUMN IF NOT EXISTS preferred_job_types JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS preferred_categories JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS preferred_locations JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS salary_expectation_min DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS salary_expectation_max DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(10) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS availability_date DATE,
ADD COLUMN IF NOT EXISTS work_experience TEXT,
ADD COLUMN IF NOT EXISTS education TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT,
ADD COLUMN IF NOT EXISTS languages TEXT,
ADD COLUMN IF NOT EXISTS additional_info TEXT,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_notifications": true, "job_matches": true}';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_students_preferred_job_types ON students USING GIN(preferred_job_types);
CREATE INDEX IF NOT EXISTS idx_students_preferred_categories ON students USING GIN(preferred_categories);
CREATE INDEX IF NOT EXISTS idx_students_preferred_locations ON students USING GIN(preferred_locations);
CREATE INDEX IF NOT EXISTS idx_students_notification_preferences ON students USING GIN(notification_preferences);

-- Add comments for documentation
COMMENT ON COLUMN students.cv_document IS 'URL to the applicant''s CV/resume document';
COMMENT ON COLUMN students.id_document IS 'URL to the applicant''s ID document';
COMMENT ON COLUMN students.preferred_job_types IS 'Array of preferred job types: job, learnership, internship, bursary';
COMMENT ON COLUMN students.preferred_categories IS 'Array of preferred job categories';
COMMENT ON COLUMN students.preferred_locations IS 'Array of preferred job locations';
COMMENT ON COLUMN students.salary_expectation_min IS 'Minimum expected salary';
COMMENT ON COLUMN students.salary_expectation_max IS 'Maximum expected salary';
COMMENT ON COLUMN students.salary_currency IS 'Currency for salary expectations';
COMMENT ON COLUMN students.availability_date IS 'Date when applicant is available to start';
COMMENT ON COLUMN students.work_experience IS 'Work experience description';
COMMENT ON COLUMN students.education IS 'Educational qualifications';
COMMENT ON COLUMN students.skills IS 'Applicant skills';
COMMENT ON COLUMN students.languages IS 'Languages spoken by applicant';
COMMENT ON COLUMN students.additional_info IS 'Additional information about the applicant';
COMMENT ON COLUMN students.notification_preferences IS 'JSON object storing notification preferences';


