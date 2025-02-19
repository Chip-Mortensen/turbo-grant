-- Create storage buckets for different content types
insert into storage.buckets (id, name, public)
values 
  ('written-descriptions', 'written-descriptions', false),
  ('scientific-figures', 'scientific-figures', false),
  ('chalk-talks', 'chalk-talks', false);

-- Enable RLS on all buckets
update storage.buckets
set public = false
where id in ('written-descriptions', 'scientific-figures', 'chalk-talks');

-- Create storage policies for written descriptions
create policy "Users can view their own written descriptions"
  on storage.objects for select
  using (
    bucket_id = 'written-descriptions'
    and auth.uid() = (
      select user_id
      from public.research_projects rp
      join public.written_descriptions wd on wd.project_id = rp.id
      where wd.file_path = storage.objects.name
    )
  );

create policy "Users can upload their own written descriptions"
  on storage.objects for insert
  with check (
    bucket_id = 'written-descriptions'
    and auth.uid() = (
      select user_id
      from public.research_projects
      where id = cast(split_part(storage.objects.name, '/', 1) as uuid)
    )
  );

create policy "Users can delete their own written descriptions"
  on storage.objects for delete
  using (
    bucket_id = 'written-descriptions'
    and auth.uid() = (
      select user_id
      from public.research_projects rp
      join public.written_descriptions wd on wd.project_id = rp.id
      where wd.file_path = storage.objects.name
    )
  );

-- Create storage policies for scientific figures
create policy "Users can view their own scientific figures"
  on storage.objects for select
  using (
    bucket_id = 'scientific-figures'
    and auth.uid() = (
      select user_id
      from public.research_projects rp
      join public.scientific_figures sf on sf.project_id = rp.id
      where sf.image_path = storage.objects.name
    )
  );

create policy "Users can upload their own scientific figures"
  on storage.objects for insert
  with check (
    bucket_id = 'scientific-figures'
    and auth.uid() = (
      select user_id
      from public.research_projects
      where id = cast(split_part(storage.objects.name, '/', 1) as uuid)
    )
  );

create policy "Users can delete their own scientific figures"
  on storage.objects for delete
  using (
    bucket_id = 'scientific-figures'
    and auth.uid() = (
      select user_id
      from public.research_projects rp
      join public.scientific_figures sf on sf.project_id = rp.id
      where sf.image_path = storage.objects.name
    )
  );

-- Create storage policies for chalk talks
create policy "Users can view their own chalk talks"
  on storage.objects for select
  using (
    bucket_id = 'chalk-talks'
    and auth.uid() = (
      select user_id
      from public.research_projects rp
      join public.chalk_talks ct on ct.project_id = rp.id
      where ct.media_path = storage.objects.name
    )
  );

create policy "Users can upload their own chalk talks"
  on storage.objects for insert
  with check (
    bucket_id = 'chalk-talks'
    and auth.uid() = (
      select user_id
      from public.research_projects
      where id = cast(split_part(storage.objects.name, '/', 1) as uuid)
    )
  );

create policy "Users can delete their own chalk talks"
  on storage.objects for delete
  using (
    bucket_id = 'chalk-talks'
    and auth.uid() = (
      select user_id
      from public.research_projects rp
      join public.chalk_talks ct on ct.project_id = rp.id
      where ct.media_path = storage.objects.name
    )
  );
