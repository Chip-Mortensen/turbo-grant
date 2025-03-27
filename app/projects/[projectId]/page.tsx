import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { FileText, Image, Video, DollarSign, ArrowLeft } from "lucide-react";
import { ProjectCards } from "@/components/projects/project-cards";
import { ProjectInitializer } from "@/components/projects/project-initializer";
import { ReconcileAttachments } from "@/components/projects/attachments/reconcile-attachments";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button"

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
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
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) {
    return redirect("/projects");
  }

  return (
    <div className="container py-6 space-y-4">
      <BackButton href="/projects" label="Back to Projects" />
      
      <ProjectInitializer projectId={projectId} hasFoa={!!project.foa} />
      
      {project.foa && <ReconcileAttachments projectId={projectId} />}

      <div>
        <h1 className="text-2xl font-semibold">{project.title}</h1>
        <p className="text-sm text-muted-foreground">
          Created {formatDate(project.created_at)}
        </p>
      </div>

      <ProjectCards projectId={projectId} />
    </div>
  );
} 