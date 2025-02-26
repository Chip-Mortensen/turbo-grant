import { ContentProcessor, ProcessingResult } from '@/lib/vectorization/base-processor';
import { SupabaseClient } from '@supabase/supabase-js';

export class FOAProcessor extends ContentProcessor {
  private foa: any;
  private supabase: SupabaseClient;

  constructor(foa: any, projectId: string | null, supabase: SupabaseClient) {
    super(projectId);
    this.foa = foa;
    this.supabase = supabase;
  }

  async validate(foa: any): Promise<boolean> {
    console.log('Validating FOA:', foa.id);
    // Basic validation - check if required fields exist
    return !!(foa && foa.id && foa.description);
  }

  async process(foa: any): Promise<ProcessingResult> {
    console.log('Processing FOA:', foa.id);
    console.log('FOA Title:', foa.title);
    console.log('FOA Agency:', foa.agency);
    console.log('FOA Code:', foa.foa_code);
    console.log('FOA Grant Type:', foa.grant_type);
    console.log('FOA Description Length:', foa.description?.length || 0);
    
    // For now, just return a placeholder result
    // In future steps, we'll implement actual processing
    return {
      pineconeIds: [],
      metadata: {
        type: 'foa',
        projectId: this.projectId || undefined,
        foaId: foa.id,
        agency: foa.agency,
        title: foa.title,
        foaCode: foa.foa_code,
        grantType: foa.grant_type,
        deadline: foa.deadline
      }
    };
  }
} 