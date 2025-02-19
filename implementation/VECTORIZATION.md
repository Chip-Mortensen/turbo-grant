# Vectorization Plan for TurboGrant

## 1. Content Types & Models

### AI Models

```typescript
const AI_MODELS = {
  imageDescription: {
    name: 'gpt-4o-mini',
    version: '1.0',
    contextWindow: 2048,
    maxBatchSize: 5,
  },
  embeddings: {
    name: 'text-embedding-3-large',
    version: '1.0',
    dimensions: 3072,
    maxBatchSize: 100,
  },
};
```

### Environment Setup

Required environment variables:

```bash
# OpenAI API (for embeddings and image description)
OPENAI_API_KEY=sk-...

# Pinecone Vector Database
PINECONE_API_KEY=your-api-key
PINECONE_ENVIRONMENT=your-environment  # e.g., "gcp-starter", "us-west1-gcp"
PINECONE_INDEX_NAME=turbo-grant       # name of your Pinecone index
```

Note: The Pinecone index should be created with dimension=3072 to match the OpenAI text-embedding-3-large model.

### Research Descriptions

- PDF (application/pdf)
- DOCX (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
- TXT (text/plain)
- Max size: 10MB
- Processing:
  - Extract text based on file type
  - Split into chunks (~1000 tokens)
  - Generate embeddings per chunk
  - Store in Pinecone with metadata (filename, type, page numbers)

### Scientific Figures

- PNG (image/png)
- JPG/JPEG (image/jpeg)
- Max size: 5MB
- Processing:
  - Generate description using gpt-4o-mini
  - Combine with user caption
  - Generate single embedding
  - Store in Pinecone with metadata (caption, description)

### Chalk Talks

- Video: MP4 (video/mp4)
- Audio: MP3 (audio/mpeg)
- Max size: 100MB
- Processing:
  - Generate transcription in chunks
  - Store in `chalk_talk_transcripts` bucket
  - Split transcript into chunks (~1000 tokens)
  - Generate embeddings per chunk
  - Store in Pinecone with metadata (duration, timestamps)

### Researcher Profiles

- Content: name, title, institution, biography
- Processing:
  - Combine fields into single text
  - Generate single embedding
  - Store in Pinecone with metadata
  - Process immediately on create/update

## 2. Database Schema

```sql
-- Content status tracking
ALTER TABLE public.written_descriptions
ADD COLUMN vectorization_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (vectorization_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN vectorization_error TEXT,
ADD COLUMN last_vectorized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN pinecone_id TEXT;

ALTER TABLE public.scientific_figures
ADD COLUMN vectorization_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (vectorization_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN vectorization_error TEXT,
ADD COLUMN last_vectorized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN ai_description TEXT,
ADD COLUMN ai_description_model TEXT,
ADD COLUMN pinecone_id TEXT;

ALTER TABLE public.chalk_talks
ADD COLUMN transcription_path TEXT,
ADD COLUMN transcription_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (transcription_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN transcription_error TEXT,
ADD COLUMN vectorization_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (vectorization_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN vectorization_error TEXT,
ADD COLUMN last_vectorized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN pinecone_id TEXT;

ALTER TABLE public.researcher_profiles
ADD COLUMN vectorization_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (vectorization_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN vectorization_error TEXT,
ADD COLUMN last_vectorized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN pinecone_id TEXT;

-- Processing queue
CREATE TABLE public.processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type TEXT NOT NULL CHECK (content_type IN ('description', 'figure', 'chalk_talk', 'researcher')),
    content_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    chunk_start INTEGER,
    chunk_end INTEGER
);
```

## 3. Processing Implementation

### Base Processor

```typescript
abstract class ContentProcessor {
  abstract validate(content: any): Promise<boolean>;
  abstract process(content: any): Promise<ProcessingResult>;
  abstract generateEmbeddings(text: string): Promise<number[]>;
  abstract storePineconeVector(vector: number[], metadata: any): Promise<string>;
}
```

### Description Processor

```typescript
class DescriptionProcessor extends ContentProcessor {
  async process(file: File): Promise<ProcessingResult> {
    const text = await this.extractText(file);
    const chunks = this.splitIntoChunks(text);
    const embeddings = await Promise.all(chunks.map((chunk) => this.generateEmbeddings(chunk)));
    const pineconeIds = await Promise.all(
      embeddings.map((embedding, index) =>
        this.storePineconeVector(embedding, {
          type: 'description',
          chunk: index + 1,
          total_chunks: chunks.length,
          metadata: this.extractMetadata(file),
        })
      )
    );
    return { pineconeIds, chunks, metadata: this.extractMetadata(file) };
  }

  private async extractText(file: File): Promise<string> {
    switch (file.type) {
      case 'application/pdf':
        return this.extractPdfText(file);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.extractDocxText(file);
      case 'text/plain':
        return this.extractTxtText(file);
      default:
        throw new Error('Unsupported file type');
    }
  }
}
```

### Figure Processor

```typescript
class FigureProcessor extends ContentProcessor {
  async process(figure: { file: File; caption?: string }): Promise<ProcessingResult> {
    const description = await this.generateDescription(figure.file);
    const text = this.combineText(description, figure.caption);
    const embedding = await this.generateEmbeddings(text);
    const pineconeId = await this.storePineconeVector(embedding, {
      type: 'figure',
      metadata: {
        description,
        caption: figure.caption,
        model: 'gpt-4o-mini',
      },
    });
    return {
      pineconeId,
      metadata: {
        description,
        caption: figure.caption,
        model: 'gpt-4o-mini',
      },
    };
  }
}
```

### Chalk Talk Processor

```typescript
class ChalkTalkProcessor extends ContentProcessor {
  async process(media: File): Promise<ProcessingResult> {
    const chunks = await this.splitMediaIntoChunks(media);
    const transcriptions = await Promise.all(chunks.map((chunk) => this.transcribeChunk(chunk)));

    const text = transcriptions.join(' ');
    const textChunks = this.splitIntoChunks(text);
    const embeddings = await Promise.all(textChunks.map((chunk) => this.generateEmbeddings(chunk)));
    const pineconeIds = await Promise.all(
      embeddings.map((embedding, index) =>
        this.storePineconeVector(embedding, {
          type: 'chalk_talk',
          chunk: index + 1,
          total_chunks: textChunks.length,
          metadata: this.getMediaMetadata(media),
        })
      )
    );

    return { pineconeIds, chunks: textChunks, metadata: this.getMediaMetadata(media) };
  }
}
```

### Researcher Processor

```typescript
class ResearcherProcessor extends ContentProcessor {
  async process(data: ResearcherProfile): Promise<ProcessingResult> {
    const text = this.combineProfileData(data);
    const embedding = await this.generateEmbeddings(text);
    const pineconeId = await this.storePineconeVector(embedding, {
      type: 'researcher',
      metadata: {
        name: data.name,
        title: data.title,
        institution: data.institution,
      },
    });
    return {
      pineconeId,
      metadata: {
        name: data.name,
        title: data.title,
        institution: data.institution,
      },
    };
  }
}
```

## 4. Search Implementation

```typescript
interface SearchOptions {
  projectId: string;
  contentTypes?: ('description' | 'figure' | 'chalk_talk' | 'researcher')[];
  similarityThreshold?: number;
  maxResults?: number;
}

async function searchContent(query: string, options: SearchOptions) {
  // Generate embedding for search query
  const embedding = await generateEmbeddings(query);

  // Search Pinecone with filters
  const results = await pineconeClient.query({
    vector: embedding,
    filter: {
      projectId: options.projectId,
      type: { $in: options.contentTypes || ['description', 'figure', 'chalk_talk', 'researcher'] },
    },
    topK: options.maxResults || 10,
    includeMetadata: true,
  });

  // Filter by similarity threshold if specified
  const filteredResults = options.similarityThreshold ? results.matches.filter((match) => match.score >= options.similarityThreshold) : results.matches;

  // Format and return results
  return filteredResults.map((match) => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata,
  }));
}
```

## Implementation Order

1. Database Setup

   - Add status tracking columns
   - Create processing queue
   - Set up RLS policies

2. Pinecone Setup

   - Create index with appropriate dimensions
   - Configure metadata schema
   - Set up API access

3. Content Processors

   - Base processor implementation
   - Description processor
   - Figure processor with gpt-4o-mini
   - Chalk talk processor
   - Researcher processor

4. Processing Queue

   - Queue table
   - Status tracking
   - Error handling
   - Retry logic

5. Search Implementation
   - Pinecone query interface
   - Content type filtering
   - Similarity thresholds

## Error Handling

1. File Processing

   - Validate file types and sizes
   - Track failed attempts
   - Implement retries

2. Partial Success

   - Track chunk progress
   - Allow resuming from last successful chunk
   - Store partial results when possible

3. Content Updates
   - Track versions
   - Re-process only modified content
   - Maintain Pinecone vector history
