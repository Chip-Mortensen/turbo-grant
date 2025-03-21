-- Add project_id column to documents table as nullable
ALTER TABLE documents ADD COLUMN project_id UUID REFERENCES research_projects(id);

-- Add a comment explaining the column
COMMENT ON COLUMN documents.project_id IS 'Foreign key to research_projects. Can be NULL for global documents not associated with a specific project.';
