"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database } from "@/types/database"
import { Badge } from "@/components/ui/badge"

type GrantWithType = Database["public"]["Tables"]["project_grants"]["Row"] & {
  grant_type: Database["public"]["Tables"]["grant_types"]["Row"]
}

export function GrantList({ grants }: { grants: GrantWithType[] | null }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this grant application?")) return

    setLoading(id)
    setError(null)
    try {
      const supabase = createClient()

      const { error: dbError } = await supabase
        .from("project_grants")
        .delete()
        .eq("id", id)

      if (dbError) throw dbError

      router.refresh()
    } catch (err) {
      console.error("Error deleting grant application:", err)
      setError(err instanceof Error ? err.message : "Error deleting grant application")
    } finally {
      setLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
      case "in_progress":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
      case "completed":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
    }
  }

  if (!grants || grants.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No grant applications yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-red-500">{error}</div>}
      
      {grants.map((grant) => (
        <Card key={grant.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{grant.grant_type.name}</CardTitle>
                <CardDescription>
                  {grant.grant_type.organization}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(grant.status)}>
                {grant.status.replace("_", " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Started on {new Date(grant.created_at).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/${grant.project_id}/grants/${grant.id}`)}
                  disabled={loading === grant.id}
                >
                  View
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(grant.id)}
                  disabled={loading === grant.id}
                >
                  {loading === grant.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 