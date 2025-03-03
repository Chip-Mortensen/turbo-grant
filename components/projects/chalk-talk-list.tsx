"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { Database } from "@/types/supabase"
import { deleteChalkTalk } from "@/app/actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Trash2 } from "lucide-react"

type ChalkTalk = Database['public']['Tables']['chalk_talks']['Row'];

export function ChalkTalkList({ chalkTalks }: { chalkTalks: ChalkTalk[] | null }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedChalkTalk, setSelectedChalkTalk] = useState<ChalkTalk | null>(null)
  const router = useRouter()

  const handleDeleteClick = (chalkTalk: ChalkTalk) => {
    setSelectedChalkTalk(chalkTalk)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedChalkTalk) return
    
    setLoading(selectedChalkTalk.id)
    setError(null)
    setDeleteSuccess(null)
    setDeleteDialogOpen(false)
    
    try {
      const result = await deleteChalkTalk(selectedChalkTalk.id)
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      setDeleteSuccess(`Successfully deleted chalk talk`)
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
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {deleteSuccess && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <AlertDescription className="text-green-800">{deleteSuccess}</AlertDescription>
        </Alert>
      )}
      
      {chalkTalks.map((chalkTalk) => (
        <Card key={chalkTalk.id}>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">
                    {chalkTalk.media_path ? chalkTalk.media_path.split('/').pop() : 'Chalk Talk Recording'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Uploaded {formatDistanceToNow(new Date(chalkTalk.uploaded_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(chalkTalk)}
                    disabled={loading === chalkTalk.id}
                  >
                    {loading === chalkTalk.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <AudioPlayer chalkTalkId={chalkTalk.id} />
            </div>
          </CardContent>
        </Card>
      ))}
      
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chalk Talk</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chalk talk? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedChalkTalk && selectedChalkTalk.pinecone_id && (
            <div className="text-sm text-muted-foreground">
              This will also delete the associated vector from Pinecone.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AudioPlayer({ chalkTalkId }: { chalkTalkId: string }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAudioUrl = async () => {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data: chalkTalk } = await supabase
          .from("chalk_talks")
          .select("media_path")
          .eq("id", chalkTalkId)
          .single()

        if (!chalkTalk) throw new Error("Chalk talk not found")

        const { data, error: urlError } = await supabase.storage
          .from("chalk-talks")
          .createSignedUrl(chalkTalk.media_path, 3600)

        if (urlError) throw urlError
        if (!data?.signedUrl) throw new Error("Failed to generate signed URL")

        setAudioUrl(data.signedUrl)
      } catch (err) {
        console.error("Error loading audio:", err)
        setError(err instanceof Error ? err.message : "Error loading audio")
      } finally {
        setLoading(false)
      }
    }

    loadAudioUrl()
  }, [chalkTalkId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-12 bg-muted/20 rounded">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm">Loading audio...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
        Failed to load audio: {error}
      </div>
    )
  }

  if (!audioUrl) {
    return null
  }

  return (
    <audio controls className="w-full">
      <source src={audioUrl} type="audio/mpeg" />
      Your browser does not support the audio element.
    </audio>
  )
} 