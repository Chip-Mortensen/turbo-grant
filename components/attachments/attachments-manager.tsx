'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, FileText, File, CheckSquare, Square, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/utils/supabase/client';
import { Document } from '@/types/documents';

interface AttachmentsManagerProps {
  projectId: string;
}

export function AttachmentsManager({ projectId }: AttachmentsManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch documents from the document table
      const { data, error } = await supabase
        .from('documents')
        .select('*');
      
      if (error) {
        throw new Error('Failed to fetch documents');
      }
      
      setDocuments(data || []);
      
      // Fetch completion status for these documents from the attachments table
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('attachments')
        .select('document_id')
        .eq('project_id', projectId);
      
      if (!attachmentsError && attachmentsData) {
        const completionMap: Record<string, boolean> = {};
        attachmentsData.forEach(attachment => {
          if (attachment.document_id) {
            completionMap[attachment.document_id] = true;
          }
        });
        setCompleted(completionMap);
      }
      
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompletion = async (documentId: string) => {
    const newCompletionStatus = !completed[documentId];
    
    try {
      if (newCompletionStatus) {
        // Mark as completed - add to attachments
        const { error } = await supabase
          .from('attachments')
          .insert({
            project_id: projectId,
            document_id: documentId,
            status: 'completed',
            created_at: new Date().toISOString()
          });
          
        if (error) throw error;
      } else {
        // Mark as not completed - remove from attachments
        const { error } = await supabase
          .from('attachments')
          .delete()
          .eq('project_id', projectId)
          .eq('document_id', documentId);
          
        if (error) throw error;
      }
      
      // Update local state
      setCompleted(prev => ({
        ...prev,
        [documentId]: newCompletionStatus
      }));
      
    } catch (error) {
      console.error('Error updating completion status:', error);
      setError('Failed to update completion status. Please try again.');
    }
  };

  const getDocumentIcon = (document: Document) => {
    return <FileText className="h-5 w-5" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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
          <p className="text-center py-8 text-muted-foreground">No documents found for this funding opportunity.</p>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => (
              <Card key={document.id} className={completed[document.id] ? "border-green-500" : ""}>
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
                    >
                      {completed[document.id] ? (
                        <CheckSquare className="h-5 w-5 text-green-500" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Agency:</span> {document.agency}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Grant Types:</span> {document.grant_types.join(', ')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Last Updated:</span> {formatDate(document.updated_at)}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    asChild
                  >
                    <a href={`/documents/${document.id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </a>
                  </Button>
                  {completed[document.id] && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 text-green-500 border-green-500"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
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
                    width: `${documents.length > 0 
                      ? (Object.keys(completed).length / documents.length) * 100 
                      : 0}%` 
                  }}
                ></div>
              </div>
              
              <p className="text-center text-sm text-muted-foreground">
                {Object.keys(completed).length} of {documents.length} documents completed
              </p>
              
              {documents.length > 0 && Object.keys(completed).length === documents.length && (
                <div className="p-4 text-sm text-green-700 bg-green-100 rounded-lg text-center">
                  All documents are completed! You're ready to submit your proposal.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 