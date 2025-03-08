-- First remove any orphaned completed_documents that reference non-existent projects
DELETE FROM completed_documents
WHERE project_id IS NOT NULL
AND project_id NOT IN (SELECT id FROM research_projects);

-- First remove the existing foreign key if it exists
ALTER TABLE completed_documents
DROP CONSTRAINT IF EXISTS completed_documents_project_id_fkey;

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE completed_documents
ADD CONSTRAINT completed_documents_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES research_projects(id)
ON DELETE CASCADE;
