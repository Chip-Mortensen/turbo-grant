'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Document, DocumentField, AgencyType, DocumentSourceType } from '@/types/documents';
import { use } from 'react';
import QuestionView from '@/components/projects/attachments/question-view';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Bold, Italic, List, Heading, Download, Save, FileOutput, Wand2 } from 'lucide-react';
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
import { BackButton } from "@/components/ui/back-button";
import { AIEditInput } from '@/components/projects/attachments/ai-edit-dialog';
import EditHighlighter from '@/components/projects/attachments/edit-highlighter';
import { EditSuggestion } from '@/app/api/attachments/ai-edit/route';
import { Mark } from '@tiptap/core';

// Define the stored document type that matches what's in attachments
interface StoredDocument {
  id: string;
  name: string;
  fields: DocumentField[];
  sources?: string[];
  agency?: string;
  grant_types?: string[];
  custom_processor?: string;
  prompt?: string;
  page_limit?: number;
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

// Define the EditStatusMap interface here, since importing from the component is causing issues
interface EditStatusMap {
  [editId: string]: 'approved' | 'denied' | 'pending' | 'applied';
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
  const [isNewlyGenerated, setIsNewlyGenerated] = useState(false);
  const [aiEditLoading, setAIEditLoading] = useState(false);
  const [editSuggestions, setEditSuggestions] = useState<EditSuggestion[] | null>(null);
  const [isApplyingEdits, setIsApplyingEdits] = useState(false);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [editStatuses, setEditStatuses] = useState<EditStatusMap>({});
  const [editCounts, setEditCounts] = useState({ pending: 0, total: 0 });
  const [isAIEditOpen, setIsAIEditOpen] = useState(false);
  const [processedEditIds, setProcessedEditIds] = useState<Set<string>>(new Set());
  const supabase = createClient();
  
  // Add a ref to track when we're in the middle of applying edits to prevent loops
  const isApplyingRef = useRef(false);
  // Create a dedicated variable to track which edits have been completed
  const completedEditsRef = useRef(new Set<string>());
  
