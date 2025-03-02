-- Remove transcription_path column as it's no longer needed
ALTER TABLE public.chalk_talks
DROP COLUMN IF EXISTS transcription_path;

-- Convert pinecone_id to pinecone_ids array
-- First rename existing column to avoid conflicts
ALTER TABLE public.chalk_talks 
RENAME COLUMN pinecone_id TO pinecone_id_old;

-- Add new column for array of IDs
ALTER TABLE public.chalk_talks
ADD COLUMN pinecone_ids TEXT[] DEFAULT '{}';

-- Migrate any existing data
UPDATE public.chalk_talks
SET pinecone_ids = ARRAY[pinecone_id_old]
WHERE pinecone_id_old IS NOT NULL;

-- Drop old column
ALTER TABLE public.chalk_talks
DROP COLUMN pinecone_id_old;

-- Add comment to explain the column
COMMENT ON COLUMN public.chalk_talks.pinecone_ids IS 'Array of Pinecone vector IDs for this chalk talk, one per chunk';

-- Modify the trigger function to check transcription status
CREATE OR REPLACE FUNCTION public.handle_content_vectorization()
RETURNS TRIGGER AS $$
DECLARE
    v_project_id UUID;
    v_content_type TEXT;
BEGIN
    -- Set content type based on the table
    CASE TG_TABLE_NAME
        WHEN 'research_descriptions' THEN 
            v_content_type := 'research_description';
            v_project_id := NEW.project_id;
        WHEN 'scientific_figures' THEN 
            v_content_type := 'scientific_figure';
            v_project_id := NEW.project_id;
        WHEN 'chalk_talks' THEN 
            v_content_type := 'chalk_talk';
            v_project_id := NEW.project_id;
        WHEN 'foas' THEN
            v_content_type := 'foa';
            v_project_id := NULL;
        ELSE
            RAISE EXCEPTION 'Unsupported table: %', TG_TABLE_NAME;
    END CASE;

    -- For chalk talks, only proceed if transcription is completed
    IF TG_TABLE_NAME = 'chalk_talks' THEN
        IF NEW.transcription_status != 'completed' THEN
            RETURN NEW; -- Skip processing if transcription is not completed
        END IF;
    END IF;

    -- Insert or update processing queue item
    INSERT INTO public.processing_queue (content_type, content_id, project_id, status)
    VALUES (v_content_type, NEW.id, v_project_id, 'pending')
    ON CONFLICT (content_type, content_id) 
    DO UPDATE SET 
        status = 'pending',
        updated_at = NOW(),
        retry_count = 0,
        error_message = NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger for chalk talks to also fire on transcription_status updates
DROP TRIGGER IF EXISTS queue_chalk_talk_vectorization ON public.chalk_talks;
CREATE TRIGGER queue_chalk_talk_vectorization
    AFTER INSERT OR UPDATE OF vectorization_status, transcription_status
    ON public.chalk_talks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_content_vectorization();
