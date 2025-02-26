-- Function to handle deletion of content from processing queue
CREATE OR REPLACE FUNCTION public.handle_content_deletion()
RETURNS TRIGGER AS $$
DECLARE
    v_content_type TEXT;
BEGIN
    -- Set content type based on the table
    CASE TG_TABLE_NAME
        WHEN 'research_descriptions' THEN 
            v_content_type := 'research_description';
        WHEN 'scientific_figures' THEN 
            v_content_type := 'scientific_figure';
        WHEN 'chalk_talks' THEN 
            v_content_type := 'chalk_talk';
        WHEN 'foas' THEN
            v_content_type := 'foa';
        ELSE
            RAISE EXCEPTION 'Unsupported table: %', TG_TABLE_NAME;
    END CASE;

    -- Delete the corresponding entry from the processing queue
    DELETE FROM public.processing_queue 
    WHERE content_type = v_content_type AND content_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create delete triggers for each content type table

-- Research Descriptions
DROP TRIGGER IF EXISTS cleanup_research_description_queue ON public.research_descriptions;
CREATE TRIGGER cleanup_research_description_queue
    AFTER DELETE ON public.research_descriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_content_deletion();

-- Scientific Figures
DROP TRIGGER IF EXISTS cleanup_scientific_figure_queue ON public.scientific_figures;
CREATE TRIGGER cleanup_scientific_figure_queue
    AFTER DELETE ON public.scientific_figures
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_content_deletion();

-- Chalk Talks
DROP TRIGGER IF EXISTS cleanup_chalk_talk_queue ON public.chalk_talks;
CREATE TRIGGER cleanup_chalk_talk_queue
    AFTER DELETE ON public.chalk_talks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_content_deletion();

-- FOAs
DROP TRIGGER IF EXISTS cleanup_foa_queue ON public.foas;
CREATE TRIGGER cleanup_foa_queue
    AFTER DELETE ON public.foas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_content_deletion();

-- Add comments explaining the triggers
COMMENT ON FUNCTION public.handle_content_deletion IS 'Function to delete entries from the processing queue when content is deleted';
COMMENT ON TRIGGER cleanup_research_description_queue ON public.research_descriptions IS 'Trigger to clean up processing queue when a research description is deleted';
COMMENT ON TRIGGER cleanup_scientific_figure_queue ON public.scientific_figures IS 'Trigger to clean up processing queue when a scientific figure is deleted';
COMMENT ON TRIGGER cleanup_chalk_talk_queue ON public.chalk_talks IS 'Trigger to clean up processing queue when a chalk talk is deleted';
COMMENT ON TRIGGER cleanup_foa_queue ON public.foas IS 'Trigger to clean up processing queue when an FOA is deleted';
