-- TEMPORARY: Disable RLS filtering to test fetching all requests
-- WARNING: This allows all authenticated users to see all requests
-- Only use this for testing, then restore proper RLS policies

-- Drop existing policy
DROP POLICY IF EXISTS "Students can view their own requests" ON tutor_requests;

-- Create a temporary permissive policy for testing
CREATE POLICY "TEMP: Allow all authenticated users to view all requests"
  ON tutor_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- This policy allows any authenticated user to see all tutor requests
-- After testing, restore the proper RLS policy from FIX_TUTOR_REQUESTS_RLS_SIMPLE.sql

