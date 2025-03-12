'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DocumentForm from '@/components/documents/document-form';
import { Document } from '@/types/documents';
import { use } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';

export default function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/documents/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }
      const data = await response.json();
      setDocument(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleSubmit = async (updates: Partial<Document>) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update document');
      }

      router.push('/documents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  if (!document && !error) {
    return (
      <div className="container py-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-4">
      <BackButton href="/documents" label="Back to Documents" />
      
      <div className="flex items-center justify-between py-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Edit Document</h1>
          <p className="text-sm text-muted-foreground">
            Update document template settings
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
          Error: {error}
        </div>
      )}

      {document && (
        <Card className="pt-6">
          <CardContent>
            <DocumentForm
              initialDocument={document}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
} 