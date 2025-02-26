-- 1. Update the handle_content_vectorization function to include foas
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
            -- FOAs don't have a project_id, so we'll use a special UUID
            -- This is a placeholder - in a real system, you might want to handle this differently
            v_project_id := '00000000-0000-0000-0000-000000000000'::UUID;
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

-- 2. Update the content_type constraint on the processing_queue table
ALTER TABLE public.processing_queue DROP CONSTRAINT IF EXISTS processing_queue_content_type_check;

-- Add the updated check constraint with the new content type
ALTER TABLE public.processing_queue 
ADD CONSTRAINT processing_queue_content_type_check 
CHECK (content_type IN ('research_description', 'scientific_figure', 'chalk_talk', 'foa'));

-- 3. Create a trigger on the foas table
CREATE TRIGGER queue_foa_vectorization
AFTER INSERT OR UPDATE OF description ON public.foas
FOR EACH ROW
EXECUTE FUNCTION public.handle_content_vectorization();

-- Add comment explaining the trigger
COMMENT ON TRIGGER queue_foa_vectorization ON public.foas IS 'Trigger to add FOAs to the processing queue for vectorization when inserted or when description is updated';
