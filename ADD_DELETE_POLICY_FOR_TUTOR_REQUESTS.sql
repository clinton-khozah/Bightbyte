-- Add DELETE policy for tutor_requests table
-- This allows students to delete their own requests
-- Run this in your Supabase SQL Editor

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Students can delete their own requests" ON tutor_requests;

-- Policy: Students can delete their own requests
CREATE POLICY "Students can delete their own requests"
  ON tutor_requests
  FOR DELETE
  USING (
    auth.uid() = student_id 
    OR (auth.uid() IS NOT NULL AND student_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- This policy allows:
-- 1. Users to delete requests where student_id matches their auth.uid()
-- 2. Users to delete requests where student_email matches their authenticated email

