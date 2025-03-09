"use client"

import { deleteDescription, getDescriptionUrl } from "@/app/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Database } from "@/types/supabase"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Trash2 } from "lucide-react"

type Description = Database["public"]["Tables"]["research_descriptions"]["Row"]

export function DescriptionList({ descriptions }: { descriptions: Description[] | null }) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDescription, setSelectedDescription] = useState<Description | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
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

  const handleDeleteClick = (description: Description) => {
    setSelectedDescription(description)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedDescription) return

    setError(null)
    setDeleteSuccess(null)
    setIsLoading(selectedDescription.id)

    try {
      const result = await deleteDescription(selectedDescription.id)
      if (result.error) {
        throw new Error(result.error)
      }
      
      setDeleteSuccess(`Successfully deleted "${selectedDescription.file_name}"`)
      setDeleteDialogOpen(false)
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
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {deleteSuccess && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{deleteSuccess}</AlertDescription>
        </Alert>
      )}
      
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(description.id)}
                disabled={isLoading === description.id}
              >
                {isLoading === description.id ? "Loading..." : "Download"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteClick(description)}
                disabled={isLoading === description.id}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                {isLoading === description.id ? "Loading..." : "Delete"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Research Description</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this research description? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDescription?.pinecone_ids && selectedDescription.pinecone_ids.length > 0 && (
            <div className="mt-2 text-amber-600">
              This will also delete {selectedDescription.pinecone_ids.length} associated vectors from Pinecone.
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isLoading === selectedDescription?.id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isLoading === selectedDescription?.id}
            >
              {isLoading === selectedDescription?.id ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 