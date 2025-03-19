import { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { BackButton } from '@/components/ui/back-button';
import { ApplicationRequirementsChat } from '@/components/projects/application-requirements/chat';
import { getResearchDescriptionText } from '@/lib/project-document-processing/query';
import { getNihGrantTypeCategory, type NihGrantType } from '@/types/enum-types';

export const metadata: Metadata = {
  title: 'Application Requirements',
  description: 'Review and complete application requirements for your grant proposal',
};

// Function to get the appropriate document filename based on grant type
function getDocumentFilenameByGrantType(grantType: string, grantAgency: string): string {
  // Default document for NSF grants
  if (grantAgency === 'NSF') {
    return 'nsf24_1.pdf';
  }
  
  // For NIH grants, determine the category and return the corresponding document
  if (grantAgency === 'NIH') {
    const category = getNihGrantTypeCategory(grantType as NihGrantType);
    
    switch (category) {
      case 'Research':
        return 'research-forms-i.pdf';
      case 'Career Development':
        return 'career-forms-i.pdf';
      case 'Training':
        return 'training-forms-i.pdf';
      case 'Fellowship':
        return 'fellowship-forms-i.pdf';
      case 'Multi-Project':
        return 'multi-project-forms-i.pdf';
      case 'SBIR/STTR':
        return 'sbir-sttr-forms-i.pdf';
      default:
        return 'nsf24_1.pdf'; // Fallback to general guide
    }
  }
  
  // Default fallback
  return 'nsf24_1.pdf';
}

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ApplicationRequirementsPage({ params }: PageProps) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return redirect('/sign-in');
    }

    // First, get just the basic project data to ensure it exists
    const { data: projectBasic } = await supabase
      .from('research_projects')
      .select("id, title")
      .eq('id', projectId)
      .single();

    if (!projectBasic) {
      return redirect('/projects');
    }

    // Then get the extended data with relations
    const { data: project } = await supabase
      .from('research_projects')
      .select("*, research_descriptions(*)")
      .eq('id', projectId)
      .single();

    // Get funding opportunities separately to avoid issues
    const { data: fundingOpportunities } = await supabase
      .from('funding_opportunities')
      .select("*")
      .eq('project_id', projectId);

    // Get the research description text from both sources
    let extractedText = "";
    if (project?.research_descriptions && project.research_descriptions.length > 0) {
      const { data: descriptionData } = await supabase
        .from("research_descriptions")
        .select("*")
        .eq("id", project.research_descriptions[0].id)
        .single();
      
      if (descriptionData) {
        extractedText = descriptionData.extracted_text || "";
      }
    }

    // Get vectorized research description text
    let vectorizedText = "";
    try {
      vectorizedText = await getResearchDescriptionText(projectId);
    } catch (error) {
      console.error("Error fetching vectorized research description:", error);
      // Continue with empty text instead of throwing
    }

    // Combine both text sources, prioritizing vectorized text if available
    const researchDescription = vectorizedText || extractedText || "";

    // Get the appropriate document filename based on the grant type
    let documentFilename = 'nsf24_1.pdf'; // Default
    
    if (fundingOpportunities && fundingOpportunities.length > 0) {
      const fundingOpportunity = fundingOpportunities[0];
      const grantType = fundingOpportunity.grant_type || '';
      const grantAgency = fundingOpportunity.agency || '';
      
      documentFilename = getDocumentFilenameByGrantType(grantType, grantAgency);
    }

    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <BackButton href={`/projects/${projectId}`} label="Back to Project" />
        </div>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Application Requirements</h1>
            <p className="text-muted-foreground">
              Review and complete the application requirements for your grant proposal
            </p>
          </div>
          <ApplicationRequirementsChat 
            projectId={projectId} 
            researchDescription={researchDescription}
            applicationRequirements={project?.application_requirements || {}}
            documentFilename={documentFilename}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in ApplicationRequirementsPage:", error);
    // Return a simple error UI instead of redirecting
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <BackButton href="/projects" label="Back to Projects" />
        </div>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Application Requirements</h1>
            <p className="text-muted-foreground">
              An error occurred while loading this page. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }
} 