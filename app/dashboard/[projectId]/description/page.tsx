import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { UploadDescription } from "@/components/projects/upload-description"
import { DescriptionList } from "@/components/projects/description-list"

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function ResearchDescriptionPage({ params }: PageProps) {
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

  const { data: descriptions } = await supabase
    .from("written_descriptions")
    .select("*")
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false })

  return (
    <div className="flex-1 w-full flex flex-col gap-6 px-4 py-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Research Description</h1>
          <p className="text-sm text-muted-foreground">
            Upload and manage your research descriptions
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
          <CardTitle>Upload Description</CardTitle>
          <CardDescription>
            Upload a document describing your research project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadDescription projectId={projectId} />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Uploaded Descriptions</h2>
        <DescriptionList descriptions={descriptions} />
      </div>
    </div>
  )
} 