import { Database } from "@/types/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

type Project = Database["public"]["Tables"]["research_projects"]["Row"]

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/dashboard/${project.id}`}>
      <Card className="hover:bg-accent transition-colors">
        <CardHeader>
          <CardTitle>{project.title}</CardTitle>
          <CardDescription>
            Created {formatDate(project.created_at)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {/* Add status indicators or progress here */}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
} 