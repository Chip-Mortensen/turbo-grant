create policy "Project owners can manage completed documents"
on storage.objects for all to authenticated
using (
  bucket_id = 'completed-documents'
  and auth.uid() = (
    select user_id 
    from public.research_projects 
    where id::text = (regexp_match(name, '^([^/]+)/.*'))[1]
  )
);
