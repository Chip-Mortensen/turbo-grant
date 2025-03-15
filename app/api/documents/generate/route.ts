import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateDocumentContent } from '@/lib/project-document-processing/generation-service';

export async function POST(request: Request) {
  try {
    const { documentId, projectId } = await request.json();
    const supabase = await createClient();

    // Check if we already have content for this document
    const { data: existingContent, error: fetchError } = await supabase
      .from('completed_documents')
      .select('content, id')
      .eq('document_id', documentId)
      .eq('project_id', projectId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing content:', fetchError);
    }

    if (existingContent) {
      console.log('Found existing content, returning it');
      return NextResponse.json({ content: existingContent.content });
    }

    // Double-check to avoid race conditions
    const { count, error: countError } = await supabase
      .from('completed_documents')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId)
      .eq('project_id', projectId);
      
    if (countError) {
      console.error('Error checking for existing document:', countError);
    }
    
    if (count && count > 0) {
      // Document was created between our first check and now (race condition)
      const { data: latestContent } = await supabase
        .from('completed_documents')
        .select('content')
        .eq('document_id', documentId)
        .eq('project_id', projectId)
        .single();
        
      if (latestContent) {
        console.log('Document was created in a parallel request, returning content');
        return NextResponse.json({ content: latestContent.content });
      }
    }

    // Generate new content
    console.log(`Generating content for document ${documentId} in project ${projectId}`);
    const result = await generateDocumentContent(supabase, documentId, projectId);
    
    if (result.error) {
      throw new Error(result.error);
    }

    // Try to save the generated content
    try {
      const { error: saveError } = await supabase
        .from('completed_documents')
        .insert({
          document_id: documentId,
          project_id: projectId,
          content: result.content,
          created_at: new Date().toISOString()
        });

      if (saveError) {
        // If it's a duplicate key error, the document was created by another request
        if (saveError.code === '23505') {
          console.log('Document was created by another request, fetching content');
          const { data: parallelContent } = await supabase
            .from('completed_documents')
            .select('content')
            .eq('document_id', documentId)
            .eq('project_id', projectId)
            .single();
            
          if (parallelContent) {
            return NextResponse.json({ content: parallelContent.content });
          }
        } else {
          throw saveError;
        }
      }
    } catch (insertError) {
      console.error('Error inserting document:', insertError);
      
      // Final fallback - check if document exists despite the error
      const { data: finalCheck } = await supabase
        .from('completed_documents')
        .select('content')
        .eq('document_id', documentId)
        .eq('project_id', projectId)
        .maybeSingle();
        
      if (finalCheck) {
        console.log('Document exists despite error, returning content');
        return NextResponse.json({ content: finalCheck.content });
      }
      
      throw insertError;
    }

    console.log(`Successfully generated and saved content for document ${documentId}`);
    return NextResponse.json({ content: result.content });
  } catch (error) {
    console.error('Error in document generation route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate document' },
      { status: 500 }
    );
  }
} 