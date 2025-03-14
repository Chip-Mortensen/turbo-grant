-- Add application_factors JSON column to research_projects table
ALTER TABLE public.research_projects
ADD COLUMN application_factors JSONB DEFAULT '{}' NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.research_projects.application_factors IS 'JSON object storing application factors for this research project. Used for tracking various factors that affect grant applications.';

-- Create index on the application_factors field for better performance when querying
CREATE INDEX idx_research_projects_application_factors ON public.research_projects USING GIN (application_factors);
