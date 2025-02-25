import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { Sparkles } from "lucide-react"

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function ProjectPage({ params }: PageProps) {
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

  return (
    <div className="flex-1 w-full flex flex-col gap-6 px-4 py-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <p className="text-sm text-muted-foreground">
            Created {formatDate(project.created_at)}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to Projects
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href={`/dashboard/${projectId}/description`}>
          <Card className="hover:bg-accent transition-colors">
            <CardHeader>
              <CardTitle>Research Description</CardTitle>
              <CardDescription>
                Upload and manage your research descriptions
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/dashboard/${projectId}/figures`}>
          <Card className="hover:bg-accent transition-colors">
            <CardHeader>
              <CardTitle>Scientific Figures</CardTitle>
              <CardDescription>
                Manage your scientific figures and captions
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/dashboard/${projectId}/chalk-talk`}>
          <Card className="hover:bg-accent transition-colors">
            <CardHeader>
              <CardTitle>Chalk Talk</CardTitle>
              <CardDescription>
                Upload and manage your chalk talk presentations
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/dashboard/${projectId}/researchers`}>
          <Card className="hover:bg-accent transition-colors">
            <CardHeader>
              <CardTitle>Researcher Profiles</CardTitle>
              <CardDescription>
                Manage researcher and institution information
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
} 