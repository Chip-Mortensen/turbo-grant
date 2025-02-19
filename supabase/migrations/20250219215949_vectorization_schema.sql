-- Add vectorization status tracking columns to written_descriptions
ALTER TABLE public.written_descriptions
ADD COLUMN IF NOT EXISTS vectorization_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (vectorization_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN IF NOT EXISTS vectorization_error TEXT,
ADD COLUMN IF NOT EXISTS last_vectorized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pinecone_id TEXT;

-- Add vectorization and AI description columns to scientific_figures
ALTER TABLE public.scientific_figures
ADD COLUMN IF NOT EXISTS vectorization_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (vectorization_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN IF NOT EXISTS vectorization_error TEXT,
ADD COLUMN IF NOT EXISTS last_vectorized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ai_description TEXT,
ADD COLUMN IF NOT EXISTS ai_description_model TEXT,
ADD COLUMN IF NOT EXISTS pinecone_id TEXT;

-- Add transcription and vectorization columns to chalk_talks
ALTER TABLE public.chalk_talks
ADD COLUMN IF NOT EXISTS transcription_path TEXT,
ADD COLUMN IF NOT EXISTS transcription_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (transcription_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN IF NOT EXISTS transcription_error TEXT,
ADD COLUMN IF NOT EXISTS vectorization_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (vectorization_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN IF NOT EXISTS vectorization_error TEXT,
ADD COLUMN IF NOT EXISTS last_vectorized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pinecone_id TEXT;

-- Add vectorization columns to researcher_profiles
ALTER TABLE public.researcher_profiles
ADD COLUMN IF NOT EXISTS vectorization_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (vectorization_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN IF NOT EXISTS vectorization_error TEXT,
ADD COLUMN IF NOT EXISTS last_vectorized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pinecone_id TEXT;

-- Create processing queue table
CREATE TABLE IF NOT EXISTS public.processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type TEXT NOT NULL CHECK (content_type IN ('description', 'figure', 'chalk_talk', 'researcher')),
    content_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    chunk_start INTEGER,
    chunk_end INTEGER
);

-- Enable RLS on processing queue
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for processing queue
CREATE POLICY "Users can view processing queue items for their projects"
ON public.processing_queue
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.research_projects
    WHERE id = project_id AND auth.uid() = user_id
  )
);

CREATE POLICY "Users can create processing queue items for their projects"
ON public.processing_queue
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.research_projects
    WHERE id = project_id AND auth.uid() = user_id
  )
);

CREATE POLICY "Users can update processing queue items for their projects"
ON public.processing_queue
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.research_projects
    WHERE id = project_id AND auth.uid() = user_id
  )
);

CREATE POLICY "Users can delete processing queue items for their projects"
ON public.processing_queue
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.research_projects
    WHERE id = project_id AND auth.uid() = user_id
  )
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to processing_queue
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
