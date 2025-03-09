'use client';

import { Database, Json } from "@/types/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { DeleteProjectDialog } from "./delete-project-dialog"
import { useRouter } from "next/navigation"

type Project = Database["public"]["Tables"]["research_projects"]["Row"] & {
  research_descriptions?: Array<{
    id: string;
    file_path?: string | null;
    pinecone_ids?: string[] | null;
    title?: string | null;
  }>;
  scientific_figures?: Array<{
    id: string;
    image_path?: string | null;
    pinecone_id?: string | null;
    title?: string | null;
  }>;
  chalk_talks?: Array<{
    id: string;
    media_path?: string | null;
    pinecone_ids?: string[] | null;
    title?: string | null;
  }>;
  completed_documents?: Array<{
    id: string;
    file_url?: string | null;
    title?: string | null;
  }>;
  attachments: Json;
};

export function ProjectCard({ project }: { project: Project }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const router = useRouter()

  const handleDelete = () => {
    router.refresh()
  }

  return (
    <Card className="group relative">
      <Link href={`/projects/${project.id}`}>
        <CardHeader>
          <CardTitle>{project.title}</CardTitle>
          <CardDescription>
            Created {formatDate(project.created_at)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {/* Add status indicators or progress here */}
          </div>
        </CardContent>
      </Link>

      {/* Delete button */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.preventDefault() // Prevent navigation
            setShowDeleteDialog(true)
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Delete dialog */}
      <DeleteProjectDialog
        project={project}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onDeleted={handleDelete}
      />
    </Card>
  )
} 