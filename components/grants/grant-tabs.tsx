'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import UploadGrant from '@/components/grants/upload-grant';
import { Sparkles } from 'lucide-react';

interface GrantTabsProps {
  projectId: string;
  grantTypes: any[];
}

export default function GrantTabs({ projectId, grantTypes }: GrantTabsProps) {
  const [activeTab, setActiveTab] = useState<'select' | 'extract'>('extract');

  return (
    <div className="w-full">
      <div className="flex border-b mb-4">
        <Button
          variant={activeTab === 'select' ? 'default' : 'ghost'}
          className={`rounded-none border-b-2 ${
            activeTab === 'select' 
              ? 'border-primary' 
              : 'border-transparent'
          } px-4 py-2 flex-1`}
          onClick={() => setActiveTab('select')}
        >
          Select Grant Type
        </Button>
        <Button
          variant={activeTab === 'extract' ? 'default' : 'ghost'}
          className={`rounded-none border-b-2 ${
            activeTab === 'extract' 
              ? 'border-primary' 
              : 'border-transparent'
          } px-4 py-2 flex-1`}
          onClick={() => setActiveTab('extract')}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Extract with AI
        </Button>
      </div>

      {activeTab === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Start New Application</CardTitle>
            <CardDescription>
              Select a grant type to start a new application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 text-center">
              <p className="text-muted-foreground">Grant type selection is coming soon.</p>
              <Button 
                className="mt-4"
                onClick={() => setActiveTab('extract')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Try AI Extraction Instead
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'extract' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
              Extract Grant Information with AI
            </CardTitle>
            <CardDescription>
              Paste text from a funding opportunity to automatically extract grant information using AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadGrant projectId={projectId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
} 