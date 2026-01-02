-- Create jobs table in Supabase
-- This replaces the sessions table for job postings
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  applicant_id BIGINT NULL, -- Optional - for future applicant registration
  applicant_name VARCHAR(255) NULL, -- For applications
  applicant_email VARCHAR(255) NULL, -- For applications
  applicant_avatar TEXT,
  
  -- Job Details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  job_type VARCHAR(50) NOT NULL, -- 'job', 'learnership', 'internship', 'bursary'
  category VARCHAR(255), -- e.g., 'IT', 'Engineering', 'Finance', etc.
  location VARCHAR(255) NOT NULL, -- 'Remote', 'Hybrid', or specific location
  salary_min DECIMAL(10, 2), -- Minimum salary/stipend
  salary_max DECIMAL(10, 2), -- Maximum salary/stipend
  salary_currency VARCHAR(10) DEFAULT 'USD',
  is_salary_disclosed BOOLEAN DEFAULT TRUE,
  
  -- Requirements
  requirements TEXT, -- Job requirements
  qualifications TEXT, -- Required qualifications
  experience_level VARCHAR(50), -- 'entry', 'mid', 'senior', 'executive'
  education_level VARCHAR(100), -- 'high_school', 'diploma', 'degree', 'masters', 'phd'
  
  -- Application Details
  application_deadline DATE,
  start_date DATE,
  duration VARCHAR(100), -- For internships/learnerships: '3 months', '1 year', etc.
  application_link TEXT, -- External link to company's application page
  application_email VARCHAR(255), -- Email address for applications
  application_method VARCHAR(50) DEFAULT 'platform', -- 'platform', 'external_link', 'email'
  
  -- Status
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'closed', 'filled', 'cancelled'
  is_featured BOOLEAN DEFAULT FALSE,
  is_urgent BOOLEAN DEFAULT FALSE,
  
  -- Application tracking
  total_applications INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  
  -- Meeting/Interview details (for bursaries and some programs)
  interview_type VARCHAR(50), -- 'online', 'in-person', 'hybrid'
  interview_link TEXT,
  
  -- Metadata
  tags JSONB DEFAULT '[]', -- Array of tags for search
  benefits JSONB DEFAULT '[]', -- Array of benefits
  company_logo TEXT, -- Company logo URL (stored in same bucket as other media)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create applications table for job applications
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  applicant_id BIGINT NULL, -- Optional - for future applicant registration
  applicant_name VARCHAR(255) NOT NULL,
  applicant_email VARCHAR(255) NOT NULL,
  applicant_phone VARCHAR(20),
  applicant_avatar TEXT,
  
  -- Application Details
  cover_letter TEXT,
  resume_url TEXT, -- URL to resume/CV
  portfolio_url TEXT, -- URL to portfolio (optional)
  linkedin_url TEXT,
  
  -- Application Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted', 'rejected', 'withdrawn'
  reviewed_at TIMESTAMPTZ,
  reviewed_by BIGINT REFERENCES companies(id),
  
  -- Interview Details
  interview_scheduled_at TIMESTAMPTZ,
  interview_link TEXT,
  interview_notes TEXT,
  
  -- Additional Information
  additional_info JSONB DEFAULT '{}', -- Store any additional application data
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_is_featured ON jobs(is_featured);
CREATE INDEX IF NOT EXISTS idx_jobs_application_deadline ON jobs(application_deadline);

CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_company_id ON applications(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant_email ON applications(applicant_email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Allow all operations on jobs" ON jobs;
DROP POLICY IF EXISTS "Allow all operations on applications" ON applications;

-- Create policies for access (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on jobs" ON jobs FOR ALL USING (true);
CREATE POLICY "Allow all operations on applications" ON applications FOR ALL USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist (to allow re-running this script)
DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;

-- Create triggers for auto-updating updated_at
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample view for job stats
CREATE OR REPLACE VIEW job_stats AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'open') as open_count,
  COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
  COUNT(*) FILTER (WHERE status = 'filled') as filled_count,
  COUNT(*) FILTER (WHERE job_type = 'job') as jobs_count,
  COUNT(*) FILTER (WHERE job_type = 'learnership') as learnerships_count,
  COUNT(*) FILTER (WHERE job_type = 'internship') as internships_count,
  COUNT(*) FILTER (WHERE job_type = 'bursary') as bursaries_count,
  COALESCE(SUM(total_applications), 0) as total_applications,
  COALESCE(SUM(total_views), 0) as total_views
FROM jobs;

-- Sample view for application stats
CREATE OR REPLACE VIEW application_stats AS
SELECT 
  COUNT(*) as total_applications,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'reviewing') as reviewing_count,
  COUNT(*) FILTER (WHERE status = 'shortlisted') as shortlisted_count,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
FROM applications;

