alter table documents
  add column agency text check (agency in ('NIH', 'NSF')),
  add column grant_types text[] default '{}';

-- Create an index on the agency column since we'll likely query by it
create index documents_agency_idx on documents(agency);
