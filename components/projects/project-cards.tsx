'use client';

import { ProjectCard } from "@/components/ui/project-card";
import { FileText, Image, Video, DollarSign, Paperclip, Wrench, Link as LinkIcon, SendHorizontal } from "lucide-react";
import { useProjectCompletion } from "@/hooks/use-project-completion";
import { cn } from "@/lib/utils";

interface ProjectCardsProps {
  projectId: string;
}

export function ProjectCards({ projectId }: ProjectCardsProps) {
  const { completionStatus, loadingStates } = useProjectCompletion(projectId);
  const allRequiredComplete = completionStatus.description && 
    completionStatus.figures && 
    completionStatus.chalkTalk;

  // Show equipment and sources cards if FOA is selected or if they're loading
  const showEquipmentCard = completionStatus.foa || loadingStates.equipment;
  const showSourcesCard = completionStatus.foa || loadingStates.sources;
  const showAttachmentsCard = completionStatus.foa || loadingStates.attachments;

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      <ProjectCard
        title="Research Description"
        description="Upload and manage your research description"
        href={`/projects/${projectId}/research-description`}
        icon={FileText}
        isComplete={completionStatus.description}
        isLoading={loadingStates.description}
      />
      <ProjectCard
        title="Scientific Figures"
        description="Upload and manage your scientific figures"
        href={`/projects/${projectId}/scientific-figures`}
        icon={Image}
        isComplete={completionStatus.figures}
        isLoading={loadingStates.figures}
      />
      <ProjectCard
        title="Chalk Talk"
        description="Record and manage your chalk talk"
        href={`/projects/${projectId}/chalk-talk`}
        icon={Video}
        isComplete={completionStatus.chalkTalk}
        isLoading={loadingStates.chalkTalk}
      />
      {allRequiredComplete && (
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
          description="Manage equipment for your project"
          href={`/projects/${projectId}/equipment`}
          icon={Wrench}
          isComplete={completionStatus.equipment}
          isLoading={loadingStates.equipment}
        />
      )}
      {showSourcesCard && (
        <ProjectCard
          title="Sources"
          description="Manage research sources and references"
          href={`/projects/${projectId}/sources`}
          icon={LinkIcon}
          isComplete={completionStatus.sources}
          isLoading={loadingStates.sources}
        />
      )}
      {showAttachmentsCard && (
        <ProjectCard
          title="Attachments"
          description="Manage documents for your proposal"
          href={`/projects/${projectId}/attachments`}
          icon={Paperclip}
          isComplete={completionStatus.attachments}
          isLoading={loadingStates.attachments}
        />
      )}
    </div>
  );
} 