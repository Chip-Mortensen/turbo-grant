'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, X } from 'lucide-react';
import { Chat } from './chat';

interface ChatPopupProps {
  foaId: string;
  projectId: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPopup({ foaId, projectId, title, isOpen, onClose }: ChatPopupProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[400px] h-[600px] shadow-lg">
      <Card className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MessageSquare className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight truncate" title={title}>
              {title}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <Chat foaId={foaId} projectId={projectId} />
        </div>
      </Card>
    </div>
  );
} 