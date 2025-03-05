ALTER TABLE completed_documents
ADD CONSTRAINT completed_documents_document_id_project_id_key 
UNIQUE (document_id, project_id);
