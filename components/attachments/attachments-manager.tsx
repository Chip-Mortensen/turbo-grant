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
  attachmentUrl?: string;
  document?: Document; // Added document field to store complete document info
}

type AttachmentsData = Record<string, AttachmentState>;

interface AttachmentsManagerProps {
  projectId: string;
}

// Define filter type
interface FOAFilters {
  agency?: string;
  grantType?: string;
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
  const [filterApplied, setFilterApplied] = useState(false);
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
      
      if (!project?.foa) {
        console.log('Project has no associated FOA, showing all documents');
        setProjectFOA({});
        fetchDocuments({}, false);
        return;
      }
      
      // FOA data should already be included in the join
      const foaDetails = {
        id: project.foa.id,
        agency: project.foa.agency,
        grantType: project.foa.grant_type,
        title: project.foa.title
      };
      
      console.log('Found FOA details:', foaDetails);
      setProjectFOA(foaDetails);
      fetchDocuments(foaDetails, true);
      
    } catch (error: any) {
      console.error('Error in fetchProjectFOA:', error);
      setError(`Failed to load project details: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  // Filter documents based on FOA criteria
  const filterDocuments = (docs: Document[], filters: FOAFilters, applyFilter: boolean = true) => {
    if (!applyFilter) return docs;
    
    return docs.filter(doc => {
      return (!filters.agency || !doc.agency || doc.agency === filters.agency) &&
             (!filters.grantType || !doc.grant_types || 
              doc.grant_types.length === 0 || 
              doc.grant_types.includes(filters.grantType));
    });
  };

  const fetchDocuments = async (foaDetails: FOAFilters, applyFilter: boolean = true) => {
    try {
      setLoading(true);
      setFilterApplied(applyFilter);
      
      console.log('Fetching documents with filters:', foaDetails, 'Apply filter:', applyFilter);
      
      // If we have attachments with document data, use that data first
      const storedDocuments: Document[] = [];
      
      for (const [docId, attachment] of Object.entries(attachmentsData)) {
        if (attachment.document) {
          storedDocuments.push(attachment.document);
        }
      }
      
      console.log('Documents from attachments data:', storedDocuments.length);
      
      // If we have stored documents, use them
      if (storedDocuments.length > 0) {
        let filteredDocuments = filterDocuments(storedDocuments, foaDetails, applyFilter);
        
        // If no documents match the filter criteria, show all documents
        if (filteredDocuments.length === 0 && applyFilter) {
          console.log('No documents match filter criteria, showing all documents');
          filteredDocuments = storedDocuments;
          setFilterApplied(false);
        }
        
        setDocuments(filteredDocuments);
        setLoading(false);
        return;
      }
      
      // If no stored documents, fetch from the documents table
      const query = supabase.from('documents').select('*');
      
      // Apply database filters directly to the query when possible
      if (applyFilter) {
        if (foaDetails.agency) {
          query.eq('agency', foaDetails.agency);
        }
        
        // Note: We can't filter by grant_types at the database level because it's an array
        // That filtering will still be done on the client side
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Error fetching documents: ${error.message}`);
      }
      
      let filteredData = data || [];
      
      // Apply grant_type filtering on the client side
      if (applyFilter && foaDetails.grantType) {
        filteredData = filterDocuments(filteredData, { grantType: foaDetails.grantType });
      }
      
      // If no documents match the filter criteria, show all documents
      if (filteredData.length === 0 && applyFilter) {
        console.log('No documents match filter criteria, showing all documents from DB');
        const { data: allData } = await supabase.from('documents').select('*');
        filteredData = allData || [];
        setFilterApplied(false);
      }
      
      setDocuments(filteredData);
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
          updatedAt: new Date().toISOString(),
          attachmentUrl: updatedAttachments[documentId]?.attachmentUrl
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

  // Function to show all documents (remove filter)
  const handleShowAllDocuments = () => {
    fetchDocuments({}, false);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Display FOA details if available */}
      {(projectFOA.agency || projectFOA.grantType || projectFOA.title) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <FileText className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-blue-700">Funding Opportunity Details</h3>
          </div>
          <div className="space-y-1 text-sm">
            {projectFOA.title && (
              <div className="flex items-start mb-2">
                <span className="font-medium text-blue-800 w-24">Title:</span>
                <span className="text-blue-700 flex-1">{projectFOA.title}</span>
              </div>
            )}
            {projectFOA.agency && (
              <div className="flex items-center">
                <span className="font-medium text-blue-800 w-24">Agency:</span>
                <span className="text-blue-700">{projectFOA.agency}</span>
              </div>
            )}
            {projectFOA.grantType && (
              <div className="flex items-center">
                <span className="font-medium text-blue-800 w-24">Grant Type:</span>
                <span className="text-blue-700">{projectFOA.grantType}</span>
              </div>
            )}
            {filterApplied ? (
              <p className="text-blue-600 mt-2 text-xs">
                Documents are filtered based on these criteria. 
                <Button 
                  variant="link" 
                  className="text-xs p-0 h-auto ml-1" 
                  onClick={handleShowAllDocuments}
                >
                  Show all documents
                </Button>
              </p>
            ) : (
              <p className="text-blue-600 mt-2 text-xs">
                Showing all documents. Filters are disabled.
              </p>
            )}
          </div>
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
            <Button onClick={handleShowAllDocuments} variant="outline">
              Show All Available Documents
            </Button>
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
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        // Navigate to document details page using document ID
                        router.push(`/dashboard/${projectId}/attachments/${document.id}`);
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {attachmentState?.attachmentUrl && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        asChild
                      >
                        <a href={attachmentState.attachmentUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
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
      
      {/* Debug section - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 border rounded bg-gray-50">
          <h3 className="text-sm font-bold mb-2">Debug Info:</h3>
          <details>
            <summary className="text-xs cursor-pointer">FOA Details</summary>
            <pre className="text-xs mt-2 overflow-auto max-h-60">
              {JSON.stringify(projectFOA, null, 2)}
            </pre>
          </details>
          <details className="mt-2">
            <summary className="text-xs cursor-pointer">Documents</summary>
            <pre className="text-xs mt-2 overflow-auto max-h-60">
              {JSON.stringify(documents, null, 2)}
            </pre>
          </details>
          <details className="mt-2">
            <summary className="text-xs cursor-pointer">Attachments Data Structure</summary>
            <pre className="text-xs mt-2 overflow-auto max-h-60">
              {JSON.stringify(attachmentsData, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
} 