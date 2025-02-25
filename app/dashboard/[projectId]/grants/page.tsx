import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import UploadGrant from "@/components/projects/upload-grant"
import GrantTabs from "@/components/projects/grant-tabs"

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function GrantsPage({ params }: PageProps) {
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

  // Get all grant types
  const { data: grantTypes } = await supabase
    .from("grant_types")
    .select("*")
    .order("name", { ascending: true })

  return (
    <div className="flex-1 w-full flex flex-col gap-6 px-4 py-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Grant Applications</h1>
          <p className="text-sm text-muted-foreground">
            Manage your grant applications
          </p>
        </div>
        <Link
          href={`/dashboard/${projectId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to Project
        </Link>
      </div>

      <GrantTabs 
        projectId={projectId} 
        grantTypes={grantTypes || []} 
      />

      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Your Applications</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-4">
              Use the options above to add grant applications to your project.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 