import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { UploadChalkTalk } from "@/components/projects/upload-chalk-talk"
import { ChalkTalkList } from "@/components/projects/chalk-talk-list"

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function ChalkTalkPage({ params }: PageProps) {
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

  const { data: chalkTalks } = await supabase
    .from("chalk_talks")
    .select("*")
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false })

  return (
    <div className="flex-1 w-full flex flex-col gap-6 px-4 py-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Chalk Talk</h1>
          <p className="text-sm text-muted-foreground">
            Upload and manage your chalk talk presentations
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
          <CardTitle>Upload Chalk Talk</CardTitle>
          <CardDescription>
            Upload a video or audio recording of your chalk talk presentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadChalkTalk projectId={projectId} existingChalkTalks={chalkTalks} />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Uploaded Presentations</h2>
        <ChalkTalkList chalkTalks={chalkTalks} />
      </div>
    </div>
  )
} 