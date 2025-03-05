-- Drop the table and recreate with UUID
DROP TABLE IF EXISTS public.recommended_equipment;

CREATE TABLE public.recommended_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.research_projects(id) ON DELETE CASCADE,
    equipment jsonb[] NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.recommended_equipment ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own project's equipment"
    ON public.recommended_equipment
    FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM public.research_projects
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own project's equipment"
    ON public.recommended_equipment
    FOR ALL
    USING (
        project_id IN (
            SELECT id FROM public.research_projects
            WHERE user_id = auth.uid()
        )
    );

-- Create trigger for updating the updated_at column
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.recommended_equipment
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
