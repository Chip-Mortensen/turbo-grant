import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ResearcherForm } from "@/components/projects/researcher-form"
import { ResearcherList } from "@/components/projects/researcher-list"

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function ResearcherProfilesPage({ params }: PageProps) {
  const { projectId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/sign-in")
  }

  const { data: project } = await supabase
    .from("research_projects")
    .select("*")
    .eq("id", projectId)
    .single()

  if (!project) {
    return redirect("/dashboard")
  }

  const { data: researchers } = await supabase
    .from("researcher_profiles")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  return (
    <div className="flex-1 w-full flex flex-col gap-6 px-4 py-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Researcher Profiles</h1>
          <p className="text-sm text-muted-foreground">
            Manage researcher and institution information
          </p>
        </div>
        <Link
          href={`/dashboard/${projectId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to Project
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Researcher</CardTitle>
          <CardDescription>
            Add a researcher profile to your project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResearcherForm projectId={projectId} />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Project Researchers</h2>
        <ResearcherList researchers={researchers} />
      </div>
    </div>
  )
} 