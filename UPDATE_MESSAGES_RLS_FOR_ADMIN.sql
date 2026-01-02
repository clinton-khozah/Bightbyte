-- Update RLS policies for messages table to allow admin (clintonkhozah@gmail.com) to view all messages

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- Policy: Users can view their own messages OR admin can view all messages
CREATE POLICY "Users can view their own messages or admin views all" ON messages
  FOR SELECT USING (
    auth.uid() = user_id 
    OR 
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'clintonkhozah@gmail.com'
  );

-- Policy: Users can insert their own messages
CREATE POLICY "Users can insert their own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own messages OR admin can update any message
CREATE POLICY "Users can update their own messages or admin updates any" ON messages
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR 
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'clintonkhozah@gmail.com'
  );

-- Policy: Admin can delete messages (optional, for cleanup)
CREATE POLICY "Admin can delete messages" ON messages
  FOR DELETE USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'clintonkhozah@gmail.com'
  );

