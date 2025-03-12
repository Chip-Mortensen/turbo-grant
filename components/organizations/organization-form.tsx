"use client"

import { createOrganization } from "@/app/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useTransition, useState } from "react"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/utils/supabase/client"
import { organizationTypeLabels } from "@/types/enum-types"

export function OrganizationForm({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createOrganization(formData)
      
      if (result.success) {
        // Get the newly created organization
        const supabase = createClient();
        
        // Find the organization by name (which should be unique)
        const orgName = formData.get("name")?.toString();
        const { data: newOrg } = await supabase
          .from("organizations")
          .select("id")
          .eq("name", orgName)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (newOrg?.id) {
          // Set this organization as the user's selected organization
          const { error: updateError } = await supabase
            .from('users')
            .update({ institution_id: newOrg.id })
            .eq('id', userId);
          
          if (updateError) {
            setError(updateError.message);
            return;
          }
          
          // Redirect to projects
          router.push("/projects");
          router.refresh();
        } else {
          // Just refresh the page if we couldn't find the new organization
          router.refresh();
        }
      } else if (result.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Organization Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter organization name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="uei">Unique Entity Identifier (UEI)</Label>
        <Input
          id="uei"
          name="uei"
          placeholder="Enter UEI (12 characters)"
          maxLength={12}
        />
        <p className="text-sm text-muted-foreground">
          The 12-character alphanumeric identifier assigned by SAM.gov
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="sam_status" name="sam_status" />
        <Label htmlFor="sam_status">SAM.gov Registration Active</Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="era_commons_code">eRA Commons Code</Label>
          <Input
            id="era_commons_code"
            name="era_commons_code"
            placeholder="Enter eRA Commons code"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="nsf_id">NSF ID</Label>
          <Input
            id="nsf_id"
            name="nsf_id"
            placeholder="Enter NSF ID"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="organization_type">Organization Type</Label>
        <Select name="organization_type" required>
          <SelectTrigger>
            <SelectValue placeholder="Select organization type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(organizationTypeLabels).map(([type, label]) => (
              <SelectItem key={type} value={type}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}
      
      <button
        type="submit"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
        disabled={isPending}
      >
        {isPending ? "Creating..." : "Create Organization"}
      </button>
    </form>
  )
} 