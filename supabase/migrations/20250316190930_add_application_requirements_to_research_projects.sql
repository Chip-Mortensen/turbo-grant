-- Add application_requirements JSON column to research_projects table
ALTER TABLE public.research_projects
ADD COLUMN application_requirements JSONB DEFAULT '{}' NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.research_projects.application_requirements IS 'JSON object storing application requirements for this research project. Used for tracking various requirements for grant applications.';

-- Create index on the application_requirements field for better performance when querying
CREATE INDEX idx_research_projects_application_requirements ON public.research_projects USING GIN (application_requirements);
