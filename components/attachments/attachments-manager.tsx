'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, FileText, File, CheckSquare, Square, Download, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/utils/supabase/client';
import { Document } from '@/types/documents';
import { format } from 'date-fns';

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

  const getDocumentIcon = (document: Document) => {
    return <FileText className="h-5 w-5" />;
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
        <h2 className="text-xl font-medium mb-4 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          Required Documents Checklist
        </h2>
        
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading documents...</p>
        ) : documents.length === 0 ? (
          <div className="p-6 text-center border rounded-lg bg-amber-50">
            <AlertCircle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <h3 className="text-lg font-medium text-amber-700 mb-2">No Documents Found</h3>
            <p className="text-sm text-amber-600 mb-4">
              No document requirements found for this funding opportunity.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => {
              const attachmentState = attachmentsData[document.id];
              const isCompleted = attachmentState?.completed || false;
              
              return (
                <Card key={document.id} className={isCompleted ? "border-green-500" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex justify-between items-center">
                      <div className="flex items-center">
                        {getDocumentIcon(document)}
                        <span className="ml-2">{document.name}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="ml-2"
                        onClick={() => handleToggleCompletion(document.id)}
                        disabled={saving}
                      >
                        {isCompleted ? (
                          <CheckSquare className="h-5 w-5 text-green-500" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2 pt-0">
                    {isCompleted && attachmentState.updatedAt && (
                      <p className="text-xs text-green-600">
                        Completed on {format(new Date(attachmentState.updatedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                    {(!document.fields?.length && !document.custom_processor) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        This document is for reference only. Online editing is not currently supported.
                      </p>
                    )}
                  </CardContent>
                  <CardFooter>
                    {(document.fields?.length > 0 || document.custom_processor) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          router.push(`/dashboard/${projectId}/attachments/${document.id}`);
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      
      <Separator />
      
      <div>
        <h2 className="text-xl font-medium mb-4">
          Submission Progress
        </h2>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ 
                    width: `${completionPercentage}%`
                  }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {documents.filter(doc => attachmentsData[doc.id]?.completed).length} of {documents.length} documents completed
                </span>
                <span className="text-sm font-medium">
                  {completionPercentage}% Complete
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 