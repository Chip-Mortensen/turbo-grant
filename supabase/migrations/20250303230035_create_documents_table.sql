create type document_field_type as enum ('text', 'textarea', 'select');
create type document_source_type as enum ('research_description', 'scientific_figure', 'chalk_talk', 'foa');

create table documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fields jsonb[] not null,
  sources document_source_type[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
