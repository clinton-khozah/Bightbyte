-- Add passedInterview column to mentors table
-- This column tracks whether the tutor passed the interview (Profile Review step)
-- true = passed, false = failed, null = under review

ALTER TABLE mentors 
ADD COLUMN IF NOT EXISTS passed_interview BOOLEAN DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN mentors.passed_interview IS 'Interview status: true = passed, false = failed, null = under review. Tutors can only proceed to onboarding if this is true.';

