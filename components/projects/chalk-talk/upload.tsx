"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { extractAudioFromVideo, checkBrowserCompatibility } from "@/lib/client/audio-extractor"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import * as tus from 'tus-js-client'
import { deleteChalkTalk } from "@/app/actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

// Constants for file limits
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
const MAX_DURATION_SECONDS = 60 * 60; // 60 minutes

export function UploadChalkTalk({ projectId, existingChalkTalks }: { 
  projectId: string, 
  existingChalkTalks?: { id: string }[] | null 
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractionProgress, setExtractionProgress] = useState<number>(0)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [processingStep, setProcessingStep] = useState<string>("")
  const [browserCompatible, setBrowserCompatible] = useState<boolean | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false)
  const [existingChalkTalkId, setExistingChalkTalkId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Function to sanitize file names for storage
  const sanitizeFileName = (name: string): string => {
    // Replace special characters, spaces, and non-ASCII characters
    return name
      .replace(/[|]/g, '-') // Replace pipe character with hyphen
      .replace(/[^\w\s.-]/g, '-') // Replace other special chars with hyphen
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/__+/g, '_') // Replace multiple underscores with single
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .trim();
  };

  // Clean up audio preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  // Check browser compatibility on component mount
  useEffect(() => {
    const checkCompatibility = async () => {
      const isCompatible = await checkBrowserCompatibility();
      setBrowserCompatible(isCompatible);
    };
    
    checkCompatibility();
  }, []);

  // Check video duration
  const checkVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      
      video.onerror = () => {
        reject(new Error("Failed to load video metadata"));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const validateFile = async (file: File): Promise<string | null> => {
    // Check if it's an audio file (MP3)
    if (file.type === 'audio/mpeg') {
      // For MP3 files, just check the size
      if (file.size > MAX_FILE_SIZE) {
        return `File size exceeds ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB limit.`;
      }
      return null;
    }
    
    // Check if it's a supported video format
    const supportedVideoTypes = [
      'video/mp4',
      'video/quicktime', // .mov files
      'video/webm',
      'video/x-msvideo' // .avi files
    ];
    
    if (!supportedVideoTypes.includes(file.type)) {
      return `Unsupported file type. Please upload an MP3 audio file or a video in MP4, MOV, WEBM, or AVI format.`;
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB limit.`;
    }
    
    // Check video duration
    try {
      const duration = await checkVideoDuration(file);
      if (duration > MAX_DURATION_SECONDS) {
        return `Video duration exceeds ${Math.round(MAX_DURATION_SECONDS / 60)} minutes limit.`;
      }
    } catch (err) {
      console.error('Error checking video duration:', err);
      // If we can't check duration, we'll still allow the upload
    }
    
    return null;
  };

  const uploadFileWithTus = async (file: File, fileName: string, contentType: string): Promise<string> => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    
    // Get the Supabase URL from environment variable
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
      throw new Error('Supabase URL not found');
    }
    
    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${data.session?.access_token}`,
          'x-upsert': 'true', // Overwrite existing files
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: 'chalk-talks',
          objectName: `${projectId}/${fileName}`,
          contentType: contentType,
          cacheControl: '3600',
        },
        chunkSize: 6 * 1024 * 1024, // 6MB chunks as required by Supabase
        onError: (error) => {
          console.error('Upload failed:', error);
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = (bytesUploaded / bytesTotal) * 100;
          setUploadProgress(percentage);
        },
        onSuccess: () => {
          // Return the path to the uploaded file
          resolve(`${projectId}/${fileName}`);
        },
      });

      // Check for previous uploads to resume
      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        
        // Start the upload
        upload.start();
      });
    });
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) {
      setIsDragging(true)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && fileInputRef.current) {
      // Set the files to the input element
      const droppedFile = e.dataTransfer.files[0];
      
      // Create a new FileList-like object
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      fileInputRef.current.files = dataTransfer.files;
      
      // Set the selected file
      setSelectedFile(droppedFile);
      
      // Clear any previous errors and audio preview
      setError(null);
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(null);
      }
      
      // Validate and process the file immediately
      processFile(droppedFile);
    }
  }

  // Process the file (validate and convert if needed)
  const processFile = async (file: File) => {
    // Check if there are existing chalk talks
    if (existingChalkTalks && existingChalkTalks.length > 0) {
      setExistingChalkTalkId(existingChalkTalks[0].id);
      setReplaceDialogOpen(true);
      setSelectedFile(file);
      return;
    }
    
    // Validate the file
    const validationError = await validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    // If it's an audio file, just set it as selected
    if (file.type === 'audio/mpeg') {
      setSelectedFile(file);
      return;
    }
    
    // For video files, we need to extract the audio
    if (browserCompatible && file.type.startsWith('video/')) {
      setIsConverting(true);
      setExtractionProgress(0);
      
      try {
        // Create a video element to load the file
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        // Create object URL for the file
        const objectUrl = URL.createObjectURL(file);
        video.src = objectUrl;
        
        // Wait for metadata to load to check duration
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = reject;
        });
        
        // Check duration
        const duration = video.duration;
        if (duration > MAX_DURATION_SECONDS) {
          setIsConverting(false);
          setError(`Video is too long (${Math.round(duration / 60)} minutes). Maximum allowed is ${Math.round(MAX_DURATION_SECONDS / 60)} minutes.`);
          URL.revokeObjectURL(objectUrl);
          return;
        }
        
        // Extract audio using FFmpeg
        const audioBlob = await extractAudioFromVideo(file, (progress) => {
          setExtractionProgress(progress);
        });
        
        // Create an audio preview URL
        const previewUrl = URL.createObjectURL(audioBlob);
        setAudioPreviewUrl(previewUrl);
        setIsConverting(false);
        
        // Clean up
        URL.revokeObjectURL(objectUrl);
      } catch (err) {
        console.error('Error processing video:', err);
        setError('Error processing video: ' + (err instanceof Error ? err.message : String(err)));
        setIsConverting(false);
      }
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement
    if (!fileInput.files || fileInput.files.length === 0) {
      setError("Please select a file")
      return
    }

    const file = fileInput.files[0]
    
    // Check if conversion is still in progress
    if (isConverting) {
      setError("Please wait for the conversion to complete before uploading")
      return
    }
    
    // Check if a video file was selected but no audio preview is available yet
    if (file.type !== 'audio/mpeg' && !audioPreviewUrl) {
      setError("Please wait for the video to be converted to MP3 before uploading")
      return
    }
    
    // Check if there's an existing chalk talk
    if (existingChalkTalks && existingChalkTalks.length > 0) {
      setExistingChalkTalkId(existingChalkTalks[0].id)
      setReplaceDialogOpen(true)
      return
    }
    
    // If no existing chalk talk, proceed with upload
    await uploadChalkTalk(file)
  }
  
  const handleReplaceConfirm = async () => {
    if (!existingChalkTalkId || !selectedFile) {
      setReplaceDialogOpen(false)
      return
    }
    
    setReplaceDialogOpen(false)
    setIsDeleting(true)
    setProcessingStep("Deleting existing chalk talk...")
    
    try {
      // Delete the existing chalk talk
      const result = await deleteChalkTalk(existingChalkTalkId)
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      // Proceed with upload
      await uploadChalkTalk(selectedFile)
      
      // Note: We don't need to call resetFormState() here because uploadChalkTalk already does it
    } catch (err) {
      console.error("Error replacing chalk talk:", err)
      setError(err instanceof Error ? err.message : "Error replacing chalk talk")
      setIsDeleting(false)
      
      // Reset form state even on error
      resetFormState()
    }
  }
  
  const uploadChalkTalk = async (file: File) => {
    setIsUploading(true)
    setError(null)
    setProcessingStep("Uploading to storage...")
    setUploadProgress(0)
    
    try {
      let fileToUpload: File = file;
      let fileName = file.name;
      let contentType = 'audio/mpeg'; // We'll always upload as MP3
      
      // If it's a video file that hasn't been converted yet, extract audio
      if (file.type !== 'audio/mpeg' && !audioPreviewUrl) {
        setError("Please wait for the video to be converted to MP3 before uploading")
        setIsUploading(false)
        return
      }
      
      // If we have an audio preview from a converted video, use that instead
      if (audioPreviewUrl && file.type !== 'audio/mpeg') {
        // Fetch the blob from the audio preview URL
        const response = await fetch(audioPreviewUrl);
        const audioBlob = await response.blob();
        
        // Create a new file from the blob
        const audioFileName = file.name.replace(/\.[^/.]+$/, "") + ".mp3";
        fileToUpload = new File([audioBlob], audioFileName, { type: 'audio/mpeg' });
        fileName = audioFileName;
      }
      
      // Sanitize the file name
      const sanitizedFileName = sanitizeFileName(fileName);
      
      // Upload the file using TUS
      const mediaPath = await uploadFileWithTus(fileToUpload, sanitizedFileName, contentType);
      
      // Create the database record
      setProcessingStep("Creating database record...")
      const supabase = createClient()
      
      const { data: chalkTalkData, error: dbError } = await supabase
        .from("chalk_talks")
        .insert([{
          project_id: projectId,
          media_path: mediaPath,
          media_type: file.type.startsWith('video/') ? 'audio' : 'audio',
          transcription_status: 'pending',
          vectorization_status: 'pending'
        }])
        .select()
        .single()
      
      if (dbError) throw dbError
      
      // Refresh the page to show the new chalk talk
      router.refresh()
      
      // Reset the form state
      resetFormState()
      
      setIsUploading(false)
      setUploadSuccess(true)
    } catch (err) {
      console.error("Error uploading chalk talk:", err)
      setError(err instanceof Error ? err.message : "Error uploading chalk talk")
      setIsUploading(false)
    }
  }

  // Function to reset the form state after upload
  const resetFormState = () => {
    setIsUploading(false);
    setIsConverting(false);
    setSelectedFile(null);
    setUploadProgress(0);
    setExtractionProgress(0);
    setProcessingStep("");
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Clear audio preview if it exists
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
  };

  // Add a function to handle dialog close
  const handleReplaceDialogClose = (open: boolean) => {
    setReplaceDialogOpen(open);
    
    // If dialog is being closed, reset the state
    if (!open) {
      setSelectedFile(null);
      setExistingChalkTalkId(null);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <form id="upload-form" onSubmit={onSubmit} className="space-y-6">
      {browserCompatible === false && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Browser Compatibility Issue</AlertTitle>
          <AlertDescription>
            Your browser does not support audio extraction from video files. Please upload an MP3 audio file instead.
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* File input section */}
      <div className="space-y-2">
        <Label
          htmlFor="file-upload"
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer ${
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-border bg-gray-50 hover:bg-gray-100"
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
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
              MP3, MP4, MOV, WEBM, or AVI (max. {Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB, {Math.round(MAX_DURATION_SECONDS / 60)} min)
            </p>
            {browserCompatible && (
              <p className="text-xs text-green-600 mt-2">
                Audio will be automatically extracted from video files
              </p>
            )}
          </div>
          <input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".mp3,audio/mpeg,video/mp4,video/quicktime,video/webm,video/x-msvideo"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setSelectedFile(e.target.files[0]);
                processFile(e.target.files[0]);
              }
            }}
            disabled={isUploading || isConverting}
          />
        </Label>
        
        {selectedFile && (
          <div className="text-sm">
            Selected: <span className="font-medium">{selectedFile.name}</span> ({Math.round(selectedFile.size / 1024)} KB)
          </div>
        )}
      </div>
      
      {/* Audio preview */}
      {audioPreviewUrl && (
        <div className="space-y-2">
          <Label htmlFor="audio-preview">Audio Preview</Label>
          <audio
            id="audio-preview"
            src={audioPreviewUrl}
            controls
            className="w-full"
          />
        </div>
      )}
      
      {/* Progress indicators */}
      {isConverting && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Converting video to audio...</span>
            <span>{Math.round(extractionProgress)}%</span>
          </div>
          <Progress value={extractionProgress} />
        </div>
      )}
      
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{processingStep}</span>
            {uploadProgress > 0 && <span>{Math.round(uploadProgress)}%</span>}
          </div>
          {uploadProgress > 0 && <Progress value={uploadProgress} />}
        </div>
      )}
      
      {isDeleting && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{processingStep}</span>
          </div>
          <Progress value={100} className="animate-pulse" />
        </div>
      )}
      
      <button
        type="submit"
        className="w-full px-4 py-2 text-white bg-primary rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isUploading || isConverting || isDeleting || !selectedFile}
      >
        {isUploading || isDeleting
          ? "Processing..."
          : isConverting
          ? "Converting..."
          : "Upload Presentation"}
      </button>

      {/* Add the replace dialog */}
      <Dialog open={replaceDialogOpen} onOpenChange={handleReplaceDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Existing Chalk Talk</DialogTitle>
            <DialogDescription>
              You already have a chalk talk for this project. Uploading a new one will replace the existing one.
              This will delete the existing chalk talk and all associated data, including transcriptions and vectors.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleReplaceDialogClose(false)}>
              Cancel
            </Button>
            <Button onClick={handleReplaceConfirm}>
              Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
} 