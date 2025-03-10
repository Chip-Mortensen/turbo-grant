'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Link as LinkIcon, Plus, Trash2, Search, ExternalLink, Pencil, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeleteSourceDialog } from './delete-source-dialog';
import { GenerateSourcesDialog } from './generate-sources-dialog';
import { FormattedSource } from '@/app/api/sources/utils/types';

interface Source {
  id: string;
  url: string;
  reason: string | null;
  description: string | null;
  citation: string | null;
  created_at: string;
}

interface SourceListProps {
  projectId: string;
}

export default function SourceList({ projectId }: SourceListProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const router = useRouter();

  // Load sources on component mount
  useEffect(() => {
    if (projectId) {
      loadSources();
    }
  }, [projectId]);

  // Load sources from database
  const loadSources = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('project_sources')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error loading sources:', error);
        setError('Unable to load sources for this project.');
        return;
      }
      
      setSources(data || []);
    } catch (err) {
      console.error('Error loading sources:', err);
      setError('An unexpected error occurred while loading sources.');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a source
  const handleDelete = async (sourceId: string) => {
    setSelectedSource(sourceId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedSource) return;

    try {
      setDeletingId(selectedSource);
      const supabase = createClient();
      const { error } = await supabase
        .from('project_sources')
        .delete()
        .eq('id', selectedSource);

      if (error) {
        throw error;
      }

      // Refresh the list
      await loadSources();
      router.refresh();
      setShowDeleteDialog(false);
    } catch (err) {
      console.error('Error deleting source:', err);
      setError('Failed to delete source. Please try again.');
    } finally {
      setDeletingId(null);
      setSelectedSource(null);
    }
  };

  const handleGenerateComplete = async (newSources: FormattedSource[]) => {
    setIsGenerating(true);
    try {
      const supabase = createClient();
      
      // Add sources one by one to handle any failures
      const results = await Promise.all(
        newSources.map(source => 
          supabase
            .from('project_sources')
            .insert({
              project_id: projectId,
              url: source.url,
              reason: source.reason,
              description: source.description,
              citation: source.citation,
            })
            .select('*')
            .single()
        )
      );

      // Filter out any failed insertions and get the successful ones
      const successfulSources = results
        .filter(result => !result.error)
        .map(result => result.data);

      // Update the local state with new sources
      setSources(prev => [...prev, ...successfulSources]);

      // Show success message or handle partial failures
      const failedCount = results.filter(result => result.error).length;
      if (failedCount > 0) {
        setError(`${failedCount} sources failed to add. Please try adding them manually.`);
      }

    } catch (err) {
      console.error('Error adding sources:', err);
      setError('Failed to add sources to the database');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Project Sources
        </h2>
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => setShowGenerateDialog(true)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate from Chalk Talk
              </>
            )}
          </Button>
          <Button asChild>
            <Link href={`/projects/${projectId}/sources/new`} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Source
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
          <div className="text-center">
            <h3 className="text-lg font-medium">Loading Sources</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Please wait while we load your project sources...
            </p>
          </div>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : sources.length > 0 ? (
        <div className="space-y-4">
          {sources.map((source) => (
            <Card key={source.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="py-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-3 flex-1">
                    <div>
                      <CardTitle className="text-lg">
                        {source.reason || 'Untitled Source'}
                      </CardTitle>
                      <div className="flex items-center gap-1 mt-1 text-sm">
                        <ExternalLink className="h-3 w-3" />
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-black underline hover:text-purple-500 transition-colors truncate"
                        >
                          {source.url}
                        </a>
                      </div>
                      {source.citation && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {source.citation}
                        </div>
                      )}
                    </div>
                    {source.description && (
                      <CardDescription className="text-sm">
                        {source.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-purple-500"
                      asChild
                    >
                      <Link href={`/projects/${projectId}/sources/${source.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(source.id)}
                      disabled={deletingId === source.id}
                    >
                      {deletingId === source.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No sources added yet</h3>
          <p className="text-sm text-gray-500 mt-1">
            Add your first source by clicking the button above.
          </p>
        </div>
      )}

      <DeleteSourceDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        isDeleting={!!deletingId}
      />

      <GenerateSourcesDialog 
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        projectId={projectId}
        onGenerateComplete={handleGenerateComplete}
      />
    </div>
  );
} 