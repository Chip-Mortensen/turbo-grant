'use client';

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

interface ChatMessageProps {
  role: 'system' | 'user' | 'assistant' | 'data';
  content: string;
  isLoading?: boolean;
}

export function ChatMessage({ role, content, isLoading }: ChatMessageProps) {
  return (
    <div className={cn(
      "flex w-full gap-2 py-2",
      role === 'user' ? "flex-row-reverse" : "flex-row"
    )}>
      <Avatar className="h-8 w-8">
        <AvatarFallback>
          {role === 'user' ? 'U' : 'TG'}
        </AvatarFallback>
      </Avatar>
      <Card className={cn(
        "flex-1 p-3 max-w-[80%]",
        role === 'user' 
          ? "bg-primary text-primary-foreground" 
          : "bg-card text-card-foreground",
        isLoading && "animate-pulse"
      )}>
        <div className={cn(
          "prose prose-sm max-w-none",
          role === 'user' 
            ? "dark:prose-invert" 
            : "prose-neutral"
        )}>
          {content}
        </div>
      </Card>
    </div>
  );
} 