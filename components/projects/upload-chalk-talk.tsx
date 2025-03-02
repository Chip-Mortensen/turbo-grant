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

// Constants for file limits
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
const MAX_DURATION_SECONDS = 60 * 60; // 60 minutes

export function UploadChalkTalk({ projectId }: { projectId: string }) {
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
    // Validate the file
    const validationError = await validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    // If it's a video file, extract audio
    if (file.type !== 'audio/mpeg') {
      if (!browserCompatible) {
        setError('Your browser does not support audio extraction from video files. Please upload an MP3 audio file instead.');
        return;
      }
      
      try {
        setIsConverting(true);
        setExtractionProgress(0);
        
        // Extract audio from video
        const audioBlob = await extractAudioFromVideo(file, (progress) => {
          setExtractionProgress(progress);
        });
        
        // Create an audio preview URL
        const previewUrl = URL.createObjectURL(audioBlob);
        setAudioPreviewUrl(previewUrl);
        
        setIsConverting(false);
      } catch (err) {
        console.error('Error extracting audio:', err);
        setError('Failed to extract audio from video. Please try again or upload an MP3 file directly.');
        setIsConverting(false);
      }
    } else {
      // If it's already an MP3, create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setAudioPreviewUrl(previewUrl);
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
        if (!browserCompatible) {
          setError('Your browser does not support audio extraction from video files. Please upload an MP3 audio file instead.');
          setIsUploading(false);
          return;
        }
        
        try {
          setProcessingStep("Extracting audio from video...")
          
          // Extract audio from video
          const audioBlob = await extractAudioFromVideo(file, (progress) => {
            setExtractionProgress(progress);
          });
          
          // Create a File object from the Blob
          fileName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, ".mp3"));
          fileToUpload = new File(
            [audioBlob], 
            fileName, 
            { type: 'audio/mpeg' }
          );
          
          // Create an audio preview URL
          const previewUrl = URL.createObjectURL(audioBlob);
          setAudioPreviewUrl(previewUrl);
        } catch (err) {
          console.error('Error extracting audio:', err);
          setError('Failed to extract audio from video. Please try again or upload an MP3 file directly.');
          setIsUploading(false);
          return;
        }
      } else if (audioPreviewUrl && file.type !== 'audio/mpeg') {
        // If we already have a converted audio blob, use that
        // We need to fetch the blob from the audio preview URL
        try {
          const response = await fetch(audioPreviewUrl);
          const audioBlob = await response.blob();
          
          fileName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, ".mp3"));
          fileToUpload = new File(
            [audioBlob], 
            fileName, 
            { type: 'audio/mpeg' }
          );
        } catch (err) {
          console.error('Error retrieving converted audio:', err);
          setError('Error retrieving converted audio. Please try again.');
          setIsUploading(false);
          return;
        }
      } else {
        // If it's already an MP3, sanitize the filename
        fileName = sanitizeFileName(fileName);
      }
      
      setProcessingStep("Uploading to storage...")
      
      // Upload file using TUS for resumable uploads with progress
      const filePath = await uploadFileWithTus(fileToUpload, fileName, contentType);

      setProcessingStep("Creating database record...")
      // Create database record
      const supabase = createClient();
      const { data: chalkTalkRecord, error: dbError } = await supabase
        .from("chalk_talks")
        .insert([
          {
            project_id: projectId,
            media_path: filePath,
            media_type: 'audio', // Always audio since we're extracting from videos
          },
        ])
        .select('id')
        .single();

      if (dbError) throw dbError

      // Trigger transcription process
      try {
        setProcessingStep("Starting transcription...")
        
        const transcriptionResponse = await fetch('/api/trigger-transcription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chalkTalkId: chalkTalkRecord.id,
            filePath,
          }),
        });

        if (!transcriptionResponse.ok) {
          const errorData = await transcriptionResponse.json();
          throw new Error(errorData.error || 'Failed to start transcription process');
        }

        // Transcription has been initiated but will continue in the background
        setProcessingStep("Upload complete! Transcription started in the background.");
        
      } catch (transcriptionErr) {
        console.error('Error starting transcription:', transcriptionErr);
        // Don't block the user flow for transcription errors
      }

      // Reset form
      fileInput.value = ""
      setSelectedFile(null);
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(null);
      }
      router.refresh()
    } catch (err) {
      console.error("Error uploading:", err)
      setError(err instanceof Error ? err.message : "Error uploading file")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form id="upload-form" onSubmit={onSubmit} className="space-y-6">
      {browserCompatible === false && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Browser Compatibility Issue</AlertTitle>
          <AlertDescription>
            Your browser doesn't support audio extraction from video files. You can only upload MP3 audio files directly.
            You can convert your video to MP3 using <a href="https://cloudconvert.com/mp4-to-mp3" target="_blank" rel="noopener noreferrer" className="underline font-medium">CloudConvert</a>.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between mb-2">
        <Label htmlFor="media" className="text-base font-medium">Upload Presentation Audio</Label>
        <a 
          href="https://cloudconvert.com/mp4-to-mp3" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          Convert video to MP3
        </a>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-center w-full">
          <label
            htmlFor="media"
            className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer ${
              isDragging ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
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
                MP3 audio or video file (MP4, MOV, WEBM, AVI)
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Max {Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB, {Math.round(MAX_DURATION_SECONDS / 60)} minutes
              </p>
              {browserCompatible && (
                <p className="text-xs text-green-600 mt-2">
                  Audio will be automatically extracted from video files
                </p>
              )}
            </div>
            <input
              ref={fileInputRef}
              id="media"
              type="file"
              className="hidden"
              accept="audio/mpeg,video/mp4,video/quicktime,video/webm,video/x-msvideo"
              disabled={isUploading || isConverting}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setError(null);
                  setSelectedFile(e.target.files[0]);
                  
                  // Clear any previous audio preview
                  if (audioPreviewUrl) {
                    URL.revokeObjectURL(audioPreviewUrl);
                    setAudioPreviewUrl(null);
                  }
                  
                  // Process the file immediately
                  processFile(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Audio conversion progress */}
      {isConverting && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Converting video to MP3...</span>
            <span className="text-sm">{Math.round(extractionProgress)}%</span>
          </div>
          <Progress value={extractionProgress} />
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">{processingStep}</span>
            <span className="text-sm">
              {processingStep.includes("Extracting") 
                ? `${Math.round(extractionProgress)}%` 
                : processingStep.includes("Uploading") 
                  ? `${Math.round(uploadProgress)}%` 
                  : ""}
            </span>
          </div>
          <Progress 
            value={processingStep.includes("Extracting") 
              ? extractionProgress 
              : processingStep.includes("Uploading") 
                ? uploadProgress 
                : 0} 
          />
        </div>
      )}

      {/* Audio preview player */}
      {audioPreviewUrl && !isUploading && !isConverting && (
        <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Audio Preview</h3>
            <span className="text-xs text-gray-500">
              Ready for upload
            </span>
          </div>
          <audio 
            controls 
            className="w-full" 
            src={audioPreviewUrl}
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {error && <div className="text-sm text-red-500">{error}</div>}
      
      <button
        type="submit"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md disabled:opacity-50"
        disabled={isUploading || isConverting || !selectedFile}
      >
        {isUploading 
          ? "Processing..." 
          : isConverting 
            ? "Converting to MP3..." 
            : "Upload Presentation"}
      </button>
    </form>
  )
} 