import { SupabaseClient } from '@supabase/supabase-js';
import { Document } from '@/types/documents';
import { GeneralDocumentProcessor } from './processors/general-document-processor';
import { ProjectDescriptionProcessor } from './processors/project-description-processor';
import { GenerationResult } from './types';

/**
 * Centralized service for generating document content.
 * Handles both custom processors and general documents.
 */
export async function generateDocumentContent(
  supabase: SupabaseClient,
  documentId: string,
  projectId: string
): Promise<GenerationResult> {
  try {
    // Fetch document and project data in parallel
    const [{ data: document, error: docError }, { data: project, error: projError }] = await Promise.all([
      supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single(),
      supabase
        .from('research_projects')
        .select('*')
        .eq('id', projectId)
        .single()
    ]);

    if (docError) throw new Error(`Failed to fetch document: ${docError.message}`);
    if (projError) throw new Error(`Failed to fetch project: ${projError.message}`);
    if (!document) throw new Error('Document not found');
    if (!project) throw new Error('Project not found');

    // Get the FOA ID if available
    const foaId = project.foa || undefined;

    // Create appropriate processor based on document type, passing FOA ID if available
    const processor = document.custom_processor === 'project-description'
      ? new ProjectDescriptionProcessor({ projectId, supabase, foaId })
      : new GeneralDocumentProcessor({ projectId, supabase, foaId });

    // Get answers from attachments if they exist
    const { data: answers } = await supabase
      .from('document_fields')
      .select('*')
      .eq('document_id', documentId);

    // Process document with all context (including FOA if available)
    return await processor.process(document, answers || []);
  } catch (error) {
    console.error('Error in document generation:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Failed to generate document content'
    };
  }
} 