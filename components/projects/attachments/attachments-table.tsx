import Link from 'next/link';
import { CheckSquare, Square, FileText, Download, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Document } from '@/types/documents';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface AttachmentState {
  completed: boolean;
  updatedAt: string;
  document?: Document;
}

type AttachmentsData = Record<string, AttachmentState>;

interface AttachmentsTableProps {
  documents: Document[];
  attachmentsData: AttachmentsData;
  projectId: string;
  onToggleCompletion: (documentId: string) => Promise<void>;
  onDeleteDocument?: (documentId: string) => Promise<void>;
}

export function AttachmentsTable({ 
  documents, 
  attachmentsData, 
  projectId, 
  onToggleCompletion,
  onDeleteDocument
}: AttachmentsTableProps) {
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchCompletedDocuments();
  }, [documents]);

  const fetchCompletedDocuments = async () => {
    if (documents.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('completed_documents')
        .select('document_id, file_url')
        .eq('project_id', projectId)
        .in('document_id', documents.map(doc => doc.id));

      if (error) {
        console.error('Error fetching completed documents:', error);
        return;
      }

      const urlMap: Record<string, string> = {};
      data?.forEach(item => {
        if (item.file_url) {
          urlMap[item.document_id] = item.file_url;
        }
      });

      setDownloadUrls(urlMap);
    } catch (err) {
      console.error('Error in fetchCompletedDocuments:', err);
    }
  };

  const truncatePrompt = (prompt?: string, maxLength = 50) => {
    if (!prompt) return 'No prompt';
    return prompt.length > maxLength 
      ? `${prompt.substring(0, maxLength)}...` 
      : prompt;
  };

  const handleDeleteClick = (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete || !onDeleteDocument) return;
    
    setIsDeleting(true);
    try {
      await onDeleteDocument(documentToDelete);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Prompt</TableHead>
            <TableHead>Page Limit</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => {
            const attachmentState = attachmentsData[document.id];
            const isCompleted = attachmentState?.completed || false;
            const hasDownload = !!downloadUrls[document.id];
            const isCustomDocument = 'project_id' in document && document.project_id !== null;
            
            return (
              <TableRow key={document.id}>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onToggleCompletion(document.id)}
                    className="p-0 h-auto"
                  >
                    {isCompleted ? (
                      <CheckSquare className="h-5 w-5 text-primary" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                    {document.name}
                  </div>
                </TableCell>
                <TableCell>
                  {document.prompt ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="text-left">
                          {truncatePrompt(document.prompt)}
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md">
                          <p>{document.prompt}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-muted-foreground">No prompt</span>
                  )}
                </TableCell>
                <TableCell>
                  {document.page_limit ? (
                    <span>{document.page_limit} {document.page_limit === 1 ? 'page' : 'pages'}</span>
                  ) : (
                    <span className="text-muted-foreground">No limit</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/projects/${projectId}/attachments/${document.id}`}
                      className="text-primary hover:text-primary/80"
                    >
                      View
                    </Link>
                    {hasDownload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto text-primary hover:text-primary/80"
                        onClick={() => window.open(downloadUrls[document.id], '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {isCustomDocument && onDeleteDocument && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto text-destructive hover:text-destructive/80"
                        onClick={() => handleDeleteClick(document.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete this custom document and any content it contains.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmDelete}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 