import { MatchResult } from '@/lib/vectorization/types';
import { Document, DocumentField } from '@/types/documents';
import { SupabaseClient } from '@supabase/supabase-js';

export interface DocumentContext {
  researchDescriptions: string;
  scientificFigures: string;
  chalkTalks: string;
  foaContent?: string;
}

export interface GenerationResult {
  content: string;
  error?: string;
}

export interface ProcessorConfig {
  projectId: string;
  supabase: SupabaseClient;
  foaId?: string;
}

export interface GenerationContext {
  document: Document;
  answers?: DocumentField[];
  context: DocumentContext;
} 