"use client"

import { useCallback, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function ResearcherForm({ projectId }: { projectId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name")?.toString()
    const title = formData.get("title")?.toString()
    const institution = formData.get("institution")?.toString()
    const bio = formData.get("bio")?.toString()

    if (!name) {
      setError("Name is required")
      setIsSubmitting(false)
      return
    }

    try {
      const supabase = createClient()

      const { error: dbError } = await supabase
        .from("researcher_profiles")
        .insert([
          {
            project_id: projectId,
            name,
            title: title || null,
            institution: institution || null,
            bio: bio || null,
          },
        ])

      if (dbError) throw dbError

      // Reset form
      formRef.current?.reset()
      router.refresh()
    } catch (err) {
      console.error("Error creating researcher profile:", err)
      setError(err instanceof Error ? err.message : "Error creating researcher profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter researcher name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g. Professor, Research Scientist"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="institution">Institution</Label>
        <Input
          id="institution"
          name="institution"
          placeholder="Enter institution name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Biography</Label>
        <Textarea
          id="bio"
          name="bio"
          placeholder="Enter researcher biography"
          className="min-h-[100px]"
        />
      </div>

      {error && <div className="text-sm text-red-500">{error}</div>}
      
      <button
        type="submit"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Adding..." : "Add Researcher"}
      </button>
    </form>
  )
} 