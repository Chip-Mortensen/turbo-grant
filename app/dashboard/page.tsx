import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ProjectCard } from "@/components/projects/project-card";
import Link from "next/link";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const { data: projects } = await supabase
    .from("research_projects")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex-1 w-full flex flex-col gap-6 px-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Your Research Projects</h1>
        <Link
          href="/dashboard/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
        >
          New Project
        </Link>
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
