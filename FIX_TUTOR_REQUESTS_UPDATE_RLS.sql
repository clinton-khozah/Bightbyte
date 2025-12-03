-- Fix RLS policy for tutor_requests UPDATE to allow mentors to accept requests
-- The issue is that the policy tries to query auth.users table which requires special permissions
-- Solution: Use auth.jwt() to get email from JWT token instead of querying auth.users

-- Step 1: Drop existing UPDATE policies
DROP POLICY IF EXISTS "Mentors can accept requests" ON tutor_requests;
DROP POLICY IF EXISTS "Students can update their own requests" ON tutor_requests;

-- Step 2: Create a function that extracts email from JWT token (no auth.users query needed)
CREATE OR REPLACE FUNCTION get_user_email_from_jwt()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Extract email from JWT token claims
  RETURN (auth.jwt() ->> 'email')::TEXT;
END;
$$;

-- Step 3: Create a function to check if current user is a mentor
CREATE OR REPLACE FUNCTION is_current_user_mentor()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get email from JWT
  user_email := get_user_email_from_jwt();
  
  -- Check if user is a mentor
  RETURN EXISTS (
    SELECT 1 FROM mentors 
    WHERE LOWER(TRIM(mentors.email)) = LOWER(TRIM(user_email))
  );
END;
$$;

-- Step 4: Create policy for mentors to update/accept requests
-- This allows any authenticated mentor to update any request (to accept/reject)
CREATE POLICY "Mentors can accept requests"
  ON tutor_requests
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND is_current_user_mentor() = true
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND is_current_user_mentor() = true
  );

-- Step 5: Create policy for students to update their own requests
CREATE POLICY "Students can update their own requests"
  ON tutor_requests
  FOR UPDATE
  USING (
    auth.uid() = student_id 
    OR (auth.uid() IS NOT NULL AND LOWER(TRIM(student_email)) = LOWER(TRIM(get_user_email_from_jwt())))
  )
  WITH CHECK (
    auth.uid() = student_id 
    OR (auth.uid() IS NOT NULL AND LOWER(TRIM(student_email)) = LOWER(TRIM(get_user_email_from_jwt())))
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_email_from_jwt() TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_mentor() TO authenticated;

-- This policy allows:
-- 1. Mentors to update any request (to accept/reject them)
-- 2. Students to update their own requests (by student_id or email match)

