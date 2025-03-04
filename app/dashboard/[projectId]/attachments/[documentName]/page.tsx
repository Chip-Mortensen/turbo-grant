'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Document, DocumentField, AgencyType } from '@/types/documents';
import { use } from 'react';
import QuestionView from '@/components/documents/QuestionView';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

// Define the stored document type that matches what's in attachments
interface StoredDocument {
  id: string;
  name: string;
  fields: DocumentField[];
  sources?: string[];
  agency?: string;
  grant_types?: string[];
  custom_processor?: string;
}

// Define the attachment state type to match what we're storing
interface AttachmentState {
  completed: boolean;
  updatedAt: string;
  attachmentUrl?: string;
  document: StoredDocument;
}

export default function DocumentQuestionsPage({ 
  params 
}: { 
  params: Promise<{ projectId: string; documentName: string }> 
}) {
  const { projectId, documentName } = use(params);
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const supabase = createClient();

  useEffect(() => {
    fetchDocument();
  }, [documentName]);

  const fetchDocument = async () => {
    setIsLoading(true);
    try {
      // First, check if the document is in localStorage (from attachments page)
      let documentData = null;
      try {
        const storedDocument = localStorage.getItem('current-document');
        if (storedDocument) {
          documentData = JSON.parse(storedDocument);
          console.log('Found document in localStorage:', documentData);
          
          // Verify this is the right document
          if (documentData && documentData.name === decodeURIComponent(documentName)) {
            setDocument(documentData);
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('Error retrieving document from localStorage:', e);
      }
      
      // Second, try to find the document in project's attachments
      const { data: project } = await supabase
        .from('research_projects')
        .select('attachments')
        .eq('id', projectId)
        .single();
      
      if (project?.attachments) {
        console.log('Checking project attachments:', project.attachments);
        
        // Look through all attachments to find the document by name
        for (const [docId, attachment] of Object.entries(project.attachments as Record<string, AttachmentState>)) {
          if (attachment.document && attachment.document.name === decodeURIComponent(documentName)) {
            console.log('Found document in project attachments:', attachment.document);
            
            // Convert to full Document by adding missing props if needed
            const docWithDefaults: Document = {
              id: attachment.document.id,
              name: attachment.document.name,
              fields: attachment.document.fields,
              sources: (attachment.document.sources as any[]) || [],
              agency: (attachment.document.agency as AgencyType) || 'NIH',
              grant_types: attachment.document.grant_types || [],
              custom_processor: attachment.document.custom_processor,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            setDocument(docWithDefaults);
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Finally, fallback to searching the documents table
      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('name', decodeURIComponent(documentName))
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
      // First update the documents table if we're using that source
      // This might not be necessary long-term if we're only storing in attachments
      const { error } = await supabase
        .from('documents')
        .update({ fields: updatedFields })
        .eq('id', document.id);

      if (error) {
        console.error('Error updating document in documents table:', error);
        // We'll continue with updating the attachments even if this fails
      }

      // Update the local state with the new fields
      setDocument(prev => prev ? { ...prev, fields: updatedFields } : null);
      
      // Update the document in the project's attachments - this is the critical part
      if (document.id) {
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
              fields: [],
              sources: document.sources || [],
              agency: document.agency,
              grant_types: document.grant_types || [],
              custom_processor: document.custom_processor
            }
          };
        }
        
        // Update the document fields in the attachment
        if (updatedAttachments[document.id]) {
          // Make sure the document property exists
          if (!updatedAttachments[document.id].document) {
            updatedAttachments[document.id].document = {
              id: document.id,
              name: document.name,
              fields: updatedFields,
              sources: document.sources || [],
              agency: document.agency,
              grant_types: document.grant_types || [],
              custom_processor: document.custom_processor
            };
          } else {
            // Update the existing document fields
            updatedAttachments[document.id].document = {
              ...updatedAttachments[document.id].document,
              fields: updatedFields
            };
          }
          
          // Update the timestamp
          updatedAttachments[document.id].updatedAt = new Date().toISOString();
          
          // Check if all fields have answers to mark as completed
          const allFieldsAnswered = updatedFields.every(field => field.answer && field.answer.trim() !== '');
          if (allFieldsAnswered) {
            updatedAttachments[document.id].completed = true;
          }
          
          console.log('Updating attachments with new fields:', updatedAttachments[document.id]);
          
          // Update the research_projects table with the updated attachments
          const { error: updateError } = await supabase
            .from('research_projects')
            .update({ attachments: updatedAttachments })
            .eq('id', projectId);
          
          if (updateError) {
            throw new Error(`Failed to update project attachments: ${updateError.message}`);
          }
          
          setSaveStatus('success');
          // Set a timeout to reset the status after 2 seconds
          setTimeout(() => setSaveStatus('idle'), 2000);
        }
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