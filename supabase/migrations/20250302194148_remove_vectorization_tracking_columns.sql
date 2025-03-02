-- Remove vectorization_error and last_vectorized_at columns from research_descriptions
ALTER TABLE public.research_descriptions
DROP COLUMN IF EXISTS vectorization_error,
DROP COLUMN IF EXISTS last_vectorized_at;

-- Remove vectorization_error and last_vectorized_at columns from scientific_figures
ALTER TABLE public.scientific_figures
DROP COLUMN IF EXISTS vectorization_error,
DROP COLUMN IF EXISTS last_vectorized_at;

-- Remove vectorization_error and last_vectorized_at columns from chalk_talks
ALTER TABLE public.chalk_talks
DROP COLUMN IF EXISTS vectorization_error,
DROP COLUMN IF EXISTS last_vectorized_at;

-- Update the trigger function to not reference these columns
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
