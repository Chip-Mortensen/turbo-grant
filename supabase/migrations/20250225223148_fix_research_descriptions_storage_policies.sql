-- Drop existing policies for written-descriptions that might be outdated
DROP POLICY IF EXISTS "Users can view their own written descriptions" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own written descriptions" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own written descriptions" ON storage.objects;

-- Drop existing policies for research-descriptions if they exist
DROP POLICY IF EXISTS "Users can view their own research descriptions" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own research descriptions" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own research descriptions" ON storage.objects;

-- Create updated policies for research-descriptions bucket
CREATE POLICY "Users can view their own research descriptions"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'research-descriptions'
    AND auth.uid() = (
      SELECT user_id
      FROM public.research_projects rp
      JOIN public.research_descriptions rd ON rd.project_id = rp.id
      WHERE rd.file_path = storage.objects.name
    )
  );

CREATE POLICY "Users can upload their own research descriptions"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'research-descriptions'
    AND auth.uid() = (
      SELECT user_id
      FROM public.research_projects
      WHERE id = CAST(SPLIT_PART(storage.objects.name, '/', 1) AS UUID)
    )
  );

CREATE POLICY "Users can delete their own research descriptions"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'research-descriptions'
    AND auth.uid() = (
      SELECT user_id
      FROM public.research_projects rp
      JOIN public.research_descriptions rd ON rd.project_id = rp.id
      WHERE rd.file_path = storage.objects.name
    )
  );

-- Drop the old policy if it exists (from the storage_policies.sql migration)
DROP POLICY IF EXISTS "Project owners can manage written descriptions" ON storage.objects;

-- Drop and recreate the project owners policy
DROP POLICY IF EXISTS "Project owners can manage research descriptions" ON storage.objects;
CREATE POLICY "Project owners can manage research descriptions"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'research-descriptions' 
    AND auth.uid() = (
      SELECT user_id 
      FROM public.research_projects 
      WHERE id::text = (REGEXP_MATCH(name, '^([^/]+)/.*'))[1]
    )
  );
