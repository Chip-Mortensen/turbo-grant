import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateDocumentContent } from '@/lib/project-document-processing/generation-service';

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Start the generation process in the background
    processAttachmentsInBackground(projectId);
    
    return NextResponse.json({
      message: 'Attachment generation started in background',
      status: 'success'
    });
  } catch (error) {
    console.error('Error in generate-all attachments route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start attachment generation' },
      { status: 500 }
    );
  }
}

async function processAttachmentsInBackground(projectId: string) {
  try {
    console.log(`Starting background attachment generation for project ${projectId}`);
    const supabase = await createClient();
    
    // Get the project's attachments
    const { data: project, error: projectError } = await supabase
      .from('research_projects')
      .select('attachments')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project?.attachments) {
      console.error('Error fetching project attachments:', projectError);
      return;
    }
    
    // Get all document IDs from the attachments
    const documentIds = Object.keys(project.attachments);
    
    if (documentIds.length === 0) {
      console.log('No attachments found for project');
      return;
    }
    
    console.log(`Found ${documentIds.length} attachments to generate`);
    
    // Create a copy of the attachments to update
    let updatedAttachments = { ...project.attachments };
    let hasUpdates = false;
    
    // Process each document sequentially to avoid rate limits
    for (const documentId of documentIds) {
      try {
        console.log(`Generating content for document ${documentId}`);
        
        // Check if content already exists
        const { data: existingContent } = await supabase
          .from('completed_documents')
          .select('id')
          .eq('document_id', documentId)
          .eq('project_id', projectId)
          .maybeSingle();
        
        if (existingContent) {
          console.log(`Content already exists for document ${documentId}, marking as completed`);
          
          // Mark as completed if not already
          if (!updatedAttachments[documentId]?.completed) {
            updatedAttachments[documentId] = {
              ...updatedAttachments[documentId],
              completed: true,
              updatedAt: new Date().toISOString()
            };
            hasUpdates = true;
          }
          
          continue;
        }
        
        // Generate content
        const result = await generateDocumentContent(supabase, documentId, projectId);
        
        if (result.error) {
          console.error(`Error generating content for document ${documentId}:`, result.error);
          continue;
        }
        
        // Save the generated content
        const { error: saveError } = await supabase
          .from('completed_documents')
          .insert({
            document_id: documentId,
            project_id: projectId,
            content: result.content
          });
        
        if (saveError) {
          console.error(`Error saving content for document ${documentId}:`, saveError);
          continue;
        }
        
        console.log(`Successfully generated and saved content for document ${documentId}`);
        
        // Mark the attachment as completed
        updatedAttachments[documentId] = {
          ...updatedAttachments[documentId],
          completed: true,
          updatedAt: new Date().toISOString()
        };
        hasUpdates = true;
        
        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (docError) {
        console.error(`Error processing document ${documentId}:`, docError);
        // Continue with the next document
      }
    }
    
    // Update the project's attachments if there were changes
    if (hasUpdates) {
      console.log('Updating project attachments with completion status');
      const { error: updateError } = await supabase
        .from('research_projects')
        .update({ attachments: updatedAttachments })
        .eq('id', projectId);
      
      if (updateError) {
        console.error('Error updating project attachments:', updateError);
      } else {
        console.log('Successfully updated project attachments');
      }
    }
    
    console.log(`Completed background attachment generation for project ${projectId}`);
  } catch (error) {
    console.error('Error in background attachment generation:', error);
  }
} 