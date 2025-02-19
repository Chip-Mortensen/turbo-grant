"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Database } from "@/types/database"

type GrantType = Database["public"]["Tables"]["grant_types"]["Row"]

export function GrantSelector({ 
  projectId, 
  grantTypes 
}: { 
  projectId: string
  grantTypes: GrantType[] | null
}) {
  const [selectedGrantType, setSelectedGrantType] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleStartApplication = async () => {
    if (!selectedGrantType) {
      setError("Please select a grant type")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error: dbError } = await supabase
        .from("project_grants")
        .insert([
          {
            project_id: projectId,
            grant_type_id: selectedGrantType,
            status: "draft",
          },
        ])

      if (dbError) throw dbError

      router.refresh()
      setSelectedGrantType("")
    } catch (err) {
      console.error("Error creating grant application:", err)
      setError(err instanceof Error ? err.message : "Error creating grant application")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!grantTypes || grantTypes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No grant types available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="grant-type">Grant Type</Label>
        <Select
          value={selectedGrantType}
          onValueChange={setSelectedGrantType}
        >
          <SelectTrigger id="grant-type">
            <SelectValue placeholder="Select a grant type" />
          </SelectTrigger>
          <SelectContent>
            {grantTypes.map((grantType) => (
              <SelectItem key={grantType.id} value={grantType.id}>
                {grantType.name} - {grantType.organization}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGrantType && (
        <div className="text-sm text-muted-foreground">
          {grantTypes.find(g => g.id === selectedGrantType)?.description}
        </div>
      )}

      {error && <div className="text-sm text-red-500">{error}</div>}
      
      <button
        onClick={handleStartApplication}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md disabled:opacity-50"
        disabled={isSubmitting || !selectedGrantType}
      >
        {isSubmitting ? "Starting..." : "Start Application"}
      </button>
    </div>
  )
} 