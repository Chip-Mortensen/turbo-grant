"use client"

import { deleteFigure, getFigureUrl, updateFigureOrder } from "@/app/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Database } from "@/types/supabase"
import { DragDropContext, Draggable, Droppable, DropResult, DroppableProvided, DraggableProvided } from "@hello-pangea/dnd"
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
import { AlertCircle, Trash2, Eye, GripVertical } from "lucide-react"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"

type Figure = Database["public"]["Tables"]["scientific_figures"]["Row"]

export function FigureList({ figures }: { figures: Figure[] | null }) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
  const [figureUrls, setFigureUrls] = useState<Record<string, string>>({})
  const router = useRouter()

  // Load preview images for all figures
  useEffect(() => {
    if (!figures || figures.length === 0) return;

    const loadFigureUrls = async () => {
      const supabase = createClient();
      const urls: Record<string, string> = {};

      for (const figure of figures) {
        try {
          const { data } = await supabase.storage
            .from("scientific-figures")
            .createSignedUrl(figure.image_path, 3600); // URL valid for 1 hour
          
          if (data?.signedUrl) {
            urls[figure.id] = data.signedUrl;
          }
        } catch (error) {
          console.error(`Error loading preview for figure ${figure.id}:`, error);
        }
      }

      setFigureUrls(urls);
    };

    loadFigureUrls();
  }, [figures]);

  const handleView = async (id: string) => {
    setError(null)
    setIsLoading(id)

    try {
      const result = await getFigureUrl(id)
      if (result.error) {
        throw new Error(result.error)
      }

      // Open the URL in a new tab
      window.open(result.url, "_blank")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error viewing figure")
    } finally {
      setIsLoading(null)
    }
  }

  const handleDeleteClick = (figure: Figure) => {
    setSelectedFigure(figure)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedFigure) return

    setError(null)
    setDeleteSuccess(null)
    setIsLoading(selectedFigure.id)

    try {
      const result = await deleteFigure(selectedFigure.id)
      if (result.error) {
        throw new Error(result.error)
      }
      
      setDeleteSuccess(`Successfully deleted figure`)
      setDeleteDialogOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting figure")
    } finally {
      setIsLoading(null)
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !figures) return

    const items = Array.from(figures)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update order_index for all affected items
    const updates = items.map((item, index) => ({
      id: item.id,
      order_index: index,
    }))

    try {
      const result = await updateFigureOrder(updates)
      if (result.error) {
        throw new Error(result.error)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating order")
    }
  }

  if (!figures || figures.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No figures uploaded yet.
      </p>
    )
  }

  // Extract filename from path
  const getFileName = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  return (
    <div className="space-y-4">
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

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="figures">
          {(provided: DroppableProvided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {figures.map((figure, index) => (
                <Draggable
                  key={figure.id}
                  draggableId={figure.id}
                  index={index}
                >
                  {(provided: DraggableProvided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="group"
                    >
                      <Card className="overflow-hidden">
                        <div className="flex items-center">
                          <div 
                            {...provided.dragHandleProps}
                            className="p-4 cursor-grab hover:bg-gray-100 transition-colors"
                          >
                            <GripVertical className="h-5 w-5 text-gray-400" />
                          </div>
                          
                          <div className="flex-1">
                            <CardHeader className="py-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-base">Figure {index + 1}</CardTitle>
                                  <CardDescription className="text-xs">
                                    {getFileName(figure.image_path)}
                                  </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleView(figure.id)}
                                    disabled={isLoading === figure.id}
                                    className="flex items-center gap-1"
                                  >
                                    <Eye className="h-4 w-4" />
                                    {isLoading === figure.id ? "Loading..." : "View"}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteClick(figure)}
                                    disabled={isLoading === figure.id}
                                    className="flex items-center gap-1"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    {isLoading === figure.id ? "Loading..." : "Delete"}
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            
                            <CardContent className="pt-0 pb-3">
                              <div className="flex gap-4 items-start">
                                {figureUrls[figure.id] && (
                                  <div className="relative h-24 w-24 rounded-md overflow-hidden border bg-gray-50">
                                    <img
                                      src={figureUrls[figure.id]}
                                      alt={`Figure ${index + 1}`}
                                      className="object-contain w-full h-full"
                                    />
                                  </div>
                                )}
                                <div className="flex-1">
                                  {figure.caption && (
                                    <p className="text-sm text-gray-600">{figure.caption}</p>
                                  )}
                                  {figure.ai_description && (
                                    <div className="mt-2">
                                      <p className="text-xs text-gray-500 font-medium">AI Description:</p>
                                      <div className="text-xs text-gray-500 mt-1 whitespace-pre-line">
                                        {figure.ai_description.length > 150 
                                          ? `${figure.ai_description.substring(0, 150)}...` 
                                          : figure.ai_description}
                                        {figure.ai_description.length > 150 && (
                                          <button 
                                            onClick={() => handleView(figure.id)}
                                            className="text-primary hover:underline ml-1"
                                          >
                                            View full description
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Scientific Figure</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this figure? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedFigure?.pinecone_id && (
            <div className="mt-2 text-amber-600">
              This will also delete the associated vector from Pinecone.
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isLoading === selectedFigure?.id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isLoading === selectedFigure?.id}
            >
              {isLoading === selectedFigure?.id ? (
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