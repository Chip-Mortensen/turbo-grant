'use client';

import { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, AlertCircle, Check, Loader2, FileDigit, ChevronDown, ChevronUp, X, Plus } from 'lucide-react';

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ["application/pdf"];
const ALLOWED_FILE_EXTENSIONS = [".pdf"];

interface PageInfo {
  pageNumber: number;
  startIndex: number;
  endIndex: number;
}

interface TextChunk {
  text: string;
  pageNumbers: number[];
  index: number;
}

interface MetadataItem {
  key: string;
  value: string;
}

export default function UploadDocument() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [pageInfo, setPageInfo] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [vectorizing, setVectorizing] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<MetadataItem[]>([{ key: '', value: '' }]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to determine which page a character index belongs to
  const getPageForIndex = (index: number): number => {
    for (const page of pageInfo) {
      if (index >= page.startIndex && index <= page.endIndex) {
        return page.pageNumber;
      }
    }
    return 1; // Default to page 1 if not found
  };

  // Function to get all page numbers for a chunk
  const getPageNumbersForChunk = (chunkStartIndex: number, chunkEndIndex: number): number[] => {
    const pageNumbers: Set<number> = new Set();
    const overlappingPages: { pageNumber: number; reason: string }[] = [];
    
    for (const page of pageInfo) {
      // Check if this page overlaps with the chunk
      const chunkStartsInPage = chunkStartIndex >= page.startIndex && chunkStartIndex <= page.endIndex;
      const chunkEndsInPage = chunkEndIndex >= page.startIndex && chunkEndIndex <= page.endIndex;
      const chunkContainsPage = chunkStartIndex <= page.startIndex && chunkEndIndex >= page.endIndex;
      
      if (chunkStartsInPage || chunkEndsInPage || chunkContainsPage) {
        pageNumbers.add(page.pageNumber);
        
        // Track why this page was included for debugging
        let reason = '';
        if (chunkStartsInPage) reason += 'starts in page, ';
        if (chunkEndsInPage) reason += 'ends in page, ';
        if (chunkContainsPage) reason += 'contains page, ';
        
        overlappingPages.push({
          pageNumber: page.pageNumber,
          reason: reason.slice(0, -2) // Remove trailing comma and space
        });
      }
    }
    
    const result = Array.from(pageNumbers).sort((a, b) => a - b);
    
    // Log detailed information about page detection in development
    if (process.env.NODE_ENV === 'development') {
      if (result.length === 0) {
        console.warn(`No pages detected for chunk from index ${chunkStartIndex} to ${chunkEndIndex}`);
      }
    }
    
    return result;
  };

  // Calculate chunks for preview
  const chunks = useMemo(() => {
    if (!extractedText || pageInfo.length === 0) return [];
    
    // Split text into sentences, preserving the sentence-ending punctuation
    const sentences = extractedText.match(/[^.!?]+[.!?]+/g) || [extractedText];
    const result: TextChunk[] = [];
    
    let currentChunk = '';
    let chunkStartIndex = 0;
    let currentPosition = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const trimmedSentence = sentence.trim();
      
      // Find where this sentence appears in the original text
      const sentenceStartIndex = extractedText.indexOf(trimmedSentence, currentPosition);
      if (sentenceStartIndex === -1) continue; // Skip if we can't find the sentence
      
      const sentenceEndIndex = sentenceStartIndex + trimmedSentence.length;
      
      // Update tracking position to avoid finding the same sentence again
      currentPosition = sentenceEndIndex;
      
      // Rough estimation: 1 token ≈ 4 characters
      const maxChunkSize = 1000; // Roughly 250 tokens
      const wouldExceedLimit = (currentChunk.length + trimmedSentence.length) / 4 > maxChunkSize;
      
      if (wouldExceedLimit && currentChunk.length > 0) {
        // Calculate the actual end index of the current chunk
        const chunkEndIndex = chunkStartIndex + currentChunk.length;
        
        // Determine which pages this chunk spans
        const pageNumbers = getPageNumbersForChunk(chunkStartIndex, chunkEndIndex);
        
        // Add the chunk with accurate indices
        result.push({
          text: currentChunk.trim(),
          pageNumbers,
          index: result.length
        });
        
        // Start a new chunk with this sentence
        currentChunk = trimmedSentence;
        chunkStartIndex = sentenceStartIndex;
      } else {
        // If this is the first sentence in a chunk, record its start position
        if (currentChunk.length === 0) {
          chunkStartIndex = sentenceStartIndex;
        }
        
        // Add the sentence with proper spacing
        if (currentChunk.length > 0) {
          currentChunk += ' ' + trimmedSentence;
        } else {
          currentChunk = trimmedSentence;
        }
      }
    }
    
    // Add the last chunk if there is one
    if (currentChunk) {
      const chunkEndIndex = chunkStartIndex + currentChunk.length;
      const pageNumbers = getPageNumbersForChunk(chunkStartIndex, chunkEndIndex);
      
      result.push({
        text: currentChunk.trim(),
        pageNumbers,
        index: result.length
      });
    }
    
    // Validate that all chunks have page numbers
    for (const chunk of result) {
      if (chunk.pageNumbers.length === 0) {
        console.warn(`Chunk with no page numbers detected: "${chunk.text.substring(0, 50)}..."`);
        // Assign a default page number (first page) if we couldn't determine the pages
        chunk.pageNumbers = [1];
      }
    }
    
    return result;
  }, [extractedText, pageInfo]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload a PDF file.";
    }

    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
      return "Invalid file extension. Please upload a PDF file.";
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    setExtractedText('');
    setPageInfo([]);
    
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(selectedFile);
    extractTextFromFile(selectedFile);
  };

  const extractTextFromFile = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/vectorize/extract-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract text from file');
      }

      const data = await response.json();
      
      // Ensure we have text data
      if (!data.text) {
        throw new Error('No text returned from the server');
      }
      
      // Set the text and page info
      setExtractedText(data.text);
      setPageInfo(data.pages || []);
      
      console.log(`Received ${data.pages?.length || 0} pages of information`);
    } catch (err) {
      console.error('Error extracting text:', err);
      setError(`Failed to extract text: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVectorize = async () => {
    if (!file || !extractedText) return;
    
    setVectorizing(true);
    setError(null);
    setSuccess(null);
    
    // Filter out empty metadata entries
    const validMetadata = metadata.filter(item => item.key.trim() !== '' && item.value.trim() !== '');
    
    // Convert metadata array to object
    const metadataObject = validMetadata.reduce((acc, item) => {
      acc[item.key.trim()] = item.value.trim();
      return acc;
    }, {} as Record<string, string>);
    
    try {
      const response = await fetch('/api/vectorize/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          text: extractedText,
          pageInfo: pageInfo,
          metadata: metadataObject
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to vectorize document');
      }

      const data = await response.json();
      setSuccess(`Successfully vectorized document with ${data.chunks} chunks and stored in Pinecone with IDs: ${data.vectorIds.join(', ')}`);
      
      // Reset form
      setFile(null);
      setExtractedText('');
      setPageInfo([]);
      setMetadata([{ key: '', value: '' }]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error vectorizing document:', err);
      setError(`Failed to vectorize document: ${(err as Error).message}`);
    } finally {
      setVectorizing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setExtractedText('');
    setPageInfo([]);
    setError(null);
    setSuccess(null);
    setMetadata([{ key: '', value: '' }]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addMetadataField = () => {
    setMetadata([...metadata, { key: '', value: '' }]);
  };

  const updateMetadataField = (index: number, field: 'key' | 'value', value: string) => {
    const updatedMetadata = [...metadata];
    updatedMetadata[index][field] = value;
    setMetadata(updatedMetadata);
  };

  const removeMetadataField = (index: number) => {
    if (metadata.length <= 1) return;
    const updatedMetadata = metadata.filter((_, i) => i !== index);
    setMetadata(updatedMetadata);
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          <h3 className="font-medium">Upload PDF Document</h3>
        </div>
        
        <Input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".pdf"
          disabled={loading || vectorizing}
          className="cursor-pointer"
        />
        
        <p className="text-xs text-muted-foreground">
          PDF files only (Max. 10MB)
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Extracting text from PDF...</p>
          </div>
        </div>
      )}

      {extractedText && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <h3 className="font-medium">Document Information</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{extractedText.length} characters</span>
              <span className="mx-1">•</span>
              <FileDigit className="h-4 w-4" />
              <span>{pageInfo.length} pages</span>
              <span className="mx-1">•</span>
              <span>{chunks.length} chunks</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <h3 className="font-medium">Document Metadata</h3>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addMetadataField}
                className="text-xs flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Field
              </Button>
            </div>
            
            <Card className="border border-gray-200">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add custom metadata to be stored with each chunk of this document.
                </p>
                
                {metadata.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Key"
                      value={item.key}
                      onChange={(e) => updateMetadataField(index, 'key', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value"
                      value={item.value}
                      onChange={(e) => updateMetadataField(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMetadataField(index)}
                      disabled={metadata.length <= 1}
                      className="h-8 w-8 text-gray-500 hover:text-red-500"
                      title="Remove field"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={vectorizing}
            >
              Reset
            </Button>
            <Button
              onClick={handleVectorize}
              disabled={!extractedText || vectorizing}
              className="flex items-center gap-2"
            >
              {vectorizing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Vectorizing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Vectorize
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Document Preview Section */}
      {extractedText && chunks.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Document Preview by Page</h3>
          <div className="border rounded-md p-4 bg-gray-50 max-h-96 overflow-y-auto">
            {pageInfo.length > 0 ? (
              <div className="space-y-4">
                {pageInfo.map((page, index) => (
                  <div key={index} className="pb-3 border-b border-gray-200 last:border-0">
                    <div className="font-medium text-sm text-gray-500 mb-1">Page {page.pageNumber}</div>
                    <p className="whitespace-pre-wrap text-sm">
                      {extractedText.substring(page.startIndex, page.endIndex)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm">{extractedText}</p>
            )}
          </div>
        </div>
      )}

      {/* Chunks Section */}
      {extractedText && chunks.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Document Chunks</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {chunks.map((chunk, index) => (
              <Card key={index} className="border border-gray-200">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-gray-50">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs mr-2">
                      {index + 1}
                    </span>
                    <span>
                      Chunk {index + 1} of {chunks.length}
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Pages: {chunk.pageNumbers.join(', ')}</span>
                    <span className="mx-1">•</span>
                    <span>{chunk.text.length} characters</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 max-h-60 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {chunk.text}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 