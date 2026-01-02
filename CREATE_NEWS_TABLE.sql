-- Create news table for recruiter news posts
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 days'),
  is_active BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_news_recruiter_id ON news(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_news_expires_at ON news(expires_at);
CREATE INDEX IF NOT EXISTS idx_news_is_active ON news(is_active);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at DESC);

-- Enable Row Level Security
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active news that hasn't expired
CREATE POLICY "Anyone can view active news"
  ON news
  FOR SELECT
  USING (
    is_active = true 
    AND expires_at > NOW()
  );

-- Policy: Recruiters can insert their own news
CREATE POLICY "Recruiters can create news"
  ON news
  FOR INSERT
  WITH CHECK (
    auth.uid() = recruiter_id
  );

-- Policy: Recruiters can update their own news
CREATE POLICY "Recruiters can update their own news"
  ON news
  FOR UPDATE
  USING (
    auth.uid() = recruiter_id
  );

-- Policy: Recruiters can delete their own news
CREATE POLICY "Recruiters can delete their own news"
  ON news
  FOR DELETE
  USING (
    auth.uid() = recruiter_id
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on news updates
CREATE TRIGGER update_news_timestamp
  BEFORE UPDATE ON news
  FOR EACH ROW
  EXECUTE FUNCTION update_news_updated_at();

-- Function to increment views
CREATE OR REPLACE FUNCTION increment_news_views(news_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE news
  SET views = views + 1
  WHERE id = news_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

