-- Make UEI field optional in organizations table
ALTER TABLE public.organizations ALTER COLUMN uei DROP NOT NULL;
