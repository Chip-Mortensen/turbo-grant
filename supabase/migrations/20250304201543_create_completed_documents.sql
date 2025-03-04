create table completed_documents (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  content text,
  file_url text,
  created_at timestamp with time zone default now()
);

insert into storage.buckets (id, name)
values ('completed-documents', 'completed-documents');
