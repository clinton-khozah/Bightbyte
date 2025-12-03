# Step-by-Step Fix for Tutor Requests Not Displaying

## The Problem
The RLS (Row Level Security) policy on the `tutor_requests` table is blocking access, causing a 403 error.

## Solution: Run This SQL in Supabase

1. **Open Supabase Dashboard** → Go to your project
2. **Click "SQL Editor"** in the left sidebar
3. **Copy and paste this SQL:**

```sql
-- TEMPORARY: Disable RLS filtering to test fetching all requests
-- WARNING: This allows all authenticated users to see all requests
-- Only use this for testing, then restore proper RLS policies

-- Drop existing policy
DROP POLICY IF EXISTS "Students can view their own requests" ON tutor_requests;
DROP POLICY IF EXISTS "TEMP: Allow all authenticated users to view all requests" ON tutor_requests;

-- Create a temporary permissive policy for testing
CREATE POLICY "TEMP: Allow all authenticated users to view all requests"
  ON tutor_requests
  FOR SELECT
  TO authenticated
  USING (true);
```

4. **Click "Run"** (or press Ctrl+Enter)
5. **Refresh your browser** at `http://localhost:3000/dashboard/learner`
6. **Check the console** - you should see:
   - `Query - Data count: 1`
   - `✅ Setting tutor requests state with 1 requests`
   - `📊 tutorRequests.length: 1`

## After Testing

Once you confirm it works, restore proper security by running `FIX_TUTOR_REQUESTS_RLS_SIMPLE.sql` to create a proper RLS policy that only allows users to see their own requests.

