-- Create the project_sources table
CREATE TABLE IF NOT EXISTS public.project_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.research_projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.project_sources ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their own project's sources
CREATE POLICY "Users can view their own project's sources"
    ON public.project_sources
    FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM public.research_projects
            WHERE user_id = auth.uid()
        )
    );

-- Create policy to allow users to manage their own project's sources
CREATE POLICY "Users can manage their own project's sources"
    ON public.project_sources
    FOR ALL
    USING (
        project_id IN (
            SELECT id FROM public.research_projects
            WHERE user_id = auth.uid()
        )
    );

-- Create trigger for updating the updated_at column
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.project_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
