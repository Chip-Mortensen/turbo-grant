-- Log existing policies before dropping
DO $$ 
DECLARE
    policy_record record;
BEGIN
    RAISE NOTICE 'Existing policies on storage.objects:';
    FOR policy_record IN (
        SELECT policyname, permissive, cmd, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    )
    LOOP
        RAISE NOTICE 'Policy: %, Type: %, Command: %, Using: %, With Check: %', 
            policy_record.policyname, 
            policy_record.permissive, 
            policy_record.cmd,
            policy_record.qual,
            policy_record.with_check;
    END LOOP;
END $$;

-- Drop all existing policies with logging
DO $$ 
DECLARE
    policy_name text;
BEGIN
    RAISE NOTICE 'Starting to drop policies...';
    FOR policy_name IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    )
    LOOP
        RAISE NOTICE 'Dropping policy: %', policy_name;
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects CASCADE', policy_name);
    END LOOP;
    RAISE NOTICE 'Finished dropping policies';
END $$;

-- Enable RLS with confirmation
DO $$
BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on storage.objects';
END $$;

-- Create policies with logging
DO $$
BEGIN
    RAISE NOTICE 'Creating research descriptions policy...';
    EXECUTE $policy$
        CREATE POLICY "Project owners can manage research descriptions"
        ON storage.objects
        AS permissive
        FOR ALL
        TO authenticated
        USING (
            bucket_id = 'research_descriptions' 
            AND auth.uid() = (
                SELECT user_id 
                FROM research_projects 
                WHERE id::text = (regexp_match(name, '^([^/]+)/.*'))[1]
            )
        )
        WITH CHECK (
            bucket_id = 'research_descriptions' 
            AND auth.uid() = (
                SELECT user_id 
                FROM research_projects 
                WHERE id::text = (regexp_match(name, '^([^/]+)/.*'))[1]
            )
        )
    $policy$;
    
    RAISE NOTICE 'Creating scientific figures policy...';
    EXECUTE $policy$
        CREATE POLICY "Project owners can manage scientific figures"
        ON storage.objects
        AS permissive
        FOR ALL
        TO authenticated
        USING (
            bucket_id = 'scientific_figures'
            AND auth.uid() = (
                SELECT user_id 
                FROM research_projects 
                WHERE id::text = (regexp_match(name, '^([^/]+)/.*'))[1]
            )
        )
        WITH CHECK (
            bucket_id = 'scientific_figures'
            AND auth.uid() = (
                SELECT user_id 
                FROM research_projects 
                WHERE id::text = (regexp_match(name, '^([^/]+)/.*'))[1]
            )
        )
    $policy$;
    
    RAISE NOTICE 'Creating chalk talks policy...';
    EXECUTE $policy$
        CREATE POLICY "Project owners can manage chalk talks"
        ON storage.objects
        AS permissive
        FOR ALL
        TO authenticated
        USING (
            bucket_id = 'chalk_talks'
            AND auth.uid() = (
                SELECT user_id 
                FROM research_projects 
                WHERE id::text = (regexp_match(name, '^([^/]+)/.*'))[1]
            )
        )
        WITH CHECK (
            bucket_id = 'chalk_talks'
            AND auth.uid() = (
                SELECT user_id 
                FROM research_projects 
                WHERE id::text = (regexp_match(name, '^([^/]+)/.*'))[1]
            )
        )
    $policy$;
    
    RAISE NOTICE 'All policies created successfully';
END $$;

-- Verify policies after creation
DO $$ 
DECLARE
    policy_record record;
BEGIN
    RAISE NOTICE 'Verifying created policies:';
    FOR policy_record IN (
        SELECT policyname, permissive, cmd, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    )
    LOOP
        RAISE NOTICE 'Policy: %, Type: %, Command: %, Using: %, With Check: %', 
            policy_record.policyname, 
            policy_record.permissive, 
            policy_record.cmd,
            policy_record.qual,
            policy_record.with_check;
    END LOOP;
END $$; 