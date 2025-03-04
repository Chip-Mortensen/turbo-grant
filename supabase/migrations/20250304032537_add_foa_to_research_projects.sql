-- Add foa column to research_projects table
ALTER TABLE public.research_projects
ADD COLUMN foa UUID REFERENCES public.foas(id) ON DELETE SET NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.research_projects.foa IS 'The selected funding opportunity announcement for this research project. Can be NULL if no FOA is selected yet.';
