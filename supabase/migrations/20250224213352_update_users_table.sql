-- Create user_role enum
CREATE TYPE public.user_role AS ENUM (
  'PI',
  'Signing Official',
  'Admin',
  'Co-Investigator'
);

-- Create academic_role enum
CREATE TYPE public.academic_role AS ENUM (
  'Professor',
  'Researcher',
  'Postdoc',
  'Graduate Student',
  'Founder',
  'Research Administrator',
  'Signing Official'
);

-- Update users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS role user_role,
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS era_commons_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS orcid VARCHAR(50),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS academic_role academic_role,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add foreign key constraint to organizations table
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.users(id);

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

-- Add NOT NULL constraints after existing data is migrated
-- This will be done in a separate migration after data is updated

-- Create a migration function to update existing users
CREATE OR REPLACE FUNCTION public.migrate_existing_users()
RETURNS void AS $$
BEGIN
  -- Update existing users with default values
  UPDATE public.users
  SET 
    first_name = COALESCE(first_name, ''),
    last_name = COALESCE(last_name, '');
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
SELECT public.migrate_existing_users();

-- Drop the migration function as it's no longer needed
DROP FUNCTION public.migrate_existing_users();
