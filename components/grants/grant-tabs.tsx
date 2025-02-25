'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import UploadGrant from '@/components/grants/upload-grant';
import FoaList from '@/components/grants/foa-list';
import ProcessCsv from '@/components/grants/process-csv';
import { Sparkles, List, FileSpreadsheet } from 'lucide-react';

interface GrantTabsProps {
  projectId: string;
  grantTypes: any[];
}

export default function GrantTabs({ projectId, grantTypes }: GrantTabsProps) {
  const [activeTab, setActiveTab] = useState<'extract' | 'list' | 'csv'>('extract');

  return (
    <div className="w-full">
      <div className="flex border-b mb-4">
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
        <Button
          variant={activeTab === 'list' ? 'default' : 'ghost'}
          className={`rounded-none border-b-2 ${
            activeTab === 'list' 
              ? 'border-primary' 
              : 'border-transparent'
          } px-4 py-2 flex-1`}
          onClick={() => setActiveTab('list')}
        >
          <List className="h-4 w-4 mr-2" />
          View FOAs
        </Button>
        <Button
          variant={activeTab === 'csv' ? 'default' : 'ghost'}
          className={`rounded-none border-b-2 ${
            activeTab === 'csv' 
              ? 'border-primary' 
              : 'border-transparent'
          } px-4 py-2 flex-1`}
          onClick={() => setActiveTab('csv')}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Process CSV
        </Button>
      </div>

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

      {activeTab === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <List className="h-5 w-5 mr-2 text-blue-500" />
              Funding Opportunity Announcements
            </CardTitle>
            <CardDescription>
              Browse and search all funding opportunities in the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FoaList projectId={projectId} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'csv' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2 text-blue-500" />
              Process CSV
            </CardTitle>
            <CardDescription>
              Upload a CSV file with Title and either URL or Solicitation URL columns to quickly import funding opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ProcessCsv projectId={projectId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
} 