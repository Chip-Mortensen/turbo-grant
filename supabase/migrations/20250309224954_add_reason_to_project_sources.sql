-- Add reason column to project_sources table
ALTER TABLE public.project_sources
ADD COLUMN reason TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.project_sources.reason IS 'The reason why this source was added or how it was found';
