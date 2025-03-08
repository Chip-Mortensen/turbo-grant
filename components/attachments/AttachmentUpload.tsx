'use client';

import { useCallback, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Download } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_FILE_TYPE = 'application/pdf';

interface AttachmentUploadProps {
  projectId: string;
  documentId: string;
  existingUrl?: string;
  onUploadComplete: (filePath: string) => Promise<void>;
}

export function AttachmentUpload({
  projectId,
  documentId,
  existingUrl,
  onUploadComplete
}: AttachmentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.type !== ALLOWED_FILE_TYPE) {
      return 'Invalid file type. Please upload a PDF file.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 10MB limit.';
    }

    return null;
  };

  const handleUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // If there's an existing file, show confirmation dialog
    if (existingUrl) {
      setFileToUpload(file);
      setReplaceDialogOpen(true);
      return;
    }

    await processUpload(file);
  }, [existingUrl]);

  const processUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();
      
      // Upload file to storage
      const filePath = `${projectId}/${documentId}/${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      await onUploadComplete(filePath);

      setSuccess(existingUrl 
        ? `Successfully replaced the existing file with "${file.name}"`
        : `Successfully uploaded "${file.name}"`);

    } catch (err) {
      console.error('Upload process failed:', err);
      setError(err instanceof Error ? err.message : 'Error uploading file');
    } finally {
      setIsUploading(false);
      setFileToUpload(null);
      setReplaceDialogOpen(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    const file = e.dataTransfer.files[0];
    handleUpload(file);
  }, [handleUpload]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    handleUpload(file);
  }, [handleUpload]);

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {existingUrl && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div className="text-sm">
            <span className="font-medium">Current file:</span> {existingUrl.split('/').pop()}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-4"
            onClick={() => window.open(existingUrl, '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      )}
      
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer ${
            isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-border bg-gray-50 hover:bg-gray-100'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={onDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-8 h-8 mb-4 text-gray-500"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 16"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
              />
            </svg>
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              PDF only (Max. 10MB)
            </p>
          </div>
          <input
            id="dropzone-file"
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,application/pdf"
            onChange={onChange}
            disabled={isUploading}
          />
        </label>
      </div>
      
      {isUploading && (
        <div className="text-sm text-center text-muted-foreground">
          Uploading...
        </div>
      )}
      
      {/* Replace Confirmation Dialog */}
      <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Existing File</DialogTitle>
            <DialogDescription>
              This document already has an uploaded file. Uploading a new one will replace the existing file.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-2 text-sm">
            <p>Existing file: <span className="font-medium">{existingUrl?.split('/').pop()}</span></p>
            <p>New file: <span className="font-medium">{fileToUpload?.name}</span></p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReplaceDialogOpen(false);
                setFileToUpload(null);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => fileToUpload && processUpload(fileToUpload)}
              disabled={isUploading}
            >
              {isUploading ? 'Replacing...' : 'Replace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 