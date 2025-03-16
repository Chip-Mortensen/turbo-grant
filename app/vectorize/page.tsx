import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { BackButton } from "@/components/ui/back-button"
import VectorizeTabs from "@/components/vectorize/vectorize-tabs"

export default async function VectorizePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/sign-in")
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6 px-4 py-8">
      <BackButton href="/projects" label="Back to Projects" />
      
      <div>
        <h1 className="text-2xl font-semibold">Vectorize Documents</h1>
        <p className="text-sm text-muted-foreground">
          Upload and vectorize documents for semantic search
        </p>
      </div>

      <VectorizeTabs />
    </div>
  )
} 