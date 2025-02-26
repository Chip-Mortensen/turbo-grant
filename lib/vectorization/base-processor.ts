import { generateEmbeddings } from './openai';
import { getPineconeClient } from './pinecone';
import { randomUUID } from 'crypto';

export interface ProcessingResult {
  pineconeIds: string[];
  chunks?: string[];
  metadata: Record<string, any>;
}

export interface ProcessingMetadata {
  projectId?: string;
  type: 'research_description' | 'scientific_figure' | 'chalk_talk' | 'foa';
  [key: string]: any;
}

export abstract class ContentProcessor {
  protected projectId: string | null;

  constructor(projectId: string | null) {
    this.projectId = projectId;
  }

  abstract validate(content: any): Promise<boolean>;
  abstract process(content: any): Promise<ProcessingResult>;

  protected async generateEmbeddings(text: string): Promise<number[]> {
    return generateEmbeddings(text);
  }

  protected async storePineconeVector(
    vector: number[],
    metadata: ProcessingMetadata
  ): Promise<string> {
    const client = await getPineconeClient();
    const index = client.index(process.env.PINECONE_INDEX_NAME!);
    
    // Add common metadata
    const enrichedMetadata = {
      ...metadata,
      // Only include projectId if it's not null
      ...(this.projectId !== null ? { projectId: this.projectId } : {})
    };

    // Generate an ID using Node's crypto module
    const id = randomUUID();

    // Upsert the vector
    await index.upsert([{
      id,
      values: vector,
      metadata: enrichedMetadata,
    }]);

    return id;
  }

  protected splitIntoChunks(text: string, maxTokens: number = 1000): string[] {
    // Simple splitting by sentences and combining into chunks
    // In a production environment, you'd want a more sophisticated tokenizer
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      // Rough estimation: 1 token ≈ 4 characters
      if ((currentChunk.length + sentence.length) / 4 > maxTokens) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
      }
      currentChunk += sentence + ' ';
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
} 