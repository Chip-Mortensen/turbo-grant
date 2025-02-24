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
    <div className="flex-1 w-full flex flex-col gap-6 px-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Organizations</h1>
        <Button asChild>
          <Link href="/dashboard/create/organization">
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Link>
        </Button>
      </div>

      {organizations && organizations.length > 0 ? (
        <div className="rounded-md border">
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
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No organizations found. Create your first organization to get started!
        </div>
      )}
    </div>
  );
} 