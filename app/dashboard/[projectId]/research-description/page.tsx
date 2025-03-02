import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { UploadDescription } from "@/components/projects/upload-description"
import { DescriptionList } from "@/components/projects/description-list"
import { Info } from "lucide-react"

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
    .from("research_descriptions")
    .select("*")
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false })

  return (
    <div className="flex-1 w-full flex flex-col gap-6 px-4 py-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Research Description</h1>
          <p className="text-sm text-muted-foreground">
            Upload and manage your research description
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
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Upload Description</CardTitle>
              <CardDescription>
                Upload a document describing your research project
              </CardDescription>
            </div>
            <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
              <Info className="h-3 w-3 mr-1" />
              Only one description allowed per project
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UploadDescription projectId={projectId} />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Current Description</h2>
        <DescriptionList descriptions={descriptions} />
      </div>
    </div>
  )
} 