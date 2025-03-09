'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import UploadOpportunity from '@/components/funding-opportunities/upload-opportunity';
import ProcessCsv from '@/components/funding-opportunities/process-csv';
import ManageList from '@/components/funding-opportunities/manage-list';
import { Sparkles, FileSpreadsheet, Trash2 } from 'lucide-react';

interface OpportunityTabsProps {
  projectId: string;
  grantTypes: any[];
}

export default function OpportunityTabs({ projectId, grantTypes }: OpportunityTabsProps) {
  const [activeTab, setActiveTab] = useState<'extract' | 'process' | 'manage'>('extract');

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
          variant={activeTab === 'process' ? 'default' : 'ghost'}
          className={`rounded-none border-b-2 ${
            activeTab === 'process' 
              ? 'border-primary' 
              : 'border-transparent'
          } px-4 py-2 flex-1`}
          onClick={() => setActiveTab('process')}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Process CSV
        </Button>
        <Button
          variant={activeTab === 'manage' ? 'default' : 'ghost'}
          className={`rounded-none border-b-2 ${
            activeTab === 'manage' 
              ? 'border-primary' 
              : 'border-transparent'
          } px-4 py-2 flex-1`}
          onClick={() => setActiveTab('manage')}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Manage
        </Button>
      </div>

      {activeTab === 'extract' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
              Extract Information with AI
            </CardTitle>
            <CardDescription>
              Upload or paste text from a funding opportunity to automatically extract information using AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadOpportunity projectId={projectId} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'process' && (
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

      {activeTab === 'manage' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trash2 className="h-5 w-5 mr-2 text-blue-500" />
              Manage Funding Opportunities
            </CardTitle>
            <CardDescription>
              View and delete funding opportunities from the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ManageList projectId={projectId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
} 