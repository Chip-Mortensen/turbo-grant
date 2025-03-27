'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface ReconcileAttachmentsProps {
  projectId: string;
}

export function ReconcileAttachments({ projectId }: ReconcileAttachmentsProps) {
  useEffect(() => {
    // Run the reconciliation when the component mounts
    reconcileCompletionStatus();
  }, [projectId]);

  const reconcileCompletionStatus = async () => {
    try {
      const supabase = createClient();
      
      // Get the project with its attachments
      const { data: project, error: projectError } = await supabase
        .from('research_projects')
        .select('attachments')
        .eq('id', projectId)
        .single();
        
      if (projectError || !project?.attachments) {
        console.log('No attachments found or error fetching project:', projectError);
        return;
      }
      
      // Get all completed documents for this project
      const { data: completedDocs, error: docsError } = await supabase
        .from('completed_documents')
        .select('document_id')
        .eq('project_id', projectId);
        
      if (docsError || !completedDocs?.length) {
        console.log('No completed documents found or error fetching:', docsError);
        return;
      }
      
      // Create a set of completed document IDs for easy lookup
      const completedDocIds = new Set(completedDocs.map(doc => doc.document_id));
      
      // Check if any attachments need to be updated
      let updatedAttachments = { ...project.attachments };
      let hasUpdates = false;
      
      // Update completion status where needed
      Object.keys(updatedAttachments).forEach(docId => {
        if (completedDocIds.has(docId) && !updatedAttachments[docId].completed) {
          console.log(`Fixing completion status for document ${docId}`);
          updatedAttachments[docId].completed = true;
          updatedAttachments[docId].updatedAt = new Date().toISOString();
          hasUpdates = true;
        }
      });
      
      // Update the project if needed
      if (hasUpdates) {
        console.log('Updating project with reconciled attachment statuses');
        const { error: updateError } = await supabase
          .from('research_projects')
          .update({ attachments: updatedAttachments })
          .eq('id', projectId);
          
        if (updateError) {
          console.error('Error updating project attachments:', updateError);
        } else {
          console.log('Successfully reconciled attachment statuses');
          // Force a page refresh to show the updated statuses
          window.location.reload();
        }
      } else {
        console.log('No attachment status updates needed');
      }
    } catch (error) {
      console.error('Error reconciling document status:', error);
    }
  };

  // This component doesn't render anything
  return null;
} 