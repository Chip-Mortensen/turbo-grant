'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Document, DocumentField, AgencyType, DocumentSourceType } from '@/types/documents';
import { use } from 'react';
import QuestionView from '@/components/attachments/QuestionView';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Bold, Italic, List, Heading, Download, Save, FileOutput } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define the stored document type that matches what's in attachments
interface StoredDocument {
  id: string;
  name: string;
  fields: DocumentField[];
  sources?: string[];
  agency?: string;
  grant_types?: string[];
  custom_processor?: string;
  optional?: boolean;
}

// Define the attachment state type to match what we're storing
interface AttachmentState {
  completed: boolean;
  updatedAt: string;
  document: StoredDocument;
}

type FileType = 'pdf' | 'docx';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: FileType) => Promise<string | undefined>;
  isGenerating: boolean;
  existingFileType?: FileType;
  fileUrl?: string;
  error?: string;
}

function ExportDialog({
  open,
  onOpenChange,
  onExport,
  isGenerating,
  existingFileType,
  fileUrl,
  error
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<FileType>(existingFileType || 'pdf');
  const [generatedFileUrl, setGeneratedFileUrl] = useState<string | undefined>(undefined);

  // Reset the generated URL when the dialog opens/closes or format changes
  useEffect(() => {
    if (!open) {
      setGeneratedFileUrl(undefined);
    }
  }, [open]);

  const handleFormatChange = (value: FileType) => {
    setSelectedFormat(value);
    setGeneratedFileUrl(undefined);
  };

  const handleExport = async () => {
    const newUrl = await onExport(selectedFormat);
    if (newUrl) {
      setGeneratedFileUrl(newUrl);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Document</DialogTitle>
          <DialogDescription>
            Choose a format to export your document
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <Select
              value={selectedFormat}
              onValueChange={handleFormatChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Document</SelectItem>
                <SelectItem value="docx">Word Document</SelectItem>
              </SelectContent>
            </Select>

            {generatedFileUrl ? (
              <Button 
                variant="default"
                onClick={() => window.open(generatedFileUrl, '_blank')}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            ) : (
              <Button
                onClick={handleExport}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </Button>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Toolbar({ editor }: { editor: any }) {
  if (!editor) {
    return null;
  }

  return (
    <div className="sticky top-[57px] z-50 border-b border-gray-200 p-2 bg-white flex gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}
      >
        <Heading className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-gray-200' : ''}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-gray-200' : ''}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ProcessedContent({ 
  documentId, 
  projectId, 
  document,
  onChangesSaved,
  onContentChanged
}: { 
  documentId: string; 
  projectId: string;
  document: Document;
  onChangesSaved: () => void;
  onContentChanged: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportError, setExportError] = useState<string | undefined>(undefined);
  const [fileType, setFileType] = useState<FileType | undefined>(undefined);
  const [fileUrl, setFileUrl] = useState<string | undefined>(undefined);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const supabase = createClient();

  const editor = useEditor({
    extensions: [
      StarterKit
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-slate prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl max-w-none focus:outline-none min-h-[500px] p-4'
      }
    },
    onUpdate: ({ editor }) => {
      // Compare current content with initial content
      const currentContent = editor.getHTML();
      if (currentContent !== initialContent) {
        onContentChanged();
      }
    }
  });

  // Add beforeunload event listener
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (initialContent !== editor?.getHTML()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [initialContent, editor]);

  // Update hasUnsavedChanges when content changes
  useEffect(() => {
    if (editor) {
      const currentContent = editor.getHTML();
      setHasUnsavedChanges(currentContent !== initialContent);
    }
  }, [editor?.getHTML(), initialContent]);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // First check if we have a saved version
        const { data: existingDoc } = await supabase
          .from('completed_documents')
          .select('content, file_url, file_type')
          .eq('document_id', documentId)
          .eq('project_id', projectId)
          .single();

        if (existingDoc) {
          if (existingDoc.content) {
            editor?.commands.setContent(existingDoc.content);
            setInitialContent(existingDoc.content);
          }
          if (existingDoc.file_url) {
            setFileUrl(existingDoc.file_url);
            setFileType(existingDoc.file_type as FileType);
          }
          setLoading(false);
          return;
        }

        // If no saved version, generate new content
        const response = await fetch('/api/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId, projectId })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch processed content');
        }

        const data = await response.json();
        editor?.commands.setContent(data.content);
        setInitialContent(data.content);
        onContentChanged(); // Set to true for newly generated content
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (editor) {
      fetchContent();
    }
  }, [documentId, projectId, editor]);

  const handleSave = async () => {
    if (!editor) return;
    
    setSaving(true);
    setSaveError(null);
    
    try {
      const content = editor.getHTML();

      // Check if record exists
      const { data: existingDoc } = await supabase
        .from('completed_documents')
        .select('content')
        .eq('document_id', documentId)
        .eq('project_id', projectId)
        .single();

      if (existingDoc) {
        // Update existing record
        const { error } = await supabase
          .from('completed_documents')
          .update({ content })
          .eq('document_id', documentId)
          .eq('project_id', projectId);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('completed_documents')
          .insert({
            document_id: documentId,
            project_id: projectId,
            content
          });

        if (error) throw error;
      }

      setInitialContent(content);
      onChangesSaved();
    } catch (err) {
      console.error('Error saving document:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: FileType) => {
    setIsGenerating(true);
    setExportError(undefined);

    try {
      const response = await fetch('/api/documents/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          projectId,
          format,
          content: editor?.getHTML()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate file');
      }

      const data = await response.json();
      if (data.fileUrl) {
        setFileUrl(data.fileUrl);
        setFileType(format);
        return data.fileUrl; // Return the URL for the ExportDialog
      } else {
        throw new Error('No file URL in response');
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to generate file');
      return undefined;
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">{document.name}</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-yellow-600 text-sm">
                You have unsaved changes
              </span>
            )}
            <Button 
              onClick={handleSave} 
              disabled={saving || loading}
              variant="default"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Document
                </>
              )}
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
          >
            <FileOutput className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
        isGenerating={isGenerating}
        existingFileType={fileType}
        fileUrl={fileUrl}
        error={exportError}
      />

      {saveError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {saveError}
        </div>
      )}

      <div className="border">
        <Toolbar editor={editor} />
        {loading ? (
          <div className="animate-pulse space-y-4 p-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4">Error loading content: {error}</div>
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
    </div>
  );
}

export default function DocumentQuestionsPage({ 
  params 
}: { 
  params: Promise<{ projectId: string; documentId: string }> 
}) {
  const { projectId, documentId } = use(params);
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showProcessedContent, setShowProcessedContent] = useState(false);
  const supabase = createClient();

  // Add function to check if all questions are answered
  const areAllQuestionsAnswered = (fields: DocumentField[]) => {
    return fields.every(field => field.answer && field.answer.trim() !== '');
  };

  const handleNavigateAway = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      router.push(`/dashboard/${projectId}/attachments`);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    setIsLoading(true);
    try {
      // First, try to find the document in project's attachments (primary source)
      const { data: project } = await supabase
        .from('research_projects')
        .select('attachments')
        .eq('id', projectId)
        .single();
      
      if (project?.attachments) {
        console.log('Checking project attachments');
        
        // Check if the document exists directly by ID in the attachments
        if (project.attachments[documentId]) {
          const attachment = project.attachments[documentId] as AttachmentState;
          
          if (attachment.document) {
            console.log('Found document in project attachments:', attachment.document);
            
            // Convert to full Document by adding missing props if needed
            const docWithDefaults: Document = {
              id: attachment.document.id,
              name: attachment.document.name,
              fields: attachment.document.fields || [],
              sources: (attachment.document.sources as DocumentSourceType[]) || [],
              agency: (attachment.document.agency as AgencyType) || 'NIH',
              grant_types: attachment.document.grant_types || [],
              custom_processor: attachment.document.custom_processor,
              optional: attachment.document.optional ?? false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            setDocument(docWithDefaults);
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Fallback to searching the documents table by ID
      console.log('Document not found in attachments, fetching from documents table');
      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .maybeSingle();
      
      if (fetchError) {
        throw new Error(`Failed to fetch document: ${fetchError.message}`);
      }
      
      if (!data) {
        throw new Error('Document not found');
      }
      
      console.log('Found document in database:', data);
      setDocument(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAnswers = async (updatedFields: DocumentField[]) => {
    if (!document) return;
    
    setSaveStatus('saving');
    
    try {
      // Update the document in the project's attachments
      // First, get the current attachments data
      const { data: project, error: fetchError } = await supabase
        .from('research_projects')
        .select('attachments')
        .eq('id', projectId)
        .single();
      
      if (fetchError) {
        throw new Error(`Failed to fetch project attachments: ${fetchError.message}`);
      }
      
      if (!project?.attachments) {
        throw new Error('Project attachments not found');
      }
      
      // Create a copy of the attachments to work with
      const updatedAttachments = { ...project.attachments };
      
      // Make sure the document exists in attachments
      if (!updatedAttachments[document.id]) {
        console.log('Document not found in attachments, creating it now');
        // Initialize the attachment if it doesn't exist
        updatedAttachments[document.id] = {
          completed: false,
          updatedAt: new Date().toISOString(),
          document: {
            id: document.id,
            name: document.name,
            fields: updatedFields,
            sources: document.sources || [],
            agency: document.agency,
            grant_types: document.grant_types || [],
            custom_processor: document.custom_processor,
            optional: document.optional ?? false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        };
      } else {
        // Update the existing document fields in the attachment
        if (!updatedAttachments[document.id].document) {
          updatedAttachments[document.id].document = {
            id: document.id,
            name: document.name,
            fields: updatedFields,
            sources: document.sources || [],
            agency: document.agency,
            grant_types: document.grant_types || [],
            custom_processor: document.custom_processor,
            optional: document.optional ?? false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          // Update just the fields in the existing document
          updatedAttachments[document.id].document = {
            ...updatedAttachments[document.id].document,
            fields: updatedFields
          };
        }
      }
      
      // Update the timestamp
      updatedAttachments[document.id].updatedAt = new Date().toISOString();
      
      // Remove auto-completion logic and keep the existing completion status
      console.log('Updating attachments with new fields:', updatedAttachments[document.id]);
      
      // Update the research_projects table with the updated attachments
      const { error: updateError } = await supabase
        .from('research_projects')
        .update({ attachments: updatedAttachments })
        .eq('id', projectId);
      
      if (updateError) {
        throw new Error(`Failed to update project attachments: ${updateError.message}`);
      }
      
      // Update the local state with the new fields
      setDocument(prev => prev ? {
        ...prev,
        fields: updatedFields
      } : null);
      
      setSaveStatus('success');
      // Set a timeout to reset the status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);

      // Check if all questions are answered and show processed content
      if (areAllQuestionsAnswered(updatedFields)) {
        setShowProcessedContent(true);
      }
      
    } catch (err) {
      console.error('Error updating document:', err);
      setSaveStatus('error');
      // Set a timeout to reset the status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-6 py-1">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error || "Document not found"}</span>
        </div>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href={`/dashboard/${projectId}/attachments`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Attachments
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Check for project-description processor or if all questions are answered
  if (document.custom_processor === 'project-description' || showProcessedContent) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Button 
          asChild={!hasUnsavedChanges} 
          variant="outline" 
          className="mb-4"
          onClick={hasUnsavedChanges ? handleNavigateAway : undefined}
        >
          {hasUnsavedChanges ? (
            <div className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Attachments
            </div>
          ) : (
            <Link href={`/dashboard/${projectId}/attachments`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Attachments
            </Link>
          )}
        </Button>

        <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unsaved Changes</DialogTitle>
              <DialogDescription>
                You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setShowExitDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  setShowExitDialog(false);
                  router.push(`/dashboard/${projectId}/attachments`);
                }}
              >
                Leave Without Saving
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div>
          <ProcessedContent 
            documentId={documentId} 
            projectId={projectId}
            document={document}
            onChangesSaved={() => setHasUnsavedChanges(false)}
            onContentChanged={() => setHasUnsavedChanges(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button asChild variant="outline" className="mb-4">
          <Link href={`/dashboard/${projectId}/attachments`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Attachments
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-gray-900 sr-only">Document Questions: {document.name}</h1>
        
        {saveStatus === 'saving' && (
          <div className="text-sm text-blue-600 mt-2">Saving changes...</div>
        )}
        {saveStatus === 'success' && (
          <div className="text-sm text-green-600 mt-2">Changes saved successfully!</div>
        )}
        {saveStatus === 'error' && (
          <div className="text-sm text-red-600 mt-2">Failed to save changes. Please try again.</div>
        )}
      </div>

      <QuestionView 
        document={document} 
        onUpdateAnswers={handleUpdateAnswers} 
      />
    </div>
  );
} 