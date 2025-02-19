"use client"

import { deleteDescription, getDescriptionUrl } from "@/app/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Database } from "@/types/database"

type Description = Database["public"]["Tables"]["written_descriptions"]["Row"]

export function DescriptionList({ descriptions }: { descriptions: Description[] | null }) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDownload = async (id: string) => {
    setError(null)
    setIsLoading(id)

    try {
      const result = await getDescriptionUrl(id)
      if (result.error) {
        throw new Error(result.error)
      }

      // Open the URL in a new tab
      window.open(result.url, "_blank")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error downloading file")
    } finally {
      setIsLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this description?")) return

    setError(null)
    setIsLoading(id)

    try {
      const result = await deleteDescription(id)
      if (result.error) {
        throw new Error(result.error)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting file")
    } finally {
      setIsLoading(null)
    }
  }

  if (!descriptions || descriptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No descriptions uploaded yet.
      </p>
    )
  }

  return (
    <div className="grid gap-4">
      {error && <div className="text-sm text-red-500">{error}</div>}
      {descriptions.map((description) => (
        <Card key={description.id}>
          <CardHeader>
            <CardTitle>{description.file_name}</CardTitle>
            <CardDescription>
              Uploaded on {new Date(description.uploaded_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {description.file_type}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownload(description.id)}
                disabled={isLoading === description.id}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                {isLoading === description.id ? "Loading..." : "Download"}
              </button>
              <button
                onClick={() => handleDelete(description.id)}
                disabled={isLoading === description.id}
                className="text-sm text-red-500 hover:underline disabled:opacity-50"
              >
                {isLoading === description.id ? "Loading..." : "Delete"}
              </button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 