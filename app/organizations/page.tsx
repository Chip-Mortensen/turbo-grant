import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";

export default async function OrganizationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const { data: organizations } = await supabase
    .from("organizations")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div className="container py-6 space-y-4">
      <BackButton href="/projects" label="Back to Projects" />
      
      <div className="flex items-center justify-between py-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Organizations</h1>
          <p className="text-sm text-muted-foreground">
            Manage your organizations and their settings
          </p>
        </div>
        <Button asChild>
          <Link href="/organizations/new">
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {organizations && organizations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>UEI</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>SAM Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>{org.uei}</TableCell>
                    <TableCell>{org.organization_type || "—"}</TableCell>
                    <TableCell>{org.sam_status ? "Active" : "Inactive"}</TableCell>
                    <TableCell>{formatDate(org.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No organizations found. Create your first organization to get started!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 