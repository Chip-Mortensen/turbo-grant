ALTER TABLE completed_documents
ADD COLUMN project_id UUID;

ALTER TABLE completed_documents
ALTER COLUMN project_id SET NOT NULL;
