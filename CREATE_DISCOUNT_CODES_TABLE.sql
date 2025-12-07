-- Create discount_codes table in Supabase
-- This table stores discount codes generated from the scratch card game
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_percentage DECIMAL(5, 2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 30),
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table to track daily scratch card plays
CREATE TABLE IF NOT EXISTS scratch_card_plays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  play_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, play_date)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discount_codes_user_id ON discount_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_is_used ON discount_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_discount_codes_expires_at ON discount_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_scratch_card_plays_user_id ON scratch_card_plays(user_id);
CREATE INDEX IF NOT EXISTS idx_scratch_card_plays_play_date ON scratch_card_plays(play_date);

-- Enable Row Level Security (RLS)
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scratch_card_plays ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own discount codes
CREATE POLICY "Users can view their own discount codes"
  ON discount_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to update their own discount codes (to mark as used)
CREATE POLICY "Users can update their own discount codes"
  ON discount_codes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own discount codes
CREATE POLICY "Users can insert their own discount codes"
  ON discount_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to read their own scratch card plays
CREATE POLICY "Users can view their own scratch card plays"
  ON scratch_card_plays
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own scratch card plays
CREATE POLICY "Users can insert their own scratch card plays"
  ON scratch_card_plays
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_discount_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_discount_codes_updated_at 
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW 
  EXECUTE FUNCTION update_discount_codes_updated_at();

-- Add comments for documentation
COMMENT ON TABLE discount_codes IS 'Stores discount codes generated from scratch card game';
COMMENT ON TABLE scratch_card_plays IS 'Tracks daily scratch card game plays per user';

