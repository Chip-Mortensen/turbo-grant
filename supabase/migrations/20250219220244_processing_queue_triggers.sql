-- Function to add or update processing queue item
CREATE OR REPLACE FUNCTION public.handle_content_vectorization()
RETURNS TRIGGER AS $$
DECLARE
    v_project_id UUID;
    v_content_type TEXT;
BEGIN
    -- Set content type based on the table
    CASE TG_TABLE_NAME
        WHEN 'written_descriptions' THEN 
            v_content_type := 'description';
            v_project_id := NEW.project_id;
        WHEN 'scientific_figures' THEN 
            v_content_type := 'figure';
            v_project_id := NEW.project_id;
        WHEN 'chalk_talks' THEN 
            v_content_type := 'chalk_talk';
            v_project_id := NEW.project_id;
        WHEN 'researcher_profiles' THEN 
            v_content_type := 'researcher';
            v_project_id := NEW.project_id;
    END CASE;

    -- Only proceed if content needs processing
    IF (TG_OP = 'INSERT') OR 
       (TG_OP = 'UPDATE' AND 
        (NEW.vectorization_status = 'pending' OR NEW.vectorization_status = 'error')
       ) THEN
        -- Insert or update processing queue entry
        INSERT INTO public.processing_queue (
            content_type,
            content_id,
            project_id,
            status,
            priority,
            retry_count
        )
        VALUES (
            v_content_type,
            NEW.id,
            v_project_id,
            'pending',
            CASE 
                WHEN NEW.vectorization_status = 'error' THEN 2  -- Higher priority for retries
                ELSE 1
            END,
            0
        )
        ON CONFLICT (content_type, content_id) DO UPDATE SET
            status = 'pending',
            priority = CASE 
                WHEN NEW.vectorization_status = 'error' THEN 2
                ELSE 1
            END,
            retry_count = 0,
            error_message = NULL,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint to prevent duplicate queue entries
ALTER TABLE public.processing_queue 
ADD CONSTRAINT unique_content_entry UNIQUE (content_type, content_id);

-- Create triggers for written descriptions
DROP TRIGGER IF EXISTS queue_written_description_vectorization ON public.written_descriptions;
CREATE TRIGGER queue_written_description_vectorization
    AFTER INSERT OR UPDATE OF vectorization_status
    ON public.written_descriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_content_vectorization();

-- Create triggers for scientific figures
DROP TRIGGER IF EXISTS queue_scientific_figure_vectorization ON public.scientific_figures;
CREATE TRIGGER queue_scientific_figure_vectorization
    AFTER INSERT OR UPDATE OF vectorization_status
    ON public.scientific_figures
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_content_vectorization();

-- Create triggers for chalk talks
DROP TRIGGER IF EXISTS queue_chalk_talk_vectorization ON public.chalk_talks;
CREATE TRIGGER queue_chalk_talk_vectorization
    AFTER INSERT OR UPDATE OF vectorization_status
    ON public.chalk_talks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_content_vectorization();

-- Create triggers for researcher profiles
DROP TRIGGER IF EXISTS queue_researcher_profile_vectorization ON public.researcher_profiles;
CREATE TRIGGER queue_researcher_profile_vectorization
    AFTER INSERT OR UPDATE OF vectorization_status
    ON public.researcher_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_content_vectorization();
