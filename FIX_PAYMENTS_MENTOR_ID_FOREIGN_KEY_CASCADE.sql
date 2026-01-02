-- Fix payments_mentor_id_fkey foreign key constraint to add ON DELETE CASCADE
-- This allows deleting mentors and automatically deletes related payment records

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_mentor_id_fkey;

-- Step 2: Recreate the foreign key constraint with ON DELETE CASCADE
ALTER TABLE payments
ADD CONSTRAINT payments_mentor_id_fkey
FOREIGN KEY (mentor_id)
REFERENCES mentors(id)
ON DELETE CASCADE;

-- Verify the constraint was created successfully
-- You can check this in Supabase dashboard under Table Editor > payments > Foreign Keys

