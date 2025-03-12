'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { Document } from '@/types/documents';
import { AttachmentsTable } from './attachments-table';

// Define the structure for the attachments JSONB column with document information
interface AttachmentState {
  completed: boolean;
  updatedAt: string;
  document?: Document;
}

type AttachmentsData = Record<string, AttachmentState>;

interface AttachmentsManagerProps {
  projectId: string;
}

export function AttachmentsManager({ projectId }: AttachmentsManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attachmentsData, setAttachmentsData] = useState<AttachmentsData>({});
  const [projectFOA, setProjectFOA] = useState<{
    agency?: string; 
    grantType?: string;
    title?: string;
    id?: string;
  }>({});
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchProjectFOA();
  }, [projectId]);

  // First fetch the project's FOA to determine agency and grant type
  const fetchProjectFOA = async () => {
    try {
      console.log('Fetching project FOA for project ID:', projectId);
      
      // Get the project with FOA details
      const { data: project, error: projectError } = await supabase
        .from('research_projects')
        .select('*, foa(*), attachments')
        .eq('id', projectId)
        .single();
      
      if (projectError) {
        console.error('Error fetching project:', projectError);
        throw new Error(`Failed to fetch project: ${projectError.message}`);
      }
      
      console.log('Project data:', project);
      
      // Load attachments data from the project
      if (project.attachments) {
        console.log('Loaded attachments data:', project.attachments);
        setAttachmentsData(project.attachments as AttachmentsData);
      } else {
        console.log('No attachments data found in project');
      }
      
      if (project?.foa) {
        const foaDetails = {
          id: project.foa.id,
          agency: project.foa.agency,
          grantType: project.foa.grant_type,
          title: project.foa.title
        };
        setProjectFOA(foaDetails);
      }
      
      // Fetch documents after loading FOA details
      fetchDocuments();
      
    } catch (error: any) {
      console.error('Error in fetchProjectFOA:', error);
      setError(`Failed to load project details: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // Get the project's attachments first
      const { data: project, error: projectError } = await supabase
        .from('research_projects')
        .select('attachments')
        .eq('id', projectId)
        .single();
      
      if (projectError) {
        throw new Error(`Error fetching project attachments: ${projectError.message}`);
      }
      
      if (!project?.attachments) {
        console.log('No attachments found for project');
        setDocuments([]);
        return;
      }
      
      // Get the document IDs from the attachments
      const documentIds = Object.keys(project.attachments);
      
      if (documentIds.length === 0) {
        console.log('No document IDs found in attachments');
        setDocuments([]);
        return;
      }
      
      // Fetch all documents that are referenced in the attachments
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .in('id', documentIds);
      
      if (documentsError) {
        throw new Error(`Error fetching documents: ${documentsError.message}`);
      }
      
      // Store the document data in the attachments state
      const updatedAttachments = { ...project.attachments };
      documentsData?.forEach(doc => {
        if (updatedAttachments[doc.id]) {
          updatedAttachments[doc.id] = {
            ...updatedAttachments[doc.id],
            document: doc
          };
        }
      });
      
      setAttachmentsData(updatedAttachments);
      setDocuments(documentsData || []);
      
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompletion = async (documentId: string) => {
    try {
      setSaving(true);
      
      // Create a copy of current attachments data
      const updatedAttachments = { ...attachmentsData };
      
      // If document exists in attachments and is completed, mark as incomplete
      // Otherwise, mark as completed with current timestamp
      if (updatedAttachments[documentId]?.completed) {
        updatedAttachments[documentId] = {
          ...updatedAttachments[documentId],
          completed: false,
          updatedAt: new Date().toISOString()
        };
      } else {
        updatedAttachments[documentId] = {
          completed: true,
          updatedAt: new Date().toISOString()
        };
      }
      
      console.log('Updating attachment state:', updatedAttachments);
      
      // Update local state immediately for UI responsiveness
      setAttachmentsData(updatedAttachments);
      
      // Save to database
      const { error } = await supabase
        .from('research_projects')
        .update({ attachments: updatedAttachments })
        .eq('id', projectId);
      
      if (error) {
        console.error('Error saving attachment state:', error);
        throw new Error(`Failed to save document status: ${error.message}`);
      }
      
      console.log(`Document ${documentId} status updated successfully`);
      
    } catch (error: any) {
      console.error('Error in handleToggleCompletion:', error);
      setError(`Failed to update document status: ${error.message || 'Unknown error'}`);
      // Revert state change on error
      fetchProjectFOA();
    } finally {
      setSaving(false);
    }
  };

  // Calculate completion percentage
  const calculateCompletionPercentage = () => {
    if (documents.length === 0) return 0;
    
    const completedCount = documents.filter(doc => 
      attachmentsData[doc.id]?.completed
    ).length;
    
    return Math.round((completedCount / documents.length) * 100);
  };
  
  const completionPercentage = calculateCompletionPercentage();

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}
      
      <div>
        <h2 className="text-xl font-medium mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Required Documents
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {documents.filter(doc => attachmentsData[doc.id]?.completed).length} of {documents.length} completed ({completionPercentage}%)
          </span>
        </h2>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-6 text-center border rounded-lg bg-amber-50">
            <AlertCircle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <h3 className="text-lg font-medium text-amber-700 mb-2">No Documents Found</h3>
            <p className="text-sm text-amber-600 mb-4">
              No document requirements found for this funding opportunity.
            </p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <AttachmentsTable 
                documents={documents}
                attachmentsData={attachmentsData}
                projectId={projectId}
                onToggleCompletion={handleToggleCompletion}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 