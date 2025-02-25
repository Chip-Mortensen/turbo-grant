-- Drop the existing check constraint
ALTER TABLE public.processing_queue DROP CONSTRAINT IF EXISTS processing_queue_content_type_check;

-- Add the updated check constraint with only the new content type names
ALTER TABLE public.processing_queue 
ADD CONSTRAINT processing_queue_content_type_check 
CHECK (content_type IN ('research_description', 'scientific_figure', 'chalk_talk'));

-- Update existing records to use the new content type names
UPDATE public.processing_queue
SET content_type = 'research_description'
WHERE content_type = 'description';

UPDATE public.processing_queue
SET content_type = 'scientific_figure'
WHERE content_type = 'figure';

-- No need to update chalk_talk as the name remains the same
