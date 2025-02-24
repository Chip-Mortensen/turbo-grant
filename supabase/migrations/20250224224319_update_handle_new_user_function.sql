-- Update the handle_new_user function to include the role field and metadata from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  first_name TEXT;
  last_name TEXT;
  user_role TEXT;
BEGIN
  -- Extract metadata from the auth.users table
  first_name := new.raw_user_meta_data->>'first_name';
  last_name := new.raw_user_meta_data->>'last_name';
  user_role := new.raw_user_meta_data->>'role';

  -- Insert into public.users with the extracted metadata
  INSERT INTO public.users (
    id, 
    email, 
    first_name, 
    last_name,
    role
  )
  VALUES (
    new.id, 
    new.email, 
    COALESCE(first_name, ''), -- Use empty string if first_name is null
    COALESCE(last_name, ''),  -- Use empty string if last_name is null
    user_role::public.user_role -- Cast to user_role enum
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
