'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import UploadDocument from '@/components/vectorize/upload-document';
import ManageVectors from '@/components/vectorize/manage-vectors';
import { FileText, Trash2 } from 'lucide-react';

export default function VectorizeTabs() {
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');

  return (
    <div className="w-full">
      <Card className="overflow-hidden mb-3">
        <CardContent className="p-0">
          <div className="flex border-b">
            <Button
              variant={activeTab === 'upload' ? 'default' : 'ghost'}
              className={`rounded-none border-b-2 ${
                activeTab === 'upload' 
                  ? 'border-primary' 
                  : 'border-transparent'
              } px-4 py-2 flex-1`}
              onClick={() => setActiveTab('upload')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Upload Documents
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
              Manage Vectors
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-500" />
              Upload and Vectorize Documents
            </CardTitle>
            <CardDescription>
              Upload PDF documents to extract text and store as vectors in Pinecone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadDocument />
          </CardContent>
        </Card>
      )}

      {activeTab === 'manage' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trash2 className="h-5 w-5 mr-2 text-blue-500" />
              Manage Vectorized Documents
            </CardTitle>
            <CardDescription>
              View and delete vectorized documents from Pinecone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ManageVectors />
          </CardContent>
        </Card>
      )}
    </div>
  );
} 