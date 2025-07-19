-- URGENT: Add 'trashed' status to signature_tasks
-- Run this in Supabase SQL editor immediately to fix the delete functionality

-- Check current enum values first
SELECT unnest(enum_range(NULL::signature_task_status));

-- If 'trashed' is not in the list above, run this:
ALTER TYPE signature_task_status ADD VALUE 'trashed' AFTER 'cancelled';

-- Verify the change
SELECT unnest(enum_range(NULL::signature_task_status));

-- The result should show: draft, in_progress, completed, cancelled, trashed