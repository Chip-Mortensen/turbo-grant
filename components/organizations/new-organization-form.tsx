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

export function NewOrganizationForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createOrganization(formData)
      
      if (result.success) {
        router.push("/dashboard")
        router.refresh()
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
          required
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
        <Select name="organization_type">
          <SelectTrigger>
            <SelectValue placeholder="Select organization type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Higher Education">Higher Education</SelectItem>
            <SelectItem value="Non-Profit">Non-Profit</SelectItem>
            <SelectItem value="For-Profit">For-Profit</SelectItem>
            <SelectItem value="Government">Government</SelectItem>
            <SelectItem value="Hospital">Hospital</SelectItem>
            <SelectItem value="Foreign">Foreign</SelectItem>
            <SelectItem value="Individual">Individual</SelectItem>
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