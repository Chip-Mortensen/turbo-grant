-- Create the project-attachments bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('project-attachments', 'project-attachments')
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own project attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own project attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own project attachments" ON storage.objects;

-- Create policy to allow users to view their own project attachments
CREATE POLICY "Users can view their own project attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-attachments'
  AND auth.uid() = (
    SELECT user_id
    FROM public.research_projects rp
    WHERE rp.id = CAST(SPLIT_PART(storage.objects.name, '/', 1) AS UUID)
  )
);

-- Create policy to allow users to upload attachments to their own projects
CREATE POLICY "Users can upload their own project attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-attachments'
  AND auth.uid() = (
    SELECT user_id
    FROM public.research_projects
    WHERE id = CAST(SPLIT_PART(storage.objects.name, '/', 1) AS UUID)
  )
);

-- Create policy to allow users to update their own project attachments
CREATE POLICY "Users can update their own project attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-attachments'
  AND auth.uid() = (
    SELECT user_id
    FROM public.research_projects
    WHERE id = CAST(SPLIT_PART(storage.objects.name, '/', 1) AS UUID)
  )
);

-- Create policy to allow users to delete their own project attachments
CREATE POLICY "Users can delete their own project attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-attachments'
  AND auth.uid() = (
    SELECT user_id
    FROM public.research_projects
    WHERE id = CAST(SPLIT_PART(storage.objects.name, '/', 1) AS UUID)
  )
);
