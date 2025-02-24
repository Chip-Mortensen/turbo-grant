-- Add NOT NULL constraints to the users table for required fields
-- First, ensure all existing records have values for these fields
UPDATE public.users
SET 
  first_name = COALESCE(first_name, ''),
  last_name = COALESCE(last_name, '');

-- Now add the NOT NULL constraints
ALTER TABLE public.users
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL,
  ALTER COLUMN role SET NOT NULL;

-- Add a comment explaining the constraints
COMMENT ON TABLE public.users IS 'User profiles with required fields for first_name, last_name, and role';
