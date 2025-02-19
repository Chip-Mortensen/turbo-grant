-- Drop existing policies
drop policy if exists "Project owners can manage written descriptions" on storage.objects;
drop policy if exists "Project owners can manage scientific figures" on storage.objects;
drop policy if exists "Project owners can manage chalk talks" on storage.objects;

-- Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- Written Descriptions Bucket Policies
create policy "Project owners can manage written descriptions"
on storage.objects for all to authenticated
using (
  bucket_id = 'written-descriptions' 
  and auth.uid() = (
    select user_id 
    from public.research_projects 
    where id::text = (regexp_match(name, '^([^/]+)/.*'))[1]
  )
);

-- Scientific Figures Bucket Policies
create policy "Project owners can manage scientific figures"
on storage.objects for all to authenticated
using (
  bucket_id = 'scientific-figures'
  and auth.uid() = (
    select user_id 
    from public.research_projects 
    where id::text = (regexp_match(name, '^([^/]+)/.*'))[1]
  )
);

-- Chalk Talks Bucket Policies
create policy "Project owners can manage chalk talks"
on storage.objects for all to authenticated
using (
  bucket_id = 'chalk-talks'
  and auth.uid() = (
    select user_id 
    from public.research_projects 
    where id::text = (regexp_match(name, '^([^/]+)/.*'))[1]
  )
);
