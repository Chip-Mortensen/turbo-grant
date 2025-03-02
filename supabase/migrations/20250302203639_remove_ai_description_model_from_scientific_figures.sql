-- Remove the ai_description_model column from scientific_figures table
ALTER TABLE public.scientific_figures
DROP COLUMN IF EXISTS ai_description_model;

-- Update the types in the Database type definition will be handled automatically by Supabase
