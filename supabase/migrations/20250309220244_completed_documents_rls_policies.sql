-- Enable Row Level Security
ALTER TABLE completed_documents ENABLE ROW LEVEL SECURITY;

-- Policy for viewing completed documents (project owners only)
CREATE POLICY "Users can view completed documents for their projects"
ON public.completed_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.research_projects
    WHERE id = project_id AND auth.uid() = user_id
  )
);

-- Policy for creating completed documents (project owners only)
CREATE POLICY "Users can create completed documents for their projects"
ON public.completed_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.research_projects
    WHERE id = project_id AND auth.uid() = user_id
  )
);

-- Policy for updating completed documents (project owners only)
CREATE POLICY "Users can update completed documents for their projects"
ON public.completed_documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.research_projects
    WHERE id = project_id AND auth.uid() = user_id
  )
);

-- Policy for deleting completed documents (project owners only)
CREATE POLICY "Users can delete completed documents for their projects"
ON public.completed_documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.research_projects
    WHERE id = project_id AND auth.uid() = user_id
  )
);