  // Reference to track content changes
  const contentRef = useRef<{
    initial: string | null;
    current: string | null;
  }>({
    initial: null,
    current: null
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Mark.create({
        name: 'diffRemoved',
        inclusive: true,
        parseHTML() {
          return [
            {
              tag: 'span',
              class: 'ai-edit-diff-removed',
            },
          ]
        },
        renderHTML({ HTMLAttributes }) {
          return ['span', { class: 'ai-edit-diff-removed' }, 0]
        },
      }),
      Mark.create({
        name: 'diffAdded',
        inclusive: true,
        parseHTML() {
          return [
            {
              tag: 'span',
              class: 'ai-edit-diff-added',
            },
          ]
        },
        renderHTML({ HTMLAttributes }) {
          return ['span', { class: 'ai-edit-diff-added' }, 0]
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-slate prose-headings:font-bold prose-h1:text-lg prose-h2:text-base max-w-none focus:outline-none min-h-[500px] p-4 bg-white rounded-md'
      }
    },
    onUpdate: ({ editor }) => {
      const currentContent = editor.getHTML();
      contentRef.current.current = currentContent;
      
      // Compare with initial content
      const hasChanges = currentContent !== contentRef.current.initial;
      
      // Update local state
      setHasUnsavedChanges(hasChanges);
      
      // Communicate with parent component
      if (hasChanges) {
        onContentChanged();
      } else {
        onChangesSaved();
      }
    }
  });

  // Handle beforeunload event to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    fetchContent();
  }, [documentId, projectId]);

  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
      contentRef.current.initial = initialContent;
      contentRef.current.current = initialContent;
      onContentChanged();
    }
  }, [editor, initialContent, onContentChanged]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      
      // First check if we have a completed document
      const { data: completedDocument, error: completedError } = await supabase
        .from('completed_documents')
        .select('*')
        .eq('document_id', documentId)
        .eq('project_id', projectId)
        .maybeSingle();
      
      if (completedError) {
        console.error('Error fetching completed document:', completedError);
      }
      
      if (completedDocument) {
        console.log('Found completed document:', completedDocument);
        setInitialContent(completedDocument.content);
        setFileType(completedDocument.file_type as FileType);
        setFileUrl(completedDocument.file_url);
        setLoading(false);
        return;
      }
      
      // If no completed document, try to generate it via the API
      console.log('No completed document found, calling generation API');
      setIsGeneratingDocument(true);
      
      try {
        // Call the document generation API
        const response = await fetch('/api/documents/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId,
            projectId,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Successfully generated document content via API');
          setInitialContent(data.content);
          setIsGeneratingDocument(false);
          setLoading(false);
          
          // Check if the document was created in the database
          const { data: createdDoc } = await supabase
            .from('completed_documents')
            .select('file_type, file_url')
            .eq('document_id', documentId)
            .eq('project_id', projectId)
            .maybeSingle();
            
          if (createdDoc) {
            setFileType(createdDoc.file_type as FileType);
            setFileUrl(createdDoc.file_url);
          }
          
          return;
        } else {
          // Check if this is a race condition error (500 with duplicate key)
          const errorText = await response.text();
          console.error('Failed to generate document via API:', errorText);
          
          // Even if the API call failed, check if the document was created anyway
          // (this handles the race condition where another request succeeded)
          const { data: createdDoc } = await supabase
            .from('completed_documents')
            .select('content, file_type, file_url')
            .eq('document_id', documentId)
            .eq('project_id', projectId)
            .maybeSingle();
            
          if (createdDoc) {
            console.log('Document was created despite API error, using it');
            setInitialContent(createdDoc.content);
            setFileType(createdDoc.file_type as FileType);
            setFileUrl(createdDoc.file_url);
            setIsGeneratingDocument(false);
            setLoading(false);
            return;
          }
          
          setIsGeneratingDocument(false);
          // Continue with fallback content generation
        }
      } catch (genError) {
        console.error('Error calling document generation API:', genError);
        
        // Check if the document was created despite the error
        const { data: createdDoc } = await supabase
          .from('completed_documents')
          .select('content, file_type, file_url')
          .eq('document_id', documentId)
          .eq('project_id', projectId)
          .maybeSingle();
          
        if (createdDoc) {
          console.log('Document was created despite API error, using it');
          setInitialContent(createdDoc.content);
          setFileType(createdDoc.file_type as FileType);
          setFileUrl(createdDoc.file_url);
          setIsGeneratingDocument(false);
          setLoading(false);
          return;
        }
        
        setIsGeneratingDocument(false);
        // Continue with fallback content generation
      }
      
      // Fallback: Generate content from the document fields
      console.log('Falling back to generating content from fields');
      
      // Get the document fields from the project's attachments
      const { data: project, error: projectError } = await supabase
        .from('research_projects')
        .select('attachments')
        .eq('id', projectId)
        .single();
      
      if (projectError) {
        throw new Error(`Error fetching project: ${projectError.message}`);
      }
      
      if (!project?.attachments || !project.attachments[documentId]) {
        console.log('Document not found in project attachments');
        // Generate empty content
        setInitialContent('<h1>' + document.name + '</h1><p>No content available yet. Please fill out the document questions.</p>');
        setLoading(false);
        return;
      }
      
      const attachment = project.attachments[documentId] as AttachmentState;
      
      if (!attachment.document?.fields?.length) {
        console.log('No fields found in document');
        // Generate empty content
        setInitialContent('<h1>' + document.name + '</h1><p>No content available yet. Please fill out the document questions.</p>');
        setLoading(false);
        return;
      }
      
      // Generate content from fields
      let content = `<h1>${document.name}</h1>`;
      
      attachment.document.fields.forEach(field => {
        if (field.answer && field.answer.trim() !== '') {
          content += `<h2>${field.label}</h2>`;
          content += `<p>${field.answer}</p>`;
        }
      });
      
      setInitialContent(content);
      setLoading(false);
      
    } catch (error: any) {
      console.error('Error fetching content:', error);
      setError(error.message || 'Failed to load document content');
      setIsGeneratingDocument(false);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editor || !contentRef.current.current) return;
    
    try {
      setSaving(true);
      
      const content = contentRef.current.current;
      
      // Save to completed_documents table
      const { data: existingDoc, error: fetchError } = await supabase
        .from('completed_documents')
        .select('id')
        .eq('document_id', documentId)
        .eq('project_id', projectId)
        .maybeSingle();
      
      if (fetchError) {
        throw new Error(`Error checking for existing document: ${fetchError.message}`);
      }
      
      if (existingDoc) {
        // Update existing document
        const { error: updateError } = await supabase
          .from('completed_documents')
          .update({
            content
          })
          .eq('id', existingDoc.id);
        
        if (updateError) {
          throw new Error(`Error updating document: ${updateError.message}`);
        }
      } else {
        // Create new document
        const { error: insertError } = await supabase
          .from('completed_documents')
          .insert({
            project_id: projectId,
            document_id: documentId,
            content,
            created_at: new Date().toISOString()
          });
        
        if (insertError) {
          throw new Error(`Error creating document: ${insertError.message}`);
        }
        
        setIsNewlyGenerated(true);
      }
      
      // Update content reference
      contentRef.current.initial = content;
      
      // Update UI state
      setHasUnsavedChanges(false);
      onChangesSaved();
      
    } catch (error: any) {
      console.error('Error saving document:', error);
      setSaveError(error.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: FileType) => {
    try {
      setIsGenerating(true);
      setExportError(undefined);
      
      // Save content first if there are unsaved changes
      if (hasUnsavedChanges) {
        await handleSave();
      }
      
      // Check if we already have a file of this type
      if (fileType === format && fileUrl) {
        return fileUrl;
      }
      
      // Generate the file
      const response = await fetch('/api/documents/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: contentRef.current.current,
          format,
          documentId,
          projectId,
          documentName: document.name
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export document');
      }
      
      const data = await response.json();
      
      // Update state with new file info
      setFileType(format);
      setFileUrl(data.fileUrl);
      
      // Update the completed_documents record with file info
      const { error: updateError } = await supabase
        .from('completed_documents')
        .update({
          file_url: data.fileUrl,
          file_type: format
        })
        .eq('document_id', documentId)
        .eq('project_id', projectId);
      
      if (updateError) {
        console.error('Error updating document with file info:', updateError);
      }
      
      return data.fileUrl;
      
    } catch (error: any) {
      console.error('Error exporting document:', error);
      setExportError(error.message || 'Failed to export document');
      return undefined;
    } finally {
      setIsGenerating(false);
    }
  };

  // Add function to request AI edits
  const requestAIEdit = async (instruction: string) => {
    if (!editor) return;
    
    setAIEditLoading(true);
    
    try {
      const content = editor.getHTML();
      
      console.log('Requesting AI edit with instruction:', instruction);
      
      // Import the getHTMLSummary function
      const { getHTMLSummary } = await import('@/utils/html-parser');
      
      // Get HTML summary for better context
      const htmlSummary = getHTMLSummary(content);
      console.log('HTML summary generated with tag types:', Object.keys(htmlSummary.tagsByType || {}).length);
      
      const requestData = {
        content,
        instruction,
        documentId,
        projectId,
        htmlSummary
      };
      
      const response = await fetch('/api/attachments/ai-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error requesting AI edit:', errorText);
        throw new Error(`Error requesting AI edit: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Received edit suggestions:', data.suggestions);
      
      // Set the suggestions for highlighting
      setEditSuggestions(data.suggestions);
      
    } catch (error) {
      console.error('Error requesting AI edit:', error);
      setEditSuggestions(null);
    } finally {
      setAIEditLoading(false);
    }
  };

  // Add this helper function to reset the edit state safely
  const resetEditState = useCallback(() => {
    console.log('Resetting edit state completely');
    // Set the ref first to prevent any new edits from being triggered during cleanup
    isApplyingRef.current = false;
    setIsApplyingEdits(false);
    setEditSuggestions(null);
    setEditStatuses({});
    setEditCounts({ pending: 0, total: 0 });
    setProcessedEditIds(new Set());
    completedEditsRef.current = new Set();
  }, []);

  // Handle approving an edit
  const handleApproveEdit = (editId: string) => {
    // Skip if already completed to prevent double-processing
    if (completedEditsRef.current.has(editId)) {
      console.log(`Edit ${editId} has already been completed, skipping`);
      return;
    }

    // Guard against applying edits while we're already in a process
    if (isApplyingRef.current) {
      console.log('Already applying edits, skipping approval request');
      return;
    }
    
    // Skip if this edit is already processed
    if (processedEditIds.has(editId)) {
      console.log(`Edit ${editId} has already been processed, skipping`);
      return;
    }

    console.log(`Approving edit: ${editId}`);
    // Mark this edit as processed to prevent re-processing
    setProcessedEditIds(prev => {
      const newSet = new Set(prev);
      newSet.add(editId);
      return newSet;
    });

    // Mark as completed in our ref
    completedEditsRef.current.add(editId);

    // Update the edit status
    setEditStatuses(prev => ({
      ...prev,
      [editId]: 'approved'
    }));

    // For individual edits, we now let EditHighlighter handle application without mode switching
    // The EditHighlighter component will directly apply the edit without changing modes
    setHasUnsavedChanges(true);
  };
  
  // Handle denying an edit
  const handleDenyEdit = (editId: string) => {
    // Skip if already completed
    if (completedEditsRef.current.has(editId)) {
      console.log(`Edit ${editId} has already been completed, skipping`);
      return;
    }
    
    // Guard against applying edits while we're already in a process
    if (isApplyingRef.current) {
      console.log('Already applying edits, skipping denial request');
      return;
    }
    
    // Skip if this edit is already processed
    if (processedEditIds.has(editId)) {
      console.log(`Edit ${editId} has already been processed, skipping`);
      return;
    }

    console.log(`Denying edit: ${editId}`);
    // Mark this edit as processed
    setProcessedEditIds(prev => {
      const newSet = new Set(prev);
      newSet.add(editId);
      return newSet;
    });

    // Mark as completed in our ref
    completedEditsRef.current.add(editId);

    // Update the edit status
    setEditStatuses(prev => ({
      ...prev,
      [editId]: 'denied'
    }));

    // When denying an edit, we want to immediately hide it from the UI
    // to create the same visual effect as approving it
    setTimeout(() => {
      // This forces the EditHighlighter to refresh and immediately hide the rejected edit
      setEditStatuses(prev => ({ ...prev }));
      // Also notify that there was a content change to update UI
      handleContentChange();
    }, 10);
  };
  
  // Handle applying all remaining edits
  const handleApproveAllRemaining = () => {
    console.log('handleApproveAllRemaining called');
    
    if (!editSuggestions) {
      console.log('No edit suggestions to approve');
      return;
    }
    
    // If there are no pending edits left, clear suggestions and return early
    if (editCounts.pending === 0) {
      console.log('No pending edits remaining, clearing suggestions');
      resetEditState();
      return;
    }
    
    // Create a direct map of all edits that should be approved
    const newStatuses: EditStatusMap = { ...editStatuses };
    let hasChanges = false;
    
    // Mark all PENDING edits as approved
    editSuggestions.forEach(edit => {
      const id = ('id' in edit) ? (edit as any).id as string : '';
      if (id) {
        const currentStatus = editStatuses[id] || 'pending';
        // Only change edits that are pending
        if (currentStatus === 'pending') {
          console.log(`Setting edit ${id} from 'pending' to 'approved'`);
          newStatuses[id] = 'approved';
          hasChanges = true;
          
          // Mark as completed in our tracking set
          completedEditsRef.current.add(id);
        }
      }
    });
    
    if (!hasChanges) {
      console.log('No pending edits to approve');
      return;
    }
    
    // First reset any previous apply state to ensure a clean start
    isApplyingRef.current = false;
    
    // Set the new statuses and trigger applying mode
    setEditStatuses(newStatuses);
    
    // Use a small delay to ensure state updates
    setTimeout(() => {
      console.log('Switching to apply mode for batch approval');
      // Now switch to apply mode
      isApplyingRef.current = true;
      setIsApplyingEdits(true);
    }, 20);
  };

  // In the component, add the function at component scope
  const afterEditsApplied = () => {
    console.log('All edits have been applied, cleaning up state');
    
    // Reset all state after edits are applied
    setEditSuggestions(null);
    isApplyingRef.current = false;
    setIsApplyingEdits(false);
    setEditStatuses({});
    setProcessedEditIds(new Set());
    completedEditsRef.current = new Set();
    
    console.log('State cleanup complete');
  };

  // Add a content changed handler at component level
  const handleContentChange = () => {
    console.log('Content changed detected from EditHighlighter');
    setHasUnsavedChanges(true);
  };

  // Then update applyEdits to no longer define the function
  const applyEdits = () => {
    if (!editSuggestions) {
      console.log('No edit suggestions to apply');
      return;
    }
    
    console.log(`Applying ${editSuggestions.length} edit suggestions`);
    
    // SEQUENTIAL APPROACH: Apply edits in a clear, deterministic sequence
    
    // First, close the dialog immediately for good UX
    setIsAIEditOpen(false);
    
    // Create a local copy of suggestions to work with
    const suggestionsToProcess = [...editSuggestions];
    
    // Start with the current status map to preserve existing statuses
    const newStatuses: EditStatusMap = { ...editStatuses };
    let editCount = 0;
    
    // Only mark pending edits as approved, preserving existing status for others
    suggestionsToProcess.forEach(suggestion => {
      if ('edits' in suggestion && suggestion.edits) {
        suggestion.edits.forEach(edit => {
          const id = ('id' in edit) ? (edit as any).id : '';
          if (id) {
            // Only override if the status is pending or undefined
            const currentStatus = editStatuses[id];
            if (!currentStatus || currentStatus === 'pending') {
              newStatuses[id] = 'approved';
              editCount++;
            } else {
              console.log(`Preserving existing status for edit ${id}: ${currentStatus}`);
            }
          }
        });
      } else if ('id' in suggestion) {
        const id = (suggestion as any).id;
        // Only override if the status is pending or undefined
        const currentStatus = editStatuses[id];
        if (!currentStatus || currentStatus === 'pending') {
          newStatuses[id] = 'approved';
          editCount++;
        } else {
          console.log(`Preserving existing status for edit ${id}: ${currentStatus}`);
        }
      }
    });
    
    console.log(`Marked ${editCount} individual edits as approved`);
    console.log('Status map after applying edits:', newStatuses);
    
    // Apply the status changes
    setEditStatuses(newStatuses);
    
    // Enable apply mode to trigger the edit application
    console.log('Enabling apply mode');
    isApplyingRef.current = true;
    setIsApplyingEdits(true);
    
    // Mark content as changed
    setHasUnsavedChanges(true);
  };

  // Discard edits function
  const discardEdits = () => {
    resetEditState();
  };

  // Helper function to calculate text similarity
  const calculateTextSimilarity = (text1: string, text2: string): number => {
    if (!text1 || !text2) return 0;
    if (text1 === text2) return 1;
    
    // Simple implementation using character-level differences
    const maxLength = Math.max(text1.length, text2.length);
    let differences = 0;
    
    for (let i = 0; i < Math.min(text1.length, text2.length); i++) {
      if (text1[i] !== text2[i]) {
        differences++;
      }
    }
    
    // Add the length difference as differences
    differences += Math.abs(text1.length - text2.length);
    
    return 1 - (differences / maxLength);
  };

  const handleStatusChange = (pending: number, total: number) => {
    setEditCounts({ pending, total });
  };

  const handleSaveContent = useCallback((content: string) => {
    if (contentRef.current) {
      contentRef.current.current = content;
    }
    setHasUnsavedChanges(true);
  }, []);

  // Add an effect to reset the applying ref when isApplyingEdits state changes to false
  useEffect(() => {
    if (!isApplyingEdits) {
      isApplyingRef.current = false;
    }
  }, [isApplyingEdits]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{document.name}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            className="flex items-center"
          >
            <FileOutput className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="flex items-center"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
      
      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          Error: {saveError}
        </div>
      )}
      
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
        isGenerating={isGenerating}
        existingFileType={fileType}
        fileUrl={fileUrl}
        error={exportError}
      />
      
      <div className="border relative">
        <Toolbar editor={editor} />
        {loading ? (
          <div className="animate-pulse space-y-4 p-4">
            {isGeneratingDocument ? (
              <>
                <div className="flex items-center justify-center p-6 text-center">
                  <div className="space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-gray-500">Generating document content...</p>
                    <p className="text-xs text-gray-400">This may take a moment</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              </>
            )}
          </div>
        ) : error ? (
          <div className="text-red-500 p-4">Error loading content: {error}</div>
        ) : (
          <div className="relative">
            <EditorContent editor={editor} />
            <EditHighlighter
              editor={editor}
              editSuggestions={editSuggestions}
              mode={isApplyingEdits ? 'apply' : 'preview'}
              editStatuses={editStatuses}
              onApproveEdit={handleApproveEdit}
              onDenyEdit={handleDenyEdit}
              onApproveAll={handleApproveAllRemaining}
              onContentChange={handleContentChange}
              onStatusChange={handleStatusChange}
              onApplied={afterEditsApplied}
            />
            <AIEditInput
              onRequestEdit={requestAIEdit}
              isLoading={aiEditLoading}
              editSuggestions={editSuggestions}
              onApplyEdits={applyEdits}
              onDiscardEdits={discardEdits}
              pendingCount={editCounts.pending}
              totalCount={editCounts.total}
              setOpen={setIsAIEditOpen}
            />
          </div>
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
  const supabase = createClient();

  // Helper function to check if a document has unsaved changes
  const handleContentChange = (hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  };

  const areAllQuestionsAnswered = (fields: DocumentField[]) => {
    return fields.every(field => field.answer && field.answer.trim() !== '');
  };

  const handleNavigateAway = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      router.push(`/projects/${projectId}/attachments`);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  // Handle the browser's back/forward buttons
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Define the handler for popstate event
    const handlePopState = (event: PopStateEvent) => {
      // If there are unsaved changes, prevent navigating away and show dialog
      if (hasUnsavedChanges) {
        // This is needed to prevent the default back behavior
        window.history.pushState(null, '', window.location.href);
        // Show the exit dialog
        setShowExitDialog(true);
      }
    };

    // Add a state to the history so we can detect back button clicks
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges]);

  const fetchDocument = async () => {
    setIsLoading(true);
    try {
      const { data: project } = await supabase
        .from('research_projects')
        .select('attachments')
        .eq('id', projectId)
        .single();
      
      if (project?.attachments) {
        console.log('Checking project attachments');
        
        if (project.attachments[documentId]) {
          const attachment = project.attachments[documentId] as AttachmentState;
          
          if (attachment.document) {
            console.log('Found document in project attachments:', attachment.document);
            
            const docWithDefaults: Document = {
              id: attachment.document.id,
              name: attachment.document.name,
              fields: attachment.document.fields || [],
              sources: (attachment.document.sources as DocumentSourceType[]) || [],
              agency: (attachment.document.agency as AgencyType) || 'NIH',
              grant_types: attachment.document.grant_types || [],
              custom_processor: attachment.document.custom_processor,
              prompt: attachment.document.prompt,
              page_limit: attachment.document.page_limit,
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
      
      const updatedAttachments = { ...project.attachments };
      
      if (!updatedAttachments[document.id]) {
        console.log('Document not found in attachments, creating it now');
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
            prompt: document.prompt,
            page_limit: document.page_limit,
            optional: document.optional ?? false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        };
      } else {
        if (!updatedAttachments[document.id].document) {
          updatedAttachments[document.id].document = {
            id: document.id,
            name: document.name,
            fields: updatedFields,
            sources: document.sources || [],
            agency: document.agency,
            grant_types: document.grant_types || [],
            custom_processor: document.custom_processor,
            prompt: document.prompt,
            page_limit: document.page_limit,
            optional: document.optional ?? false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          updatedAttachments[document.id].document = {
            ...updatedAttachments[document.id].document,
            fields: updatedFields,
            updated_at: new Date().toISOString()
          };
        }
      }
      
      updatedAttachments[document.id].updatedAt = new Date().toISOString();
      
      console.log('Updating attachments with new fields:', updatedAttachments[document.id]);
      
      const { error: updateError } = await supabase
        .from('research_projects')
        .update({ attachments: updatedAttachments })
        .eq('id', projectId);
      
      if (updateError) {
        throw new Error(`Failed to update project attachments: ${updateError.message}`);
      }
      
      setDocument(prev => prev ? {
        ...prev,
        fields: updatedFields
      } : null);
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
      
    } catch (err) {
      console.error('Error updating document:', err);
      setSaveStatus('error');
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
          <BackButton 
            href={`/projects/${projectId}/attachments`} 
            label="Back to Attachments" 
            variant="outline" 
          />
        </div>
      </div>
    );
  }

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
          <Link href={`/projects/${projectId}/attachments`}>
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
                router.push(`/projects/${projectId}/attachments`);
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
          onChangesSaved={() => {
            setHasUnsavedChanges(false);
          }}
          onContentChanged={() => handleContentChange(true)}
        />
      </div>
    </div>
  );
} 