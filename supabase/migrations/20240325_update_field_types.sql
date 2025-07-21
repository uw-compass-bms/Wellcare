-- Update existing records field_type using proper enum casting
UPDATE signature_positions
SET field_type = 
  CASE
    WHEN placeholder_text ILIKE '%sign%' THEN 'signature'::field_type
    WHEN placeholder_text ILIKE '%date%' THEN 'date'::field_type
    WHEN placeholder_text ILIKE '%name%' THEN 'name'::field_type
    WHEN placeholder_text ILIKE '%email%' THEN 'email'::field_type
    ELSE 'text'::field_type
  END
WHERE field_type = 'signature'::field_type;