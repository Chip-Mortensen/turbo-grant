-- Add citation column to project_sources table
ALTER TABLE project_sources
ADD COLUMN citation TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN project_sources.citation IS 'The citation text for this source, formatted according to citation style guidelines';
