-- Enable RLS on foas table
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

-- Add update policy for authenticated users
CREATE POLICY "Authenticated users can update funding opportunities" 
  ON public.foas
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add delete policy for authenticated users
CREATE POLICY "Authenticated users can delete funding opportunities" 
  ON public.foas
  FOR DELETE
  USING (auth.uid() IS NOT NULL); 