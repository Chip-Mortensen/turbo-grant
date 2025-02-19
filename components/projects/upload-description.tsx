"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

export function UploadDescription({ projectId }: { projectId: string }) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const onDrop = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    setIsUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("research_descriptions")
        .upload(`${projectId}/${file.name}`, file)

      if (uploadError) throw uploadError

      // Create database record
      const { error: dbError } = await supabase
        .from("written_descriptions")
        .insert([
          {
            project_id: projectId,
            file_path: uploadData.path,
            file_name: file.name,
            file_type: file.type,
          },
        ])

      if (dbError) throw dbError

      router.refresh()
    } catch (err) {
      console.error("Error uploading:", err)
      setError(err instanceof Error ? err.message : "Error uploading file")
    } finally {
      setIsUploading(false)
    }
  }, [projectId, router])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 hover:bg-gray-100"
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
              PDF, DOC, DOCX or TXT (Max. 10MB)
            </p>
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt"
            onChange={onDrop}
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