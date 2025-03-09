'use client';

import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Card } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { SendHorizontal } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

interface ChatProps {
  foaId: string;
  projectId: string;
}

function ChatMessage({ role, content, isLoading }: {
  role: 'system' | 'user' | 'assistant' | 'data';
  content: string;
  isLoading?: boolean;
}) {
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

function ChatInput({ 
  value, 
  onChange, 
  isLoading 
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    onChange(e);
    
    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  return (
    <>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="min-h-[44px] max-h-[200px] resize-none bg-background border-0 focus-visible:ring-0"
        disabled={isLoading}
      />
      <Button
        type="submit"
        disabled={!value.trim() || isLoading}
        size="icon"
        className="mb-1.5"
      >
        <SendHorizontal className="h-4 w-4" />
      </Button>
    </>
  );
}

export function Chat({ foaId, projectId }: ChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: input, id: Date.now().toString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/funding-opportunity/${foaId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        id: Date.now().toString()
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.',
        id: Date.now().toString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="px-4 py-3 border-t bg-muted/50">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <ChatInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            isLoading={isLoading}
          />
        </form>
      </div>
    </div>
  );
} 