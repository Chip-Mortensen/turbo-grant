-- Drop existing policies
DROP POLICY IF EXISTS "Project owners can manage research descriptions" ON storage.objects;
DROP POLICY IF EXISTS "Project owners can manage scientific figures" ON storage.objects;
DROP POLICY IF EXISTS "Project owners can manage chalk talks" ON storage.objects;

-- Update research_descriptions bucket configuration
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]::text[],
file_size_limit = 10485760  -- 10MB in bytes
WHERE id = 'research_descriptions';

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Project owners can manage research descriptions"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'research_descriptions' 
  AND auth.uid() = (
    SELECT user_id 
    FROM research_projects 
    WHERE id::text = (regexp_match(name, '^([^/]+)/.*'))[1]
  )
);

CREATE POLICY "Project owners can manage scientific figures"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'scientific_figures'
  AND auth.uid() = (
    SELECT user_id 
    FROM research_projects 
    WHERE id::text = (regexp_match(name, '^([^/]+)/.*'))[1]
  )
);

CREATE POLICY "Project owners can manage chalk talks"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'chalk_talks'
  AND auth.uid() = (
    SELECT user_id 
    FROM research_projects 
    WHERE id::text = (regexp_match(name, '^([^/]+)/.*'))[1]
  )
); 