import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient();
    
    // Get the user data for authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse the request body
    const { documentId, projectId } = await request.json();
    
    if (!documentId || !projectId) {
      return Response.json({ error: 'Document ID and Project ID are required' }, { status: 400 });
    }
    
    // Verify that the document exists and belongs to a project (is custom)
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('project_id')
      .eq('id', documentId)
      .single();
    
    if (documentError) {
      console.error('Error fetching document:', documentError);
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }
    
    // Only allow deletion of custom documents (with project_id)
    if (!document.project_id) {
      return Response.json({ error: 'Only custom documents can be deleted' }, { status: 403 });
    }
    
    // Verify the document belongs to the project
    if (document.project_id !== projectId) {
      return Response.json({ error: 'Document does not belong to this project' }, { status: 403 });
    }
    
    // Get the project's current attachments
    const { data: project, error: projectError } = await supabase
      .from('research_projects')
      .select('attachments')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error('Error fetching project:', projectError);
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Create updated attachments by removing the document
    const updatedAttachments = { ...project.attachments };
    delete updatedAttachments[documentId];
    
    // 1. First, find any completed_documents records for this document
    const { data: completedDocs, error: completedDocsError } = await supabase
      .from('completed_documents')
      .select('id, file_url, file_path')
      .eq('document_id', documentId)
      .eq('project_id', projectId);
    
    if (completedDocsError) {
      console.error('Error finding completed documents:', completedDocsError);
      return Response.json({ error: 'Failed to check completed documents' }, { status: 500 });
    }
    
    console.log(`Found ${completedDocs?.length || 0} completed document records to delete`);
    
    // 2. Delete files from storage if they exist
    if (completedDocs && completedDocs.length > 0) {
      for (const completedDoc of completedDocs) {
        if (completedDoc.file_path) {
          console.log(`Deleting file from storage: ${completedDoc.file_path}`);
          const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([completedDoc.file_path]);
            
          if (storageError) {
            console.warn(`Failed to delete file ${completedDoc.file_path}:`, storageError);
            // Continue with the process even if file deletion fails
          }
        }
      }
    }
    
    // 3. Delete the completed_documents records
    if (completedDocs && completedDocs.length > 0) {
      console.log(`Deleting ${completedDocs.length} completed_documents records`);
      const { error: deleteCompletedError } = await supabase
        .from('completed_documents')
        .delete()
        .eq('document_id', documentId);
      
      if (deleteCompletedError) {
        console.error('Error deleting completed_documents:', deleteCompletedError);
        return Response.json({ error: 'Failed to delete completed documents' }, { status: 500 });
      }
    }
    
    // 4. Update the project's attachments to remove the document
    const { error: updateError } = await supabase
      .from('research_projects')
      .update({ attachments: updatedAttachments })
      .eq('id', projectId);
    
    if (updateError) {
      console.error('Error updating project attachments:', updateError);
      return Response.json({ error: 'Failed to update project attachments' }, { status: 500 });
    }
    
    // 5. Finally, delete the document itself
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
    
    if (deleteError) {
      console.error('Error deleting document:', deleteError);
      // Still try to restore attachments if document deletion fails
      await supabase
        .from('research_projects')
        .update({ attachments: project.attachments })
        .eq('id', projectId);
      
      return Response.json({ error: 'Failed to delete document' }, { status: 500 });
    }
    
    console.log(`Successfully deleted document ${documentId} and all related records`);
    
    // Return success
    return Response.json({ success: true });
    
  } catch (error) {
    console.error('Error in POST /api/documents/custom-document/delete:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
} 