-- Rename the table
ALTER TABLE public.written_descriptions RENAME TO research_descriptions;

-- Rename RLS policies
ALTER POLICY "Users can view descriptions of their projects" ON public.research_descriptions RENAME TO "Users can view research descriptions of their projects";
ALTER POLICY "Users can create descriptions for their projects" ON public.research_descriptions RENAME TO "Users can create research descriptions for their projects";
ALTER POLICY "Users can update descriptions of their projects" ON public.research_descriptions RENAME TO "Users can update research descriptions of their projects";
ALTER POLICY "Users can delete descriptions of their projects" ON public.research_descriptions RENAME TO "Users can delete research descriptions of their projects";

-- Rename storage bucket
UPDATE storage.buckets SET id = 'research-descriptions', name = 'research-descriptions' WHERE id = 'written-descriptions';

-- Update storage policies
-- Note: Skipping policy rename as it appears the policy may have already been renamed

-- Update function references
CREATE OR REPLACE FUNCTION public.handle_content_vectorization()
RETURNS TRIGGER AS $$
DECLARE
    v_project_id UUID;
    v_content_type TEXT;
BEGIN
    -- Set content type based on the table
    CASE TG_TABLE_NAME
        WHEN 'research_descriptions' THEN 
            v_content_type := 'description';
            v_project_id := NEW.project_id;
        WHEN 'scientific_figures' THEN 
            v_content_type := 'figure';
            v_project_id := NEW.project_id;
        WHEN 'chalk_talks' THEN 
            v_content_type := 'chalk_talk';
            v_project_id := NEW.project_id;
        ELSE
            RAISE EXCEPTION 'Unsupported table: %', TG_TABLE_NAME;
    END CASE;

    -- Insert or update processing queue item
    INSERT INTO public.processing_queue (content_type, content_id, project_id, status)
    VALUES (v_content_type, NEW.id, v_project_id, 'pending')
    ON CONFLICT (content_type, content_id) 
    DO UPDATE SET 
        status = 'pending',
        updated_at = NOW(),
        attempts = 0,
        error = NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update triggers
DROP TRIGGER IF EXISTS queue_written_description_vectorization ON public.research_descriptions;
CREATE TRIGGER queue_research_description_vectorization
AFTER INSERT OR UPDATE OF file_path ON public.research_descriptions
FOR EACH ROW
WHEN (NEW.vectorization_status = 'pending')
EXECUTE FUNCTION public.handle_content_vectorization();

-- Update comments
COMMENT ON COLUMN public.research_descriptions.pinecone_ids IS 'Array of Pinecone vector IDs for this research description, one per chunk';
