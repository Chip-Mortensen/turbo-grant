import { Metadata } from 'next';
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { ApplicationFactorsChat } from '@/components/projects/application-factors/chat';
import { getResearchDescriptionText } from '@/lib/project-document-processing/query';

export const metadata: Metadata = {
  title: 'Application Factors | Turbo Grant',
  description: 'Identify factors to match your research with appropriate funding opportunities',
};

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ApplicationFactorsPage({ params }: PageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const { data: project } = await supabase
    .from("research_projects")
    .select("*, research_descriptions(*)")
    .eq("id", projectId)
    .single();

  if (!project) {
    return redirect("/projects");
  }

  // Get the research description text from both sources
  let extractedText = "";
  if (project.research_descriptions && project.research_descriptions.length > 0) {
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
  }

  // Combine both text sources, prioritizing vectorized text if available
  const researchDescription = vectorizedText || extractedText;

  return (
    <div className="container py-6 space-y-4">
      <BackButton href={`/projects/${projectId}`} />
      
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Application Factors</h1>
        <p className="text-sm text-muted-foreground">
          Identify key factors to match your research with appropriate funding opportunities
        </p>
      </div>
      
      <ApplicationFactorsChat 
        projectId={projectId} 
        researchDescription={researchDescription}
        applicationFactors={project.application_factors || {}}
      />
    </div>
  );
} 