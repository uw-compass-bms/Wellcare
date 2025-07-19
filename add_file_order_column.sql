-- Add file_order column to signature_files table if it doesn't exist
-- This column tracks the order of files for display

-- Check if the column exists first
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'signature_files' 
        AND column_name = 'file_order'
    ) THEN
        ALTER TABLE signature_files 
        ADD COLUMN file_order INTEGER DEFAULT 1;
        
        -- Add index for better performance
        CREATE INDEX idx_signature_files_task_order 
        ON signature_files(task_id, file_order);
    END IF;
END $$;

-- Update existing files to have sequential order (if needed)
-- First, let's check what columns exist
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'signature_files';

-- Use id for ordering if created_at doesn't exist
WITH ordered_files AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY id) as new_order
    FROM signature_files
    WHERE file_order IS NULL
)
UPDATE signature_files sf
SET file_order = of.new_order
FROM ordered_files of
WHERE sf.id = of.id;