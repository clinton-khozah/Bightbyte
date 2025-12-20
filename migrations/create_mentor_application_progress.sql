-- Create mentor_application_progress table to track application steps
CREATE TABLE IF NOT EXISTS mentor_application_progress (
    id BIGSERIAL PRIMARY KEY,
    mentor_id BIGINT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_step VARCHAR(50) NOT NULL DEFAULT 'application_submitted',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, failed
    application_submitted BOOLEAN DEFAULT true,
    application_submitted_at TIMESTAMP WITH TIME ZONE,
    baseline_assessment_started BOOLEAN DEFAULT false,
    baseline_assessment_started_at TIMESTAMP WITH TIME ZONE,
    baseline_assessment_completed BOOLEAN DEFAULT false,
    baseline_assessment_completed_at TIMESTAMP WITH TIME ZONE,
    baseline_assessment_score DECIMAL(5,2),
    baseline_assessment_passed BOOLEAN DEFAULT false,
    profile_reviewed BOOLEAN DEFAULT false,
    profile_reviewed_at TIMESTAMP WITH TIME ZONE,
    profile_video_url TEXT,
    profile_video_uploaded BOOLEAN DEFAULT false,
    profile_video_uploaded_at TIMESTAMP WITH TIME ZONE,
    profile_approved BOOLEAN DEFAULT false,
    profile_approved_at TIMESTAMP WITH TIME ZONE,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mentor_id),
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mentor_application_progress_user_id ON mentor_application_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_application_progress_mentor_id ON mentor_application_progress(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_application_progress_current_step ON mentor_application_progress(current_step);
CREATE INDEX IF NOT EXISTS idx_mentor_application_progress_status ON mentor_application_progress(status);

-- Add comment to table
COMMENT ON TABLE mentor_application_progress IS 'Tracks the progress of mentor applications through various stages';
COMMENT ON COLUMN mentor_application_progress.current_step IS 'Current step: application_submitted, baseline_assessment, profile_review, onboarding';
COMMENT ON COLUMN mentor_application_progress.status IS 'Overall status: pending, in_progress, completed, failed';
COMMENT ON COLUMN mentor_application_progress.baseline_assessment_score IS 'Score from baseline assessment (0-100)';
COMMENT ON COLUMN mentor_application_progress.baseline_assessment_passed IS 'Whether the assessment was passed (score >= 75)';

