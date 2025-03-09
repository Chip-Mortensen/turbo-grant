import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ProjectCard } from "@/components/projects/project-summary-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const { data: projects, error } = await supabase
    .from("research_projects")
    .select(`
      *,
      research_descriptions (
        id,
        file_path,
        pinecone_ids,
        file_name,
        file_type,
        uploaded_at,
        vectorization_status
      ),
      scientific_figures (
        id,
        image_path,
        pinecone_id,
        ai_description,
        caption,
        order_index,
        uploaded_at,
        vectorization_status
      ),
      chalk_talks (
        id,
        media_path,
        pinecone_ids,
        media_type,
        transcription,
        transcription_status,
        uploaded_at,
        vectorization_status
      ),
      completed_documents (
        id,
        file_url,
        content,
        file_type,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order("created_at", { ascending: false });

  console.log('Dashboard Query Results:', { projects, error, userId: user.id });

  if (error) {
    console.error('Error fetching projects:', error);
    return <div>Error loading projects. Please try again.</div>;
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6 px-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Your Research Projects</h1>
        
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            Create New Project
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        {projects?.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No projects yet. Create your first project to get started!
          </div>
        )}
      </div>
    </div>
  );
}
