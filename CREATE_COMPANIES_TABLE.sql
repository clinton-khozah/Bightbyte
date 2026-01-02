-- Create companies table in Supabase
-- This replaces the mentors table for companies posting jobs
CREATE TABLE IF NOT EXISTS companies (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID, -- Reference to Supabase Auth user
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  title VARCHAR(255), -- Company representative title
  description TEXT NOT NULL,
  logo TEXT, -- Company logo URL
  avatar TEXT, -- Company representative avatar
  
  -- Contact Information
  email VARCHAR(255),
  phone_number VARCHAR(20),
  website VARCHAR(500),
  
  -- Location
  country VARCHAR(100),
  city VARCHAR(100),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Company Details
  company_size VARCHAR(50), -- 'startup', 'small', 'medium', 'large', 'enterprise'
  industry VARCHAR(255), -- Industry sector
  founded_year INTEGER,
  company_type VARCHAR(50), -- 'private', 'public', 'nonprofit', 'government'
  
  -- Social Media & Links
  linkedin_profile VARCHAR(500),
  twitter_profile VARCHAR(500),
  facebook_profile VARCHAR(500),
  instagram_profile VARCHAR(500),
  github_profile VARCHAR(500),
  
  -- Verification & Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_complete BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Platform Statistics
  total_jobs_posted INTEGER DEFAULT 0,
  total_applications_received INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  
  -- Payment & Billing (for premium features)
  payment_method VARCHAR(50),
  payment_account_details JSONB,
  
  -- Settings & Preferences
  settings JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  
  -- Documents
  company_registration_document TEXT, -- Company registration certificate
  tax_certificate TEXT, -- Tax clearance certificate
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_company_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_country ON companies(country);
CREATE INDEX IF NOT EXISTS idx_companies_is_verified ON companies(is_verified);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at DESC);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Allow all operations on companies" ON companies;

-- Create policies for access
CREATE POLICY "Allow all operations on companies" ON companies FOR ALL USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (to allow re-running this script)
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

