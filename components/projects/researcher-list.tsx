"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database } from "@/types/database"
import { deleteResearcher } from "@/app/actions"

type Researcher = Database["public"]["Tables"]["researcher_profiles"]["Row"]

export function ResearcherList({ researchers }: { researchers: Researcher[] | null }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this researcher profile?")) return

    setLoading(id)
    setError(null)
    try {
      const result = await deleteResearcher(id);

      if ('error' in result) {
        throw new Error(result.error);
      }

      router.refresh()
    } catch (err) {
      console.error("Error deleting researcher profile:", err)
      setError(err instanceof Error ? err.message : "Error deleting researcher profile")
    } finally {
      setLoading(null)
    }
  }

  if (!researchers || researchers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No researchers added yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-red-500">{error}</div>}
      
      {researchers.map((researcher) => (
        <Card key={researcher.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{researcher.name}</CardTitle>
                {researcher.title && (
                  <CardDescription>{researcher.title}</CardDescription>
                )}
              </div>
              <Button
                variant="destructive"
                onClick={() => handleDelete(researcher.id)}
                disabled={loading === researcher.id}
              >
                {loading === researcher.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {researcher.institution && (
              <div>
                <span className="font-medium">Institution:</span>{" "}
                {researcher.institution}
              </div>
            )}
            {researcher.bio && (
              <div>
                <span className="font-medium">Biography:</span>
                <p className="mt-1 text-muted-foreground">{researcher.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 