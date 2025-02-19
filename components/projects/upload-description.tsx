"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
];

const ALLOWED_FILE_EXTENSIONS = [".pdf", ".docx", ".txt"];

export function UploadDescription({ projectId }: { projectId: string }) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const router = useRouter()

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload a PDF, DOCX, or TXT file.";
    }
    
    const extension = file.name.toLowerCase().split('.').pop();
    if (!extension || !ALLOWED_FILE_EXTENSIONS.map(ext => ext.substring(1)).includes(extension)) {
      return "Invalid file extension. Please upload a PDF, DOCX, or TXT file.";
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB in bytes
      return "File size exceeds 10MB limit.";
    }

    return null;
  };

  const handleUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true)
    setError(null)
    console.log('Starting upload process for file:', file.name)

    try {
      const supabase = createClient()
      
      // First verify project ownership
      console.log('Verifying project ownership for projectId:', projectId)
      const { data: project, error: projectError } = await supabase
        .from("research_projects")
        .select("*")
        .eq("id", projectId)
        .single()

      if (projectError) {
        console.error('Project verification failed:', projectError)
        throw new Error('Failed to verify project ownership')
      }

      if (!project) {
        console.error('Project not found or no access')
        throw new Error('Project not found or no access')
      }

      console.log('Project verification successful:', project.id)
      
      // Upload file to storage
      console.log('Attempting to upload file to storage bucket')
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("written-descriptions")
        .upload(`${projectId}/${file.name}`, file)

      if (uploadError) {
        console.error('Storage upload failed:', uploadError)
        throw uploadError
      }

      console.log('File uploaded successfully to storage:', uploadData.path)

      // Create database record
      console.log('Attempting to create database record')
      const { data: dbData, error: dbError } = await supabase
        .from("written_descriptions")
        .insert([
          {
            project_id: projectId,
            file_path: uploadData.path,
            file_name: file.name,
            file_type: file.type,
          },
        ])
        .select()
        .single()

      if (dbError) {
        console.error('Database insert failed:', dbError)
        throw dbError
      }

      console.log('Database record created successfully:', dbData)

      router.refresh()
    } catch (err) {
      console.error("Upload process failed:", err)
      setError(err instanceof Error ? err.message : "Error uploading file")
    } finally {
      setIsUploading(false)
    }
  }, [projectId, router])

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return

    const file = e.dataTransfer.files[0]
    handleUpload(file)
  }, [handleUpload])

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    handleUpload(file)
  }, [handleUpload])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer ${
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-border bg-gray-50 hover:bg-gray-100"
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDragging(false)
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
              PDF, DOCX, or TXT (Max. 10MB)
            </p>
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt"
            onChange={onChange}
            disabled={isUploading}
          />
        </label>
      </div>
      {error && <div className="text-sm text-red-500">{error}</div>}
      {isUploading && (
        <div className="text-sm text-center text-muted-foreground">
          Uploading...
        </div>
      )}
    </div>
  )
} 