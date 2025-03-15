import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { FundingOpportunityDetails } from '@/components/projects/funding-opportunities/funding-opportunity-details';

interface PageProps {
  params: { projectId: string; foaId: string };
}

export default async function Page({ params }: PageProps) {
  const projectId = params.projectId;
  const foaId = params.foaId;
  
  // Initialize Supabase client
  const supabase = await createClient();
  
  // Fetch FOA data
  const { data: foa, error } = await supabase
    .from('foas')
    .select('*')
    .eq('id', foaId)
    .single();
  
  if (error || !foa) {
    notFound();
  }
  
  // Fetch project data to check if this FOA is already selected
  const { data: project } = await supabase
    .from('research_projects')
    .select('foa')
    .eq('id', projectId)
    .single();
  
  const isSelected = project?.foa === foaId;

  return (
    <FundingOpportunityDetails
      foa={foa}
      projectId={projectId}
      isSelected={isSelected}
    />
  );
} 