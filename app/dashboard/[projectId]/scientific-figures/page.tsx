import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { UploadFigure } from "@/components/projects/scientific-figures/upload"
import { FigureList } from "@/components/projects/scientific-figures/list"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default async function ScientificFiguresPage({ params }: PageProps) {
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

  const { data: figures } = await supabase
    .from("scientific_figures")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true })

  return (
    <div className="flex-1 w-full flex flex-col gap-6 px-4 py-8">
      <Link href={`/dashboard/${projectId}`} passHref>
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Button>
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">Scientific Figures</h1>
        <p className="text-sm text-muted-foreground">
          Upload and manage your scientific figures
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Figure</CardTitle>
          <CardDescription>
            Upload an image file with an optional caption
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadFigure projectId={projectId} nextOrderIndex={figures?.length ?? 0} />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Uploaded Figures</h2>
          <p className="text-sm text-muted-foreground">
            Drag to reorder figures
          </p>
        </div>
        <FigureList figures={figures} />
      </div>
    </div>
  )
} 