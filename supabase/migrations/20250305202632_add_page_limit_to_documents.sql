-- Add page_limit column to documents table
ALTER TABLE public.documents
ADD COLUMN page_limit DECIMAL(4,1);

-- Add comment explaining the column
COMMENT ON COLUMN public.documents.page_limit IS 'Maximum number of pages allowed for this document. Can include half pages.';
