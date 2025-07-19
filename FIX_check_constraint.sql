-- First, let's see what constraints exist on the signature_tasks table
SELECT 
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'signature_tasks'
    AND con.conname LIKE '%status%';

-- If you see a constraint like "signature_tasks_status_check", 
-- it might look something like:
-- CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled'))

-- To fix this, we need to:
-- 1. Drop the old constraint
ALTER TABLE signature_tasks DROP CONSTRAINT IF EXISTS signature_tasks_status_check;

-- 2. Add a new constraint that includes 'trashed'
ALTER TABLE signature_tasks 
ADD CONSTRAINT signature_tasks_status_check 
CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled', 'trashed'));

-- 3. Verify the change worked
SELECT 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'signature_tasks'
    AND con.conname LIKE '%status%';