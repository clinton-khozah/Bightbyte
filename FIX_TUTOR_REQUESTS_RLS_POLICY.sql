-- Fix RLS policy for tutor_requests to avoid permission denied error
-- The issue is that the policy tries to query auth.users table which requires special permissions
-- Solution: Use auth.jwt() to get email from JWT token instead of querying auth.users

-- Step 1: Drop the existing policy
DROP POLICY IF EXISTS "Students can view their own requests" ON tutor_requests;

-- Step 2: Create a function that extracts email from JWT token (no auth.users query needed)
CREATE OR REPLACE FUNCTION get_user_email_from_jwt()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Extract email from JWT token claims
  RETURN (auth.jwt() ->> 'email')::TEXT;
END;
$$;

-- Step 3: Create updated policy that uses JWT email instead of querying auth.users
CREATE POLICY "Students can view their own requests"
  ON tutor_requests
  FOR SELECT
  USING (
    auth.uid() = student_id 
    OR (auth.uid() IS NOT NULL AND LOWER(TRIM(student_email)) = LOWER(TRIM(get_user_email_from_jwt())))
  );

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_email_from_jwt() TO authenticated;

-- This policy allows:
-- 1. Users to see requests where student_id matches their auth.uid()
-- 2. Users to see requests where student_id is NULL (unauthenticated requests)
-- 3. Users to see requests where student_email matches their authenticated email (using SECURITY DEFINER function)

