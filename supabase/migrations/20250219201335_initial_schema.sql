-- Drop existing triggers first
DROP TRIGGER IF EXISTS set_updated_at ON public.research_projects;
DROP TRIGGER IF EXISTS set_updated_at ON public.project_grants;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own projects" ON public.research_projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.research_projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.research_projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.research_projects;
DROP POLICY IF EXISTS "Users can view descriptions of their projects" ON public.written_descriptions;
DROP POLICY IF EXISTS "Users can create descriptions for their projects" ON public.written_descriptions;
DROP POLICY IF EXISTS "Users can update descriptions of their projects" ON public.written_descriptions;
DROP POLICY IF EXISTS "Users can delete descriptions of their projects" ON public.written_descriptions;
DROP POLICY IF EXISTS "Users can view figures of their projects" ON public.scientific_figures;
DROP POLICY IF EXISTS "Users can create figures for their projects" ON public.scientific_figures;
DROP POLICY IF EXISTS "Users can update figures of their projects" ON public.scientific_figures;
DROP POLICY IF EXISTS "Users can delete figures of their projects" ON public.scientific_figures;
DROP POLICY IF EXISTS "Users can view chalk talks of their projects" ON public.chalk_talks;
DROP POLICY IF EXISTS "Users can create chalk talks for their projects" ON public.chalk_talks;
DROP POLICY IF EXISTS "Users can update chalk talks of their projects" ON public.chalk_talks;
DROP POLICY IF EXISTS "Users can delete chalk talks of their projects" ON public.chalk_talks;
DROP POLICY IF EXISTS "Users can view researcher profiles of their projects" ON public.researcher_profiles;
DROP POLICY IF EXISTS "Users can create researcher profiles for their projects" ON public.researcher_profiles;
DROP POLICY IF EXISTS "Users can update researcher profiles of their projects" ON public.researcher_profiles;
DROP POLICY IF EXISTS "Users can delete researcher profiles of their projects" ON public.researcher_profiles;
DROP POLICY IF EXISTS "Everyone can view grant types" ON public.grant_types;
DROP POLICY IF EXISTS "Users can create custom grant types" ON public.grant_types;
DROP POLICY IF EXISTS "Users can view grant applications of their projects" ON public.project_grants;
DROP POLICY IF EXISTS "Users can create grant applications for their projects" ON public.project_grants;
DROP POLICY IF EXISTS "Users can update grant applications of their projects" ON public.project_grants;
DROP POLICY IF EXISTS "Users can delete grant applications of their projects" ON public.project_grants;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Research Projects
CREATE TABLE IF NOT EXISTS public.research_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own projects" 
  ON public.research_projects
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" 
  ON public.research_projects
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
  ON public.research_projects
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
  ON public.research_projects
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Written Descriptions
CREATE TABLE IF NOT EXISTS public.written_descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.research_projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.written_descriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view descriptions of their projects" 
  ON public.written_descriptions
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can create descriptions for their projects" 
  ON public.written_descriptions
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can update descriptions of their projects" 
  ON public.written_descriptions
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can delete descriptions of their projects" 
  ON public.written_descriptions
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

-- Scientific Figures
CREATE TABLE IF NOT EXISTS public.scientific_figures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.research_projects(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  caption TEXT,
  order_index INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.scientific_figures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view figures of their projects" 
  ON public.scientific_figures
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can create figures for their projects" 
  ON public.scientific_figures
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can update figures of their projects" 
  ON public.scientific_figures
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can delete figures of their projects" 
  ON public.scientific_figures
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

-- Chalk Talks
CREATE TABLE IF NOT EXISTS public.chalk_talks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.research_projects(id) ON DELETE CASCADE,
  media_path TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('video', 'audio')),
  transcription TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.chalk_talks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view chalk talks of their projects" 
  ON public.chalk_talks
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can create chalk talks for their projects" 
  ON public.chalk_talks
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can update chalk talks of their projects" 
  ON public.chalk_talks
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can delete chalk talks of their projects" 
  ON public.chalk_talks
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

-- Researcher Profiles
CREATE TABLE IF NOT EXISTS public.researcher_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.research_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  institution TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.researcher_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view researcher profiles of their projects" 
  ON public.researcher_profiles
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can create researcher profiles for their projects" 
  ON public.researcher_profiles
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can update researcher profiles of their projects" 
  ON public.researcher_profiles
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can delete researcher profiles of their projects" 
  ON public.researcher_profiles
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

-- Grant Types
CREATE TABLE IF NOT EXISTS public.grant_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.grant_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Everyone can view grant types" 
  ON public.grant_types
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create custom grant types" 
  ON public.grant_types
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL AND is_custom = true);

-- Project Grant Applications
CREATE TABLE IF NOT EXISTS public.project_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.research_projects(id) ON DELETE CASCADE,
  grant_type_id UUID REFERENCES public.grant_types(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.project_grants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view grant applications of their projects" 
  ON public.project_grants
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can create grant applications for their projects" 
  ON public.project_grants
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can update grant applications of their projects" 
  ON public.project_grants
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

CREATE POLICY "Users can delete grant applications of their projects" 
  ON public.project_grants
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.research_projects 
      WHERE id = project_id AND auth.uid() = user_id
    )
  );

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add Updated At Triggers
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.research_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.project_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
