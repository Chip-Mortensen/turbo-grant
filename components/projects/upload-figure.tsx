"use client"

import { useCallback, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function UploadFigure({ 
  projectId,
  nextOrderIndex
}: { 
  projectId: string
  nextOrderIndex: number
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      return "Invalid file type. Please upload a PNG or JPG/JPEG file.";
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB in bytes
      return "File size exceeds 5MB limit.";
    }

    return null;
  };

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Store the selected file
    setSelectedFile(file);
    
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setError(null);
  }, []);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    handleFile(e.target.files[0]);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [handleFile]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFile) {
      setError("Please select an image")
      return
    }

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("scientific-figures")
        .upload(`${projectId}/${selectedFile.name}`, selectedFile)

      if (uploadError) throw uploadError

      // Create database record
      const { error: dbError } = await supabase
        .from("scientific_figures")
        .insert([
          {
            project_id: projectId,
            image_path: uploadData.path,
            caption: caption || null,
            order_index: nextOrderIndex,
          },
        ])

      if (dbError) throw dbError

      // Reset form
      setCaption("")
      setPreviewUrl(null)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="figure">Figure Image</Label>
        <div className="flex items-center justify-center w-full">
          <label
            htmlFor="figure"
            className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 relative ${isDragging ? 'border-primary bg-gray-100' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {previewUrl ? (
              <div className="absolute inset-0 w-full h-full">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
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
                  PNG or JPG/JPEG (Max. 5MB)
                </p>
              </div>
            )}
            <input
              id="figure"
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png"
              onChange={onFileSelect}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="caption">Caption (Optional)</Label>
        <Textarea
          id="caption"
          placeholder="Enter a caption for your figure"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={isUploading}
        />
        <p className="text-xs text-muted-foreground">
          AI will automatically generate a detailed description of your figure. Add a caption here if you have specific information you want to include in the search index.
        </p>
      </div>

      {error && <div className="text-sm text-red-500">{error}</div>}
      
      <button
        type="submit"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md disabled:opacity-50"
        disabled={isUploading || !previewUrl}
      >
        {isUploading ? "Uploading..." : "Upload Figure"}
      </button>
    </form>
  )
} 