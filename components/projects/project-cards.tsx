'use client';

import { ProjectCard } from "@/components/ui/project-card";
import { FileText, Image, Video, DollarSign, Paperclip, Wrench, Link as LinkIcon, SendHorizontal, ClipboardList, FileCheck } from "lucide-react";
import { useProjectCompletion } from "@/hooks/use-project-completion";
import { cn } from "@/lib/utils";

interface ProjectCardsProps {
  projectId: string;
}

export function ProjectCards({ projectId }: ProjectCardsProps) {
  const { completionStatus, loadingStates, vectorizationStatus } = useProjectCompletion(projectId);
  const allRequiredComplete = completionStatus.description && 
    completionStatus.figures && 
    completionStatus.chalkTalk && completionStatus.applicationFactors;

  // Check if all vectorization is complete
  const allVectorizationComplete = vectorizationStatus.description && 
    vectorizationStatus.figures && 
    vectorizationStatus.chalkTalk;

  // Improved logic for showing cards after FOA selection
  // Show these cards if FOA is selected, regardless of loading state
  const showEquipmentCard = completionStatus.foa;
  const showSourcesCard = completionStatus.foa;
  const showAttachmentsCard = completionStatus.foa;
  const showApplicationRequirementsCard = completionStatus.foa;

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      <ProjectCard
        title="Research Description"
        description={completionStatus.description && !vectorizationStatus.description
          ? "Processing your research description..."
          : "Upload and manage your research description"}
        href={`/projects/${projectId}/research-description`}
        icon={FileText}
        isComplete={completionStatus.description}
        isLoading={completionStatus.description && !vectorizationStatus.description}
      />
      <ProjectCard
        title="Scientific Figures"
        description={completionStatus.figures && !vectorizationStatus.figures
          ? "Processing your scientific figures..."
          : "Upload and manage your scientific figures"}
        href={`/projects/${projectId}/scientific-figures`}
        icon={Image}
        isComplete={completionStatus.figures}
        isLoading={completionStatus.figures && !vectorizationStatus.figures}
      />
      <ProjectCard
        title="Chalk Talk"
        description={completionStatus.chalkTalk && !vectorizationStatus.chalkTalk
          ? "Processing your chalk talk..."
          : "Record and manage your chalk talk"}
        href={`/projects/${projectId}/chalk-talk`}
        icon={Video}
        isComplete={completionStatus.chalkTalk}
        isLoading={completionStatus.chalkTalk && !vectorizationStatus.chalkTalk}
      />
      {!loadingStates.applicationFactors && completionStatus.description && completionStatus.chalkTalk && (
        <ProjectCard
          title="Application Factors"
          description={allVectorizationComplete 
            ? "Identify factors for funding opportunities"
            : "Waiting for content processing to complete"}
          href={allVectorizationComplete ? `/projects/${projectId}/application-factors` : undefined}
          icon={ClipboardList}
          isComplete={completionStatus.applicationFactors}
          isLoading={loadingStates.applicationFactors}
          disabled={!allVectorizationComplete}
        />
      )}
      {!loadingStates.foa && allRequiredComplete && (
        <ProjectCard
          title="Funding Opportunity"
          description="Select and view funding opportunities"
          href={`/projects/${projectId}/funding-opportunities`}
          icon={DollarSign}
          isComplete={completionStatus.foa}
          isLoading={loadingStates.foa}
        />
      )}
      {showEquipmentCard && (
        <ProjectCard
          title="Equipment"
          description={completionStatus.equipment 
            ? "Manage equipment for your project" 
            : "Generating equipment recommendations..."}
          href={completionStatus.equipment ? `/projects/${projectId}/equipment` : undefined}
          icon={Wrench}
          isComplete={completionStatus.equipment}
          isLoading={!completionStatus.equipment}
          disabled={!completionStatus.equipment}
        />
      )}
      {showSourcesCard && (
        <ProjectCard
          title="Sources"
          description={completionStatus.sources 
            ? "Manage research sources and references" 
            : "Generating research sources..."}
          href={completionStatus.sources ? `/projects/${projectId}/sources` : undefined}
          icon={LinkIcon}
          isComplete={completionStatus.sources}
          isLoading={!completionStatus.sources}
          disabled={!completionStatus.sources}
        />
      )}
      {showAttachmentsCard && (
        <ProjectCard
          title="Attachments"
          description={completionStatus.attachments 
            ? "Manage documents for your proposal" 
            : "Preparing document templates..."}
          href={completionStatus.attachments ? `/projects/${projectId}/attachments` : undefined}
          icon={Paperclip}
          isComplete={completionStatus.attachments}
          isLoading={!completionStatus.attachments}
          disabled={!completionStatus.attachments}
        />
      )}
      {showApplicationRequirementsCard && (
        <ProjectCard
          title="Application Requirements"
          description="Identify requirements for your application"
          href={`/projects/${projectId}/application-requirements`}
          icon={FileCheck}
          isComplete={completionStatus.applicationRequirements}
          isLoading={loadingStates.applicationRequirements}
        />
      )}
    </div>
  );
} 