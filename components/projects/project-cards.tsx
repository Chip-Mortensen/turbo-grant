'use client';

import { ProjectCard } from "@/components/ui/project-card";
import { FileText, Image, Video, DollarSign, Paperclip, Wrench, Link as LinkIcon, SendHorizontal } from "lucide-react";
import { useProjectCompletion } from "@/hooks/use-project-completion";
import { cn } from "@/lib/utils";

interface ProjectCardsProps {
  projectId: string;
}

export function ProjectCards({ projectId }: ProjectCardsProps) {
  const completionStatus = useProjectCompletion(projectId);
  const allRequiredComplete = completionStatus.description && 
    completionStatus.figures && 
    completionStatus.chalkTalk;

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      <ProjectCard
        title="Research Description"
        description="Upload and manage your research description"
        href={`/projects/${projectId}/research-description`}
        icon={FileText}
        isComplete={completionStatus.description}
      />
      <ProjectCard
        title="Scientific Figures"
        description="Upload and manage your scientific figures"
        href={`/projects/${projectId}/scientific-figures`}
        icon={Image}
        isComplete={completionStatus.figures}
      />
      <ProjectCard
        title="Chalk Talk"
        description="Record and manage your chalk talk"
        href={`/projects/${projectId}/chalk-talk`}
        icon={Video}
        isComplete={completionStatus.chalkTalk}
      />
      {allRequiredComplete && (
        <ProjectCard
          title="Funding Opportunity"
          description="Select and view funding opportunities"
          href={`/projects/${projectId}/funding-opportunities`}
          icon={DollarSign}
          isComplete={completionStatus.foa}
        />
      )}
      {completionStatus.foa && (
        <ProjectCard
          title="Equipment"
          description="Manage equipment for your project"
          href={`/projects/${projectId}/equipment`}
          icon={Wrench}
          isComplete={completionStatus.equipment}
        />
      )}
      {completionStatus.foa && (
        <ProjectCard
          title="Sources"
          description="Manage research sources and references"
          href={`/projects/${projectId}/sources`}
          icon={LinkIcon}
          isComplete={false}
        />
      )}
      {completionStatus.foa && (
        <ProjectCard
          title="Attachments"
          description="Manage documents for your proposal"
          href={`/projects/${projectId}/attachments`}
          icon={Paperclip}
          isComplete={completionStatus.attachments}
        />
      )}
      {completionStatus.foa && (
        <ProjectCard
          title="Application Submission"
          description="Instructions for submitting your application"
          href={`/projects/${projectId}/submission-details`}
          icon={SendHorizontal}
          isComplete={false}
        />
      )}
    </div>
  );
} 