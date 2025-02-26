-- Add vectorization status tracking columns to foas
ALTER TABLE public.foas
ADD COLUMN IF NOT EXISTS vectorization_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (vectorization_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN IF NOT EXISTS pinecone_ids TEXT[];

-- Add comment explaining the columns
COMMENT ON COLUMN public.foas.vectorization_status IS 'Current status of the vectorization process';
COMMENT ON COLUMN public.foas.pinecone_ids IS 'Array of Pinecone vector IDs for this FOA';
