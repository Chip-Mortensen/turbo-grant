import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Chat } from '@/components/projects/funding-opportunities/chat';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { Card } from '@/components/ui/card';
import { notFound } from 'next/navigation';
import { BackButton } from "@/components/ui/back-button"

interface PageProps {
  params: Promise<{ projectId: string; foaId: string }>;
}

async function ChatContent({ projectId, foaId }: { projectId: string; foaId: string }) {
  const supabase = await createClient();
  const { data: foa } = await supabase
    .from('foas')
    .select('title')
    .eq('id', foaId)
    .single();

  if (!foa) {
    notFound();
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-14rem)] overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-3 border-b bg-card">
        <MessageSquare className="h-6 w-6 flex-shrink-0 text-muted-foreground" />
        <h1 className="text-lg font-semibold tracking-tight truncate" title={foa.title}>{foa.title}</h1>
      </div>

      <div className="flex-1 overflow-hidden">
        <Chat foaId={foaId} projectId={projectId} />
      </div>
    </Card>
  );
}

export default async function ChatPage({ params }: PageProps) {
  const { projectId, foaId } = await params;

  return (
    <div className="container max-w-6xl mx-auto py-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <BackButton 
            href={`/projects/${projectId}/funding-opportunities/${foaId}`}
            label="Back to Funding Opportunity"
          />
        </div>

        <Suspense fallback={
          <Card className="flex flex-col h-[calc(100vh-14rem)] overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-3 border-b bg-card">
              <MessageSquare className="h-6 w-6 flex-shrink-0 text-muted-foreground" />
              <h1 className="text-lg font-semibold tracking-tight">Loading...</h1>
            </div>
          </Card>
        }>
          <ChatContent projectId={projectId} foaId={foaId} />
        </Suspense>
      </div>
    </div>
  );
} 