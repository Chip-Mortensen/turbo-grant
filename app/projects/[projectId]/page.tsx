import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { FileText, Image, Video, DollarSign, ArrowLeft } from "lucide-react";
import { ProjectCards } from "@/components/projects/project-cards";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/navigation/back-button"

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
    <div className="flex-1 w-full flex flex-col gap-6 px-4 py-8">
      <BackButton href="/projects" label="Back to Projects" />

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