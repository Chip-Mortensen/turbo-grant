-- Add prompt column to documents table
ALTER TABLE public.documents
ADD COLUMN prompt text;

-- Add comment explaining the column
COMMENT ON COLUMN public.documents.prompt IS 'Text prompt used to generate document content and guide AI processing';
