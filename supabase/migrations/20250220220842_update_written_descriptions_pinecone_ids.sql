-- Rename existing column to avoid conflicts
ALTER TABLE public.written_descriptions 
RENAME COLUMN pinecone_id TO pinecone_id_old;

-- Add new column for array of IDs
ALTER TABLE public.written_descriptions
ADD COLUMN pinecone_ids TEXT[] DEFAULT '{}';

-- Migrate any existing data
UPDATE public.written_descriptions
SET pinecone_ids = ARRAY[pinecone_id_old]
WHERE pinecone_id_old IS NOT NULL;

-- Drop old column
ALTER TABLE public.written_descriptions
DROP COLUMN pinecone_id_old;

-- Add comment to explain the column
COMMENT ON COLUMN public.written_descriptions.pinecone_ids IS 'Array of Pinecone vector IDs for this description, one per chunk';
