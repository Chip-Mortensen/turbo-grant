"use client"

import { deleteFigure, getFigureUrl, updateFigureOrder } from "@/app/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Database } from "@/types/supabase"
import { DragDropContext, Draggable, Droppable, DropResult, DroppableProvided, DraggableProvided } from "@hello-pangea/dnd"

type Figure = Database["public"]["Tables"]["scientific_figures"]["Row"]

export function FigureList({ figures }: { figures: Figure[] | null }) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this figure?")) return

    setError(null)
    setIsLoading(id)

    try {
      const result = await deleteFigure(id)
      if (result.error) {
        throw new Error(result.error)
      }
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

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-red-500">{error}</div>}
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
                      {...provided.dragHandleProps}
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle>Figure {index + 1}</CardTitle>
                          {figure.caption && (
                            <CardDescription>{figure.caption}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="flex justify-between items-center">
                          <div className="text-sm text-muted-foreground">
                            Drag to reorder
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleView(figure.id)}
                              disabled={isLoading === figure.id}
                              className="text-sm text-primary hover:underline disabled:opacity-50"
                            >
                              {isLoading === figure.id ? "Loading..." : "View"}
                            </button>
                            <button
                              onClick={() => handleDelete(figure.id)}
                              disabled={isLoading === figure.id}
                              className="text-sm text-red-500 hover:underline disabled:opacity-50"
                            >
                              {isLoading === figure.id ? "Loading..." : "Delete"}
                            </button>
                          </div>
                        </CardContent>
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
    </div>
  )
} 