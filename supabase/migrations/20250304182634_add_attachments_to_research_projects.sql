-- Add attachments JSONB column to research_projects table
ALTER TABLE public.research_projects
ADD COLUMN attachments JSONB DEFAULT '{}' NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.research_projects.attachments IS 'JSON object storing attachment completion status for this project. Format: {document_id: {completed: boolean, updatedAt: timestamp, attachmentUrl: string}}';

-- Create index on the attachments field for better performance when querying
CREATE INDEX idx_research_projects_attachments ON public.research_projects USING GIN (attachments);
