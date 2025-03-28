-- Update the handle_content_vectorization function to use the new content type names
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

-- Update existing queue items to use the new content type names
UPDATE public.processing_queue
SET content_type = 'research_description'
WHERE content_type = 'description';

UPDATE public.processing_queue
SET content_type = 'scientific_figure'
WHERE content_type = 'figure';
