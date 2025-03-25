import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get the user data for authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, find any completed_documents records for this document
    const { data: completedDocs, error: completedDocsError } = await supabase
      .from('completed_documents')
      .select('id, file_url, file_path')
      .eq('document_id', id);

    if (completedDocsError) {
      console.error('Error finding completed documents:', completedDocsError);
      return Response.json({ error: 'Failed to check completed documents' }, { status: 500 });
    }

    // Delete files from storage if they exist
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

    // Delete the completed_documents records
    const { error: deleteError } = await supabase
      .from('completed_documents')
      .delete()
      .eq('document_id', id)
      .select();

    if (deleteError) {
      console.error('Error deleting completed documents:', deleteError);
      return Response.json({ error: 'Failed to delete completed documents' }, { status: 500 });
    }

    // Verify deletion
    const { data: verifyDocs, error: verifyError } = await supabase
      .from('completed_documents')
      .select('id')
      .eq('document_id', id);

    if (verifyError) {
      console.error('Error verifying deletion:', verifyError);
      return Response.json({ error: 'Failed to verify deletion' }, { status: 500 });
    }

    if (verifyDocs && verifyDocs.length > 0) {
      console.error('Some completed documents still exist after deletion');
      return Response.json({ error: 'Failed to delete all completed documents' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/documents/[id]/completed:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
} 