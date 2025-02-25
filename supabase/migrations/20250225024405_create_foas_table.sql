CREATE TABLE foas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency VARCHAR(10) NOT NULL CHECK (agency IN ('NIH', 'NSF')), -- Restrict to NIH or NSF
    title TEXT NOT NULL,
    foa_code VARCHAR(50) UNIQUE, -- Ex: PA-25-303 (NIH), NSF 25-535 (NSF)
    grant_type VARCHAR(50), -- Ex: R01, R21, K99, etc.
    description TEXT, -- Full description of the funding opportunity
    deadline TIMESTAMPTZ, -- Submission deadline
    num_awards INT CHECK (num_awards >= 0), -- Expected number of awards, must be non-negative
    award_ceiling NUMERIC, -- Maximum funding amount
    award_floor NUMERIC, -- Minimum funding amount
    letters_of_intent BOOLEAN DEFAULT FALSE, -- Whether LOI is required
    preliminary_proposal BOOLEAN DEFAULT FALSE, -- Whether pre-proposal is needed
    animal_trials BOOLEAN DEFAULT FALSE, -- Whether animal trials are involved
    human_trials BOOLEAN DEFAULT FALSE, -- Whether human trials are involved
    organization_eligibility JSONB, -- Maps to organizations.organization_type eligibility
    user_eligibility JSONB, -- Maps to users.role eligibility
    grant_url TEXT UNIQUE, -- Official FOA link
    published_date TIMESTAMPTZ, -- Date FOA was published
    submission_requirements JSONB, -- Open-ended field for required documents or formats
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.foas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Everyone can view funding opportunities" 
  ON public.foas
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create funding opportunities" 
  ON public.foas
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.foas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
