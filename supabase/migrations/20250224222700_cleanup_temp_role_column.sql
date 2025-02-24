-- Drop the temporary role column since we don't need it
ALTER TABLE public.users
  DROP COLUMN IF EXISTS temp_role;
