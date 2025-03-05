import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateDocumentContent } from '@/lib/project-document-processing/generation-service';

export async function POST(request: Request) {
  try {
    const { documentId, projectId } = await request.json();
    const supabase = await createClient();

    // Check if we already have content for this document
    const { data: existingContent } = await supabase
      .from('completed_documents')
      .select('content')
      .eq('document_id', documentId)
      .eq('project_id', projectId)
      .single();

    if (existingContent) {
      return NextResponse.json({ content: existingContent.content });
    }

    // Generate new content
    const result = await generateDocumentContent(supabase, documentId, projectId);
    
    if (result.error) {
      throw new Error(result.error);
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
      throw saveError;
    }

    return NextResponse.json({ content: result.content });
  } catch (error) {
    console.error('Error in document generation route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate document' },
      { status: 500 }
    );
  }
} 