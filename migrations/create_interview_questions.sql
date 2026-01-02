-- Create interview_question table if it doesn't exist
CREATE TABLE IF NOT EXISTS interview_videos_interviewquestion (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert 5 interview questions
INSERT INTO interview_videos_interviewquestion (question_text, "order", is_active, created_at, updated_at)
VALUES
    ('Tell us about yourself and why you want to become a tutor on our platform.', 1, TRUE, NOW(), NOW()),
    ('What subjects or topics are you most passionate about teaching? Please explain why.', 2, TRUE, NOW(), NOW()),
    ('Describe your teaching style and approach. How do you adapt to different learning styles?', 3, TRUE, NOW(), NOW()),
    ('Can you share an example of how you would explain a complex concept to a student who is struggling?', 4, TRUE, NOW(), NOW()),
    ('What makes you unique as a tutor? What value will you bring to students on our platform?', 5, TRUE, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Create interview_videos_interviewvideosubmission table if it doesn't exist
CREATE TABLE IF NOT EXISTS interview_videos_interviewvideosubmission (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    mentor_id INTEGER,
    question_id INTEGER NOT NULL REFERENCES interview_videos_interviewquestion(id) ON DELETE CASCADE,
    video_url VARCHAR(500) NOT NULL,
    video_file_path VARCHAR(500) DEFAULT '',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_expired BOOLEAN DEFAULT FALSE,
    CONSTRAINT unique_user_question UNIQUE (user_id, question_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interview_question_order ON interview_videos_interviewquestion("order");
CREATE INDEX IF NOT EXISTS idx_interview_question_active ON interview_videos_interviewquestion(is_active);
CREATE INDEX IF NOT EXISTS idx_interview_submission_user ON interview_videos_interviewvideosubmission(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_submission_expires ON interview_videos_interviewvideosubmission(expires_at);
CREATE INDEX IF NOT EXISTS idx_interview_submission_question ON interview_videos_interviewvideosubmission(question_id);

