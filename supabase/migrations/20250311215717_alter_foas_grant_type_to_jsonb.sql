ALTER TABLE foas
ALTER COLUMN grant_type TYPE JSONB USING grant_type::jsonb;
