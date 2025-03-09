-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy for inserting documents (authenticated users only)
CREATE POLICY "Authenticated users can create documents"
ON documents
FOR INSERT
TO public
WITH CHECK (auth.role() = 'authenticated');

-- Policy for deleting documents (authenticated users only)
CREATE POLICY "Authenticated users can delete documents"
ON documents
FOR DELETE
TO public
USING (auth.role() = 'authenticated');

-- Policy for updating documents (authenticated users only)
CREATE POLICY "Authenticated users can update documents"
ON documents
FOR UPDATE
TO public
USING (auth.role() = 'authenticated');

-- Policy for viewing documents (everyone)
CREATE POLICY "Everyone can view documents"
ON documents
FOR SELECT
TO public
USING (true);
