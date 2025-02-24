-- Create organization_type enum
CREATE TYPE public.organization_type AS ENUM (
  'Higher Education',
  'Non-Profit',
  'For-Profit',
  'Government',
  'Hospital',
  'Foreign',
  'Individual'
);

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  uei VARCHAR(12) NOT NULL,
  sam_status BOOLEAN NOT NULL,
  era_commons_code VARCHAR(100),
  nsf_id VARCHAR(100),
  organization_type organization_type,
  metadata JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for created_by after users table is updated
-- This will be added in the update_users_table migration

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view organizations"
  ON public.organizations
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update organizations they created"
  ON public.organizations
  FOR UPDATE
  USING (auth.uid()::text = created_by::text);

-- Create updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
