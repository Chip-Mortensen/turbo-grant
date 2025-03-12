import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import OpportunityTabs from "@/components/funding-opportunities/opportunity-tabs"
import { BackButton } from "@/components/ui/back-button"
import { ArrowLeft } from "lucide-react"

export default async function FundingOpportunitiesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/sign-in")
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6 px-4 py-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Funding Opportunities</h1>
          <p className="text-sm text-muted-foreground">
            Manage your funding opportunities
          </p>
        </div>
        <BackButton 
          href="/projects"
          label="Back to Dashboard"
          variant="link"
          className="text-sm text-muted-foreground hover:text-foreground p-0 h-auto"
        />
      </div>

      <OpportunityTabs 
        projectId="" 
      />
    </div>
  )
} 