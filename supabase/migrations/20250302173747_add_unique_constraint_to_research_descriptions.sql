-- First, create a function to clean up duplicate research descriptions
-- This function will keep only the most recent description for each project
CREATE OR REPLACE FUNCTION cleanup_duplicate_research_descriptions()
RETURNS void AS $$
DECLARE
    project_id_var UUID;
    description_ids TEXT[];
    description_id_to_keep TEXT;
BEGIN
    -- Get all project_ids that have multiple descriptions
    FOR project_id_var IN 
        SELECT DISTINCT project_id 
        FROM research_descriptions 
        WHERE project_id IS NOT NULL
        GROUP BY project_id 
        HAVING COUNT(*) > 1
    LOOP
        -- Get all description IDs for this project, ordered by uploaded_at desc
        SELECT array_agg(id ORDER BY uploaded_at DESC) 
        INTO description_ids 
        FROM research_descriptions 
        WHERE project_id = project_id_var;
        
        -- Keep the most recent one
        description_id_to_keep := description_ids[1];
        
        -- Log what we're doing
        RAISE NOTICE 'Project % has % descriptions. Keeping % and deleting the rest.', 
            project_id_var, array_length(description_ids, 1), description_id_to_keep;
        
        -- Delete all but the most recent description
        DELETE FROM research_descriptions 
        WHERE project_id = project_id_var 
        AND id != description_id_to_keep;
    END LOOP;
    
    RAISE NOTICE 'Cleanup complete.';
END;
$$ LANGUAGE plpgsql;

-- Run the cleanup function
SELECT cleanup_duplicate_research_descriptions();

-- Drop the function after use
DROP FUNCTION cleanup_duplicate_research_descriptions();

-- Now add the unique constraint
ALTER TABLE research_descriptions
ADD CONSTRAINT research_descriptions_project_id_unique UNIQUE (project_id);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT research_descriptions_project_id_unique ON research_descriptions 
IS 'Ensures each project can have at most one research description';
