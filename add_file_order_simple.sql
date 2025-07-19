-- Simple migration to add file_order column

-- Step 1: Add the column if it doesn't exist
ALTER TABLE signature_files 
ADD COLUMN IF NOT EXISTS file_order INTEGER DEFAULT 1;

-- Step 2: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_signature_files_task_order 
ON signature_files(task_id, file_order);

-- Step 3: Set initial order values for existing files
-- This assigns sequential numbers to files within each task
UPDATE signature_files sf
SET file_order = subquery.rn
FROM (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY id) as rn
    FROM signature_files
    WHERE file_order IS NULL OR file_order = 1
) subquery
WHERE sf.id = subquery.id;

-- Verify the update
SELECT task_id, id, file_order 
FROM signature_files 
ORDER BY task_id, file_order
LIMIT 20;