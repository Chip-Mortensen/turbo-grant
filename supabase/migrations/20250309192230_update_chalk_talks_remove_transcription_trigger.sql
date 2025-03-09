-- Modify the trigger function to remove transcription status check
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

-- Update the trigger for chalk talks to only fire on insert or vectorization_status updates
DROP TRIGGER IF EXISTS queue_chalk_talk_vectorization ON public.chalk_talks;
CREATE TRIGGER queue_chalk_talk_vectorization
    AFTER INSERT OR UPDATE OF vectorization_status
    ON public.chalk_talks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_content_vectorization();
