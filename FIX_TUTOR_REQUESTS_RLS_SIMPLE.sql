-- SIMPLER FIX: Allow students to view requests where student_email matches their JWT email
-- This avoids querying auth.users table entirely

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view their own requests" ON tutor_requests;

-- Create a simple function that gets email from JWT (no auth.users query)
CREATE OR REPLACE FUNCTION auth_email()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt() ->> 'email')::TEXT;
$$;

-- Create policy using JWT email directly
CREATE POLICY "Students can view their own requests"
  ON tutor_requests
  FOR SELECT
  USING (
    auth.uid() = student_id 
    OR (auth.uid() IS NOT NULL AND student_email = auth_email())
  );

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auth_email() TO authenticated, anon;

