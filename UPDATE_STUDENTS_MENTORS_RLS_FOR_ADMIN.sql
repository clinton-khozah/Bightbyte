-- Update RLS policies for students and mentors tables to allow admin to view all user data

-- Drop existing policies for students
DROP POLICY IF EXISTS "Users can view their own student data" ON students;
DROP POLICY IF EXISTS "Users can update their own student data" ON students;
DROP POLICY IF EXISTS "Users can insert their own student data" ON students;

-- Policy: Users can view their own student data OR admin can view all
CREATE POLICY "Users can view their own student data or admin views all" ON students
  FOR SELECT USING (
    auth.uid() = id 
    OR 
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'clintonkhozah@gmail.com'
  );

-- Policy: Users can update their own student data
CREATE POLICY "Users can update their own student data" ON students
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Users can insert their own student data
CREATE POLICY "Users can insert their own student data" ON students
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Drop existing policies for mentors (if they exist)
DROP POLICY IF EXISTS "Users can view their own mentor data" ON mentors;
DROP POLICY IF EXISTS "Users can update their own mentor data" ON mentors;
DROP POLICY IF EXISTS "Users can insert their own mentor data" ON mentors;

-- Policy: Users can view their own mentor data OR admin can view all
CREATE POLICY "Users can view their own mentor data or admin views all" ON mentors
  FOR SELECT USING (
    user_id = auth.uid() 
    OR 
    id::text = auth.uid()::text
    OR 
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'clintonkhozah@gmail.com'
  );

-- Policy: Users can update their own mentor data
CREATE POLICY "Users can update their own mentor data" ON mentors
  FOR UPDATE USING (
    user_id = auth.uid() 
    OR 
    id::text = auth.uid()::text
  );

-- Policy: Users can insert their own mentor data
CREATE POLICY "Users can insert their own mentor data" ON mentors
  FOR INSERT WITH CHECK (
    user_id = auth.uid() 
    OR 
    id::text = auth.uid()::text
  );

