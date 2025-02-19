"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function UploadChalkTalk({ projectId }: { projectId: string }) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<"video" | "audio">("video")
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement
    if (!fileInput.files || fileInput.files.length === 0) {
      setError("Please select a file")
      return
    }

    const file = fileInput.files[0]
    setIsUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("chalk_talks")
        .upload(`${projectId}/${file.name}`, file)

      if (uploadError) throw uploadError

      // Create database record
      const { error: dbError } = await supabase
        .from("chalk_talks")
        .insert([
          {
            project_id: projectId,
            media_path: uploadData.path,
            media_type: mediaType,
          },
        ])

      if (dbError) throw dbError

      // Reset form
      fileInput.value = ""
      router.refresh()
    } catch (err) {
      console.error("Error uploading:", err)
      setError(err instanceof Error ? err.message : "Error uploading file")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <Label>Presentation Type</Label>
        <RadioGroup
          value={mediaType}
          onValueChange={(value: "video" | "audio") => setMediaType(value)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="video" id="video" />
            <Label htmlFor="video">Video Recording</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="audio" id="audio" />
            <Label htmlFor="audio">Audio Recording</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="media">Upload File</Label>
        <div className="flex items-center justify-center w-full">
          <label
            htmlFor="media"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
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
                {mediaType === "video" ? "MP4 or WEBM" : "MP3, WAV, or WEBM"} (Max. 100MB)
              </p>
            </div>
            <input
              id="media"
              type="file"
              className="hidden"
              accept={mediaType === "video" ? "video/mp4,video/webm" : "audio/mpeg,audio/wav,audio/webm"}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {error && <div className="text-sm text-red-500">{error}</div>}
      
      <button
        type="submit"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md disabled:opacity-50"
        disabled={isUploading}
      >
        {isUploading ? "Uploading..." : "Upload Presentation"}
      </button>
    </form>
  )
} 