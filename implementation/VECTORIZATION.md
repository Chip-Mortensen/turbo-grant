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

### Research Descriptions

- PDF (application/pdf)
- DOCX (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
- TXT (text/plain)
- Max size: 10MB
- Processing:
  - Extract text based on file type
  - Split into chunks (~1000 tokens)
  - Generate embeddings per chunk
  - Store with metadata (filename, type, page numbers)

### Scientific Figures

- PNG (image/png)
- JPG/JPEG (image/jpeg)
- Max size: 5MB
- Processing:
  - Generate description using gpt-4o-mini
  - Combine with user caption
  - Generate single embedding
  - Store with metadata (caption, description)

### Chalk Talks

- Video: MP4 (video/mp4)
- Audio: MP3 (audio/mpeg)
- Max size: 100MB
- Processing:
  - Generate transcription in chunks
  - Store in `chalk_talk_transcripts` bucket
  - Split transcript into chunks (~1000 tokens)
  - Generate embeddings per chunk
  - Store with metadata (duration, timestamps)

### Researcher Profiles

- Content: name, title, institution, biography
- Processing:
  - Combine fields into single text
  - Generate single embedding
  - Process immediately on create/update

## 2. Database Schema

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Content status tracking
ALTER TABLE public.written_descriptions
ADD COLUMN vectorization_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (vectorization_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN vectorization_error TEXT,
ADD COLUMN last_vectorized_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.scientific_figures
ADD COLUMN vectorization_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (vectorization_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN vectorization_error TEXT,
ADD COLUMN last_vectorized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN ai_description TEXT,
ADD COLUMN ai_description_model TEXT;

ALTER TABLE public.chalk_talks
ADD COLUMN transcription_path TEXT,
ADD COLUMN transcription_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (transcription_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN transcription_error TEXT,
ADD COLUMN vectorization_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (vectorization_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN vectorization_error TEXT,
ADD COLUMN last_vectorized_at TIMESTAMP WITH TIME ZONE,
DROP COLUMN transcription;

ALTER TABLE public.researcher_profiles
ADD COLUMN vectorization_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (vectorization_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN vectorization_error TEXT,
ADD COLUMN last_vectorized_at TIMESTAMP WITH TIME ZONE;

-- Embeddings storage
CREATE TABLE public.content_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type TEXT NOT NULL CHECK (content_type IN ('description', 'figure', 'chalk_talk', 'researcher')),
    content_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
    embedding vector(3072) NOT NULL,
    metadata JSONB NOT NULL,
    chunk_index INTEGER,
    chunk_total INTEGER,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'error'))
);

-- Efficient search index
CREATE INDEX ON content_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

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

-- Queue indexes
CREATE INDEX ON processing_queue (status, priority);
CREATE INDEX ON processing_queue (content_type, project_id);
```

## 3. Processing Implementation

### Base Processor

```typescript
abstract class ContentProcessor {
  abstract validate(content: any): Promise<boolean>;
  abstract process(content: any): Promise<ProcessingResult>;
  abstract generateEmbeddings(text: string): Promise<number[]>;
}
```

### Description Processor

```typescript
class DescriptionProcessor extends ContentProcessor {
  async process(file: File): Promise<ProcessingResult> {
    const text = await this.extractText(file);
    const chunks = this.splitIntoChunks(text);
    const embeddings = await Promise.all(chunks.map((chunk) => this.generateEmbeddings(chunk)));
    return { embeddings, chunks, metadata: this.extractMetadata(file) };
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
    return {
      embeddings: [embedding],
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

    return { embeddings, chunks: textChunks, metadata: this.getMediaMetadata(media) };
  }
}
```

### Researcher Processor

```typescript
class ResearcherProcessor extends ContentProcessor {
  async process(data: ResearcherProfile): Promise<ProcessingResult> {
    const text = this.combineProfileData(data);
    const embedding = await this.generateEmbeddings(text);
    return {
      embeddings: [embedding],
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

```sql
CREATE OR REPLACE FUNCTION search_content(
    query_embedding vector(3072),
    project_id UUID,
    content_type TEXT[] DEFAULT ARRAY['description', 'figure', 'chalk_talk', 'researcher'],
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INTEGER DEFAULT 10
) RETURNS TABLE (
    content_id UUID,
    content_type TEXT,
    similarity FLOAT,
    metadata JSONB,
    chunk_index INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.content_id,
        ce.content_type,
        1 - (ce.embedding <=> query_embedding) as similarity,
        ce.metadata,
        ce.chunk_index
    FROM content_embeddings ce
    WHERE ce.project_id = project_id
    AND ce.content_type = ANY(content_type)
    AND ce.status = 'completed'
    AND 1 - (ce.embedding <=> query_embedding) > similarity_threshold
    ORDER BY similarity DESC
    LIMIT max_results;
END;
$$;
```

## Implementation Order

1. Database Setup

   - Create tables
   - Add indexes
   - Enable pgvector

2. Content Processors

   - Base processor implementation
   - Description processor
   - Figure processor with gpt-4o-mini
   - Chalk talk processor
   - Researcher processor

3. Processing Queue

   - Queue table
   - Status tracking
   - Error handling
   - Retry logic

4. Search Implementation
   - Vector search function
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
   - Maintain embedding history
