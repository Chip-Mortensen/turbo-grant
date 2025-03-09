"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { deleteDescription } from "@/app/actions"

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
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [existingDescription, setExistingDescription] = useState<any | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
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

  const checkExistingDescription = async (file: File) => {
    try {
      const supabase = createClient()
      const { data: descriptions } = await supabase
        .from("research_descriptions")
        .select("*")
        .eq("project_id", projectId)
        .order("uploaded_at", { ascending: false })
        .limit(1)

      if (descriptions && descriptions.length > 0) {
        setExistingDescription(descriptions[0])
        setFileToUpload(file)
        setReplaceDialogOpen(true)
        return true
      }
      return false
    } catch (err) {
      console.error("Error checking for existing descriptions:", err)
      return false
    }
  }

  const handleUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check if there's an existing description
    const hasExisting = await checkExistingDescription(file)
    if (hasExisting) {
      // Dialog will be shown, upload will happen after confirmation
      return
    }

    await processUpload(file)
  }, [projectId, router])

  const processUpload = async (file: File) => {
    setIsUploading(true)
    setError(null)
    setSuccess(null)
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
      
      // If there's an existing description, delete it first using the deleteDescription function
      if (existingDescription) {
        console.log('Deleting existing description:', existingDescription.id)
        
        // Use the deleteDescription function to properly clean up vectors
        const result = await deleteDescription(existingDescription.id)
        
        if (result.error) {
          console.error('Error deleting existing description:', result.error)
          // Continue anyway to replace the record, but log the error
        }
      }
      
      // Upload file to storage
      console.log('Attempting to upload file to storage bucket')
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("research-descriptions")
        .upload(`${projectId}/${file.name}`, file)

      if (uploadError) {
        console.error('Storage upload failed:', uploadError)
        throw uploadError
      }

      console.log('File uploaded successfully to storage:', uploadData.path)

      // Create database record
      console.log('Attempting to create database record')
      const { data: dbData, error: dbError } = await supabase
        .from("research_descriptions")
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
      setSuccess(existingDescription 
        ? `Successfully replaced "${existingDescription.file_name}" with "${file.name}"`
        : `Successfully uploaded "${file.name}"`)
      
      router.refresh()
    } catch (err) {
      console.error("Upload process failed:", err)
      setError(err instanceof Error ? err.message : "Error uploading file")
    } finally {
      setIsUploading(false)
      setExistingDescription(null)
      setReplaceDialogOpen(false)
    }
  }

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
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      
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
      
      {isUploading && (
        <div className="text-sm text-center text-muted-foreground">
          Uploading...
        </div>
      )}
      
      {/* Replace Confirmation Dialog */}
      <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Existing Description</DialogTitle>
            <DialogDescription>
              This project already has a research description. Uploading a new one will replace the existing description.
            </DialogDescription>
          </DialogHeader>
          
          {existingDescription && (
            <div className="mt-2 text-sm">
              <p>Existing file: <span className="font-medium">{existingDescription.file_name}</span></p>
              <p>Uploaded on: <span className="font-medium">{new Date(existingDescription.uploaded_at).toLocaleDateString()}</span></p>
              
              {existingDescription.pinecone_ids && existingDescription.pinecone_ids.length > 0 && (
                <div className="mt-2 text-amber-600">
                  This will also delete {existingDescription.pinecone_ids.length} associated vectors from Pinecone.
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReplaceDialogOpen(false)
                setFileToUpload(null)
                setExistingDescription(null)
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => fileToUpload && processUpload(fileToUpload)}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                  Replacing...
                </>
              ) : (
                'Replace'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 