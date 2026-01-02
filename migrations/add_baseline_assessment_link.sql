-- Add baseline_assessment_link field to mentor_application_progress table
ALTER TABLE mentor_application_progress
ADD COLUMN IF NOT EXISTS baseline_assessment_link TEXT;

-- Add comment
COMMENT ON COLUMN mentor_application_progress.baseline_assessment_link IS 'URL link to the baseline assessment test';

