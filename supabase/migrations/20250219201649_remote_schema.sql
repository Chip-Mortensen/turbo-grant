-- Add pinecone_id column to content tables
alter table public.written_descriptions
add column if not exists pinecone_id text;

alter table public.scientific_figures
add column if not exists pinecone_id text;

alter table public.chalk_talks
add column if not exists pinecone_id text;

alter table public.researcher_profiles
add column if not exists pinecone_id text;
