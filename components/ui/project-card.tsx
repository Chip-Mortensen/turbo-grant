import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LucideIcon, CheckCircle2 } from "lucide-react";

interface ProjectCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  isComplete?: boolean;
  disabled?: boolean;
}

export function ProjectCard({ title, description, href, icon: Icon, isComplete }: ProjectCardProps) {
  return (
    <Link href={href} className="block group">
      <div className={cn(
        "relative p-6 rounded-lg transition-all",
        "bg-card hover:bg-accent/50",
        "border border-border",
        "hover:shadow-sm",
        !isComplete && "animate-card-pulse"
      )}>
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-2 rounded-md",
            "bg-background group-hover:bg-accent",
            "border border-border"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              isComplete ? "text-green-500" : "text-muted-foreground"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium truncate pr-8">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          {isComplete && (
            <div className="absolute right-6 top-6">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
} 