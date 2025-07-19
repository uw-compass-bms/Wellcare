-- Add 'trashed' to the status enum for signature_tasks table
-- This migration allows tasks to be moved to trash instead of being permanently deleted

-- First, we need to check the current enum values
-- In PostgreSQL, we can't directly modify an enum, so we need to:
-- 1. Create a new enum type
-- 2. Update the column to use the new type
-- 3. Drop the old enum type

-- Create new enum type with 'trashed' status
CREATE TYPE signature_task_status_new AS ENUM ('draft', 'in_progress', 'completed', 'cancelled', 'trashed');

-- Update the column to use the new enum type
ALTER TABLE signature_tasks 
  ALTER COLUMN status TYPE signature_task_status_new 
  USING status::text::signature_task_status_new;

-- Drop the old enum type (if it exists)
DROP TYPE IF EXISTS signature_task_status;

-- Rename the new enum type to the original name
ALTER TYPE signature_task_status_new RENAME TO signature_task_status;

-- Add index for better performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_signature_tasks_status ON signature_tasks(status);

-- Add a comment to document the change
COMMENT ON COLUMN signature_tasks.status IS 'Task status: draft, in_progress, completed, cancelled, or trashed';