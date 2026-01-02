-- Fix all foreign key constraints referencing mentors table to ensure proper CASCADE behavior
-- This script ensures that when a mentor is deleted, related records are handled appropriately

-- ============================================================================
-- 1. FIX PAYMENTS TABLE - Add ON DELETE CASCADE
-- ============================================================================
-- Drop existing constraint if it exists
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_mentor_id_fkey;

-- Recreate with CASCADE delete
ALTER TABLE payments
ADD CONSTRAINT payments_mentor_id_fkey
FOREIGN KEY (mentor_id)
REFERENCES mentors(id)
ON DELETE CASCADE;

-- ============================================================================
-- 2. VERIFY OTHER TABLES (These should already have CASCADE, but verify)
-- ============================================================================
-- Sessions table should already have CASCADE (from CREATE_SESSIONS_PAYMENTS_TABLES.sql)
-- If not, uncomment below:
-- ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_mentor_id_fkey;
-- ALTER TABLE sessions ADD CONSTRAINT sessions_mentor_id_fkey
--   FOREIGN KEY (mentor_id) REFERENCES mentors(id) ON DELETE CASCADE;

-- ============================================================================
-- 3. VERIFICATION QUERIES (Run these to check constraints)
-- ============================================================================
-- Check payments constraint:
-- SELECT 
--   conname AS constraint_name,
--   contype AS constraint_type,
--   pg_get_constraintdef(oid) AS constraint_definition
-- FROM pg_constraint
-- WHERE conrelid = 'payments'::regclass
--   AND conname = 'payments_mentor_id_fkey';

-- Check all foreign keys referencing mentors:
-- SELECT
--   tc.table_name,
--   tc.constraint_name,
--   tc.constraint_type,
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name,
--   rc.delete_rule
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- JOIN information_schema.referential_constraints AS rc
--   ON rc.constraint_name = tc.constraint_name
-- WHERE ccu.table_name = 'mentors'
-- ORDER BY tc.table_name, tc.constraint_name;

