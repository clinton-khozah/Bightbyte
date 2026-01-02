-- Create search_suggestions table to track popular searches
-- This table stores search queries and their popularity metrics

CREATE TABLE IF NOT EXISTS search_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_term TEXT NOT NULL,
  search_type VARCHAR(50) NOT NULL, -- 'category', 'job_type', 'keyword', 'location'
  display_name TEXT NOT NULL, -- User-friendly display name
  search_value TEXT NOT NULL, -- The actual value used for filtering (e.g., 'job', 'IT', 'Engineering')
  
  -- Popularity metrics
  search_count INTEGER DEFAULT 1, -- Number of times this search was performed
  click_count INTEGER DEFAULT 0, -- Number of times this suggestion was clicked
  last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Display settings
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0, -- Order in which suggestions appear
  is_featured BOOLEAN DEFAULT false, -- Featured suggestions appear first
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_search_suggestions_search_type ON search_suggestions(search_type);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_is_active ON search_suggestions(is_active);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_search_count ON search_suggestions(search_count DESC);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_display_order ON search_suggestions(display_order ASC);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_is_featured ON search_suggestions(is_featured DESC);

-- Create unique constraint on search_term and search_type combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_suggestions_unique ON search_suggestions(search_term, search_type);

-- Enable Row Level Security
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to search suggestions" ON search_suggestions;
DROP POLICY IF EXISTS "Allow authenticated users to update search suggestions" ON search_suggestions;
DROP POLICY IF EXISTS "Allow public insert to search suggestions" ON search_suggestions;

-- Create policies
-- Allow anyone to read active suggestions
CREATE POLICY "Allow public read access to search suggestions" ON search_suggestions
  FOR SELECT USING (is_active = true);

-- Allow authenticated users to update search counts (for tracking)
CREATE POLICY "Allow authenticated users to update search suggestions" ON search_suggestions
  FOR UPDATE USING (true);

-- Allow anyone to insert new search suggestions (for tracking)
CREATE POLICY "Allow public insert to search suggestions" ON search_suggestions
  FOR INSERT WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_search_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_search_suggestions_updated_at ON search_suggestions;
CREATE TRIGGER update_search_suggestions_updated_at 
  BEFORE UPDATE ON search_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_search_suggestions_updated_at();

-- Function to increment search count or create new suggestion
CREATE OR REPLACE FUNCTION increment_search_suggestion(
  p_search_term TEXT,
  p_search_type VARCHAR(50),
  p_display_name TEXT,
  p_search_value TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO search_suggestions (search_term, search_type, display_name, search_value, search_count, last_searched_at)
  VALUES (p_search_term, p_search_type, p_display_name, p_search_value, 1, NOW())
  ON CONFLICT (search_term, search_type)
  DO UPDATE SET
    search_count = search_suggestions.search_count + 1,
    last_searched_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to increment click count for a suggestion
CREATE OR REPLACE FUNCTION increment_click_count(
  p_search_term TEXT,
  p_search_type VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
  UPDATE search_suggestions
  SET click_count = click_count + 1,
      updated_at = NOW()
  WHERE search_term = p_search_term
    AND search_type = p_search_type;
END;
$$ LANGUAGE plpgsql;

-- Insert initial popular searches (default suggestions)
INSERT INTO search_suggestions (search_term, search_type, display_name, search_value, search_count, display_order, is_featured, is_active)
VALUES
  ('All', 'category', 'All', 'all', 1000, 0, true, true),
  ('Jobs', 'job_type', 'Jobs', 'job', 800, 1, true, true),
  ('Learnerships', 'job_type', 'Learnerships', 'learnership', 600, 2, true, true),
  ('Internships', 'job_type', 'Internships', 'internship', 500, 3, true, true),
  ('Bursaries', 'job_type', 'Bursaries', 'bursary', 400, 4, true, true),
  ('IT', 'category', 'IT', 'IT', 700, 5, true, true),
  ('Engineering', 'category', 'Engineering', 'Engineering', 600, 6, true, true),
  ('Finance', 'category', 'Finance', 'Finance', 500, 7, true, true),
  ('Healthcare', 'category', 'Healthcare', 'Healthcare', 450, 8, true, true)
ON CONFLICT (search_term, search_type) DO NOTHING;

