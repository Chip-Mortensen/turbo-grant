'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { deleteProject } from '@/app/actions';
import { Database, Json } from "@/types/supabase";

interface ProjectAttachment {
  file_path: string;
}

interface ResearchDescription {
  id: string;
  file_path: string;
  pinecone_ids?: string[];
}

interface ScientificFigure {
  id: string;
  image_path: string;
  pinecone_id?: string;
}

interface ChalkTalk {
  id: string;
  media_path: string;
  pinecone_ids?: string[];
}

interface CompletedDocument {
  id: string;
  file_path: string;
}

interface Project {
  id: string;
  title: string;
  research_descriptions?: ResearchDescription[];
  scientific_figures?: ScientificFigure[];
  chalk_talks?: ChalkTalk[];
  completed_documents?: CompletedDocument[];
}

interface DeletionResults {
  researchDescriptions: string[];
  scientificFigures: string[];
  chalkTalks: string[];
  completedDocuments: string[];
  errors: string[];
}

interface DeleteProjectDialogProps {
  project: {
    id: string;
    title: string;
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
      file_path?: string | null;
      file_url?: string | null;
      title?: string | null;
    }>;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onDeleted
}: DeleteProjectDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  console.log('Project Data:', {
    research_descriptions: project.research_descriptions,
    research_descriptions_type: typeof project.research_descriptions,
    is_array: Array.isArray(project.research_descriptions),
    scientific_figures: project.scientific_figures,
    chalk_talks: project.chalk_talks,
    completed_documents: project.completed_documents
  });

  const handleDelete = async () => {
    if (confirmTitle !== project.title) return;

    setIsDeleting(true);
    setError(null);

    const result = await deleteProject(project.id);

    if (result.error) {
      setError(result.error instanceof Error ? result.error.message : 'Failed to delete project');
      setIsDeleting(false);
      return;
    }

    onDeleted();
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      setConfirmTitle('');
      onOpenChange(false);
    }
  };

  // Ensure research_descriptions is an array before mapping
  const researchDescriptionsArray = Array.isArray(project.research_descriptions) 
    ? project.research_descriptions 
    : project.research_descriptions 
      ? [project.research_descriptions]
      : [];

  const researchDescriptions = researchDescriptionsArray.map(d => {
    console.log('Research description:', d);
    return {
      id: d.id,
      hasFile: !!d.file_path,
      vectorCount: d.pinecone_ids?.length || 0
    };
  });

  const scientificFigures = (project.scientific_figures || []).map(f => {
    console.log('Scientific figure:', f);
    return {
      id: f.id,
      hasFile: !!f.image_path,
      hasVector: !!f.pinecone_id
    };
  });

  const chalkTalks = (project.chalk_talks || []).map(t => {
    console.log('Chalk talk:', t);
    return {
      id: t.id,
      hasFile: !!t.media_path,
      vectorCount: t.pinecone_ids?.length || 0
    };
  });

  const completedDocuments = (project.completed_documents || []).map(d => {
    console.log('Completed document:', {
      id: d.id,
      file_path: d.file_path,
      file_url: d.file_url,
      has_file_path: !!d.file_path,
      has_file_url: !!d.file_url,
      full_doc: d
    });
    return {
      id: d.id,
      hasFile: !!d.file_url || !!d.file_path
    };
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
          <DialogDescription>
            This will permanently delete "{project.title}" and all associated data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 text-sm">
            <div>
              <div className="font-medium mb-2">The following will be permanently deleted:</div>
              <div className="space-y-3 pl-1">
                {/* Project Record */}
                <div>
                  <div className="font-medium text-sm">Project Record:</div>
                  <div className="pl-4 text-sm text-muted-foreground space-y-1">
                    <div>"{project.title}"</div>
                  </div>
                </div>

                {/* Research Description */}
                {researchDescriptions.length > 0 && (
                  <div>
                    <div className="font-medium text-sm">Research Descriptions ({researchDescriptions.length}):</div>
                    <ul className="list-disc pl-4 text-sm text-muted-foreground">
                      {researchDescriptions.map((desc) => (
                        <li key={desc.id} className="space-x-1">
                          <span>ID: {desc.id}</span>
                          {desc.hasFile && <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md">has file</span>}
                          {desc.vectorCount > 0 && (
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md">{desc.vectorCount} vectors</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Scientific Figures */}
                {scientificFigures.length > 0 && (
                  <div>
                    <div className="font-medium text-sm">Scientific Figures ({scientificFigures.length}):</div>
                    <ul className="list-disc pl-4 text-sm text-muted-foreground">
                      {scientificFigures.map((fig) => (
                        <li key={fig.id} className="space-x-1">
                          <span>ID: {fig.id}</span>
                          {fig.hasFile && <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md">has file</span>}
                          {fig.hasVector && <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md">has vector</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Chalk Talks */}
                {chalkTalks.length > 0 && (
                  <div>
                    <div className="font-medium text-sm">Chalk Talks ({chalkTalks.length}):</div>
                    <ul className="list-disc pl-4 text-sm text-muted-foreground">
                      {chalkTalks.map((talk) => (
                        <li key={talk.id} className="space-x-1">
                          <span>ID: {talk.id}</span>
                          {talk.hasFile && <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md">has file</span>}
                          {talk.vectorCount > 0 && (
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md">{talk.vectorCount} vectors</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Completed Documents */}
                {completedDocuments.length > 0 && (
                  <div>
                    <div className="font-medium text-sm">Completed Documents ({completedDocuments.length}):</div>
                    <ul className="list-disc pl-4 text-sm text-muted-foreground">
                      {completedDocuments.map((doc) => (
                        <li key={doc.id} className="space-x-1">
                          <span>ID: {doc.id}</span>
                          {doc.hasFile && <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md">has file</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-sm">
                Type <span className="font-medium">{project.title}</span> to confirm:
              </div>
              <Input
                value={confirmTitle}
                onChange={(e) => setConfirmTitle(e.target.value)}
                placeholder="Project title"
                disabled={isDeleting}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || confirmTitle !== project.title}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                Deleting...
              </>
            ) : (
              'Delete Project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 