-- First, drop the academic_role column
ALTER TABLE public.users
  DROP COLUMN IF EXISTS academic_role;

-- Create a temporary column for the new role
ALTER TABLE public.users
  ADD COLUMN temp_role TEXT;

-- Copy existing role values to the temporary column
UPDATE public.users
  SET temp_role = role::TEXT
  WHERE role IS NOT NULL;

-- Drop the existing role column
ALTER TABLE public.users
  DROP COLUMN role;

-- Drop the existing role enums
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.academic_role CASCADE;

-- Create a new consolidated user_role enum with all the specified roles
CREATE TYPE public.user_role AS ENUM (
  'Principal Investigator',
  'Co-Principal Investigator',
  'Co-Investigator',
  'Senior Personnel',
  'Postdoctoral Researcher',
  'Graduate Student',
  'Undergraduate Student',
  'Project Administrator',
  'Authorized Organizational Representative'
);

-- Add the new role column with the correct type
ALTER TABLE public.users
  ADD COLUMN role public.user_role;

-- Update the handle_new_user function to set default values for new users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
begin
  insert into public.users (
    id, 
    email, 
    first_name, 
    last_name
  )
  values (
    new.id, 
    new.email, 
    '', -- Default empty first name
    ''  -- Default empty last name
  );
  return new;
end;
$$ language plpgsql security definer;

