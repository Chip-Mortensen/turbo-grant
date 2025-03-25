'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Document } from '@/types/documents';
import DocumentList from '@/components/documents/document-list';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? This will also delete all completed versions of this document.')) {
      return;
    }

    try {
      // First delete any associated completed documents
      const deleteCompletedResponse = await fetch(`/api/documents/${id}/completed`, {
        method: 'DELETE',
      });

      if (!deleteCompletedResponse.ok) {
        throw new Error('Failed to delete completed documents');
      }

      // Then delete the document itself
      const deleteDocumentResponse = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (!deleteDocumentResponse.ok) {
        throw new Error('Failed to delete document');
      }

      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  if (isLoading) {
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
      <BackButton href="/projects" label="Back to Projects" />
      
      <div className="flex items-center justify-between py-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Manage document templates and their settings
          </p>
        </div>
        <Button asChild>
          <Link href="/documents/new">
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
          Error: {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No documents found. Create your first document to get started!
            </div>
          ) : (
            <DocumentList
              documents={documents}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
} 