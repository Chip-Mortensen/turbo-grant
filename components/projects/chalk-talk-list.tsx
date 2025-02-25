"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { Database } from "@/types/supabase"

type ChalkTalk = Database['public']['Tables']['chalk_talks']['Row'];

export function ChalkTalkList({ chalkTalks }: { chalkTalks: ChalkTalk[] | null }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleView = async (id: string) => {
    setLoading(id)
    setError(null)
    try {
      const supabase = createClient()
      const { data: chalkTalk } = await supabase
        .from("chalk_talks")
        .select("media_path")
        .eq("id", id)
        .single()

      if (!chalkTalk) throw new Error("Chalk talk not found")

      const { data, error: urlError } = await supabase.storage
        .from("chalk_talks")
        .createSignedUrl(chalkTalk.media_path, 60)

      if (urlError) throw urlError
      if (!data?.signedUrl) throw new Error("Failed to generate signed URL")

      window.open(data.signedUrl, "_blank")
    } catch (err) {
      console.error("Error viewing chalk talk:", err)
      setError(err instanceof Error ? err.message : "Error viewing chalk talk")
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chalk talk?")) return

    setLoading(id)
    setError(null)
    try {
      const supabase = createClient()
      const { data: chalkTalk } = await supabase
        .from("chalk_talks")
        .select("media_path")
        .eq("id", id)
        .single()

      if (!chalkTalk) throw new Error("Chalk talk not found")

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from("chalk_talks")
        .remove([chalkTalk.media_path])

      if (storageError) throw storageError

      // Delete database record
      const { error: dbError } = await supabase
        .from("chalk_talks")
        .delete()
        .eq("id", id)

      if (dbError) throw dbError

      router.refresh()
    } catch (err) {
      console.error("Error deleting chalk talk:", err)
      setError(err instanceof Error ? err.message : "Error deleting chalk talk")
    } finally {
      setLoading(null)
    }
  }

  if (!chalkTalks || chalkTalks.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No chalk talks uploaded yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-red-500">{error}</div>}
      
      {chalkTalks.map((chalkTalk) => (
        <Card key={chalkTalk.id}>
          <CardHeader>
            <CardTitle>
              {chalkTalk.media_type === "video" ? "Video" : "Audio"} Recording
            </CardTitle>
            <CardDescription>
              Uploaded {formatDistanceToNow(new Date(chalkTalk.uploaded_at))} ago
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => handleView(chalkTalk.id)}
                disabled={loading === chalkTalk.id}
              >
                {loading === chalkTalk.id ? "Loading..." : "View"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(chalkTalk.id)}
                disabled={loading === chalkTalk.id}
              >
                {loading === chalkTalk.id ? "Loading..." : "Delete"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 