import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NewOrganizationForm } from "@/components/organizations/new-organization-form"

export default async function NewOrganization() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/sign-in")
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center gap-6 px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create New Organization</CardTitle>
          <CardDescription>
            Register a new organization for grant applications and research projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewOrganizationForm />
        </CardContent>
      </Card>
    </div>
  )
} 