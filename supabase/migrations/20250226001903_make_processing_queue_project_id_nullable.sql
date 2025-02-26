-- 1. First, drop the foreign key constraint on project_id
ALTER TABLE public.processing_queue
DROP CONSTRAINT IF EXISTS processing_queue_project_id_fkey;

-- 2. Make the project_id column nullable
ALTER TABLE public.processing_queue
ALTER COLUMN project_id DROP NOT NULL;

-- 3. Re-add the foreign key constraint with ON DELETE CASCADE, but allow NULL values
ALTER TABLE public.processing_queue
ADD CONSTRAINT processing_queue_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES public.research_projects(id)
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- 4. Update the handle_content_vectorization function to set NULL for FOAs
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
            -- FOAs don't have a project_id, so we'll set it to NULL
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

-- 5. Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view processing queue items for their projects" ON public.processing_queue;
DROP POLICY IF EXISTS "Users can create processing queue items for their projects" ON public.processing_queue;
DROP POLICY IF EXISTS "Users can update processing queue items for their projects" ON public.processing_queue;
DROP POLICY IF EXISTS "Users can delete processing queue items for their projects" ON public.processing_queue;

-- 6. Create updated RLS policies that handle NULL project_ids
-- Policy for viewing items: users can view their project items OR global items (NULL project_id)
CREATE POLICY "Users can view processing queue items"
ON public.processing_queue
FOR SELECT
USING (
  project_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.research_projects
    WHERE id = project_id AND auth.uid() = user_id
  )
);

-- Policy for creating items: users can create for their projects OR global items if authenticated
CREATE POLICY "Users can create processing queue items"
ON public.processing_queue
FOR INSERT
WITH CHECK (
  (project_id IS NULL AND auth.uid() IS NOT NULL) OR
  EXISTS (
    SELECT 1 FROM public.research_projects
    WHERE id = project_id AND auth.uid() = user_id
  )
);

-- Policy for updating items: users can update their project items OR global items if authenticated
CREATE POLICY "Users can update processing queue items"
ON public.processing_queue
FOR UPDATE
USING (
  (project_id IS NULL AND auth.uid() IS NOT NULL) OR
  EXISTS (
    SELECT 1 FROM public.research_projects
    WHERE id = project_id AND auth.uid() = user_id
  )
);

-- Policy for deleting items: users can delete their project items OR global items if authenticated
CREATE POLICY "Users can delete processing queue items"
ON public.processing_queue
FOR DELETE
USING (
  (project_id IS NULL AND auth.uid() IS NOT NULL) OR
  EXISTS (
    SELECT 1 FROM public.research_projects
    WHERE id = project_id AND auth.uid() = user_id
  )
);

-- Add comment explaining the changes
COMMENT ON TABLE public.processing_queue IS 'Queue for content that needs to be processed for vectorization. Project_id can be NULL for global items like FOAs.';
