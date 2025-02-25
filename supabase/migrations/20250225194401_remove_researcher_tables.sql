-- Drop policies for researcher_profiles
DROP POLICY IF EXISTS "Users can view researcher profiles of their projects" ON public.researcher_profiles;
DROP POLICY IF EXISTS "Users can create researcher profiles for their projects" ON public.researcher_profiles;
DROP POLICY IF EXISTS "Users can update researcher profiles of their projects" ON public.researcher_profiles;
DROP POLICY IF EXISTS "Users can delete researcher profiles of their projects" ON public.researcher_profiles;

-- Drop triggers for researcher_profiles
DROP TRIGGER IF EXISTS queue_researcher_profile_vectorization ON public.researcher_profiles;

-- Remove researcher from processing_queue content_type check constraint
ALTER TABLE public.processing_queue 
DROP CONSTRAINT IF EXISTS processing_queue_content_type_check;

ALTER TABLE public.processing_queue 
ADD CONSTRAINT processing_queue_content_type_check 
CHECK (content_type IN ('description', 'figure', 'chalk_talk'));

-- Drop the researcher_profiles table
DROP TABLE IF EXISTS public.researcher_profiles;

-- Clean up any orphaned processing_queue entries for researchers
DELETE FROM public.processing_queue WHERE content_type = 'researcher';
