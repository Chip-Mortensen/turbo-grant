"use client"

import { createProject } from "@/app/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useTransition, useState } from "react"

export function NewProjectForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createProject(formData)
      
      if (result.success && result.projectId) {
        router.push(`/projects/${result.projectId}`)
        router.refresh()
      } else if (result.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Project Title</Label>
        <Input
          id="title"
          name="title"
          placeholder="Enter your project title"
          required
        />
      </div>
      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}
      <button
        type="submit"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
        disabled={isPending}
      >
        {isPending ? "Creating..." : "Create Project"}
      </button>
    </form>
  )
} 