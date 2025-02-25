import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrganizationSelector } from "@/components/organizations/organization-selector";

// Maximum number of organizations to fetch initially
const MAX_INITIAL_ORGANIZATIONS = 50;

export default async function SelectOrganizationPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Check if user already has an organization
  const { data: profile } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', user.id)
    .single();

  if (profile?.institution_id) {
    return redirect("/dashboard");
  }

  // Fetch organizations for selection with a limit
  const { data: organizations, count } = await supabase
    .from("organizations")
    .select("*", { count: 'exact' })
    .order("name", { ascending: true })
    .limit(MAX_INITIAL_ORGANIZATIONS);

  const totalCount = count || 0;
  const hasMore = totalCount > MAX_INITIAL_ORGANIZATIONS;

  return (
    <div className="flex min-h-screen flex-col items-center pt-16 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Select Your Organization</CardTitle>
          <CardDescription>
            Before you continue, please select your organization or create a new one
          </CardDescription>
          {hasMore && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing {organizations?.length} of {totalCount} organizations. Use the search to find more.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <OrganizationSelector organizations={organizations || []} userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
} 