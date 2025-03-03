'use client';

import { ChatInterface } from './ChatInterface';

interface ChatWrapperProps {
  foaId: string;
  projectId: string;
}

export const ChatWrapper = ({ foaId, projectId }: ChatWrapperProps) => {
  return <ChatInterface foaId={foaId} projectId={projectId} />;
}; 