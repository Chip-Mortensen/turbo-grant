'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface NewSourceFormProps {
  projectId: string;
}

export function NewSourceForm({ projectId }: NewSourceFormProps) {
  const [url, setUrl] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [citation, setCitation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Basic URL validation
      try {
        new URL(url);
      } catch {
        setError('Please enter a valid URL');
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from('project_sources')
        .insert({
          project_id: projectId,
          url,
          reason: reason || null,
          description: description || null,
          citation,
        })
        .select('*')
        .single();

      if (insertError) {
        throw insertError;
      }

      // Redirect back to sources list
      router.push(`/projects/${projectId}/sources`);
      router.refresh();
    } catch (err) {
      console.error('Error adding source:', err);
      setError('Failed to add source. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="reason" className="text-sm font-medium">
              Reason <span className="text-red-500">*</span>
            </label>
            <Input
              id="reason"
              placeholder="Why are you adding this source?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium">
              URL <span className="text-red-500">*</span>
            </label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Additional Notes
            </label>
            <Textarea
              id="description"
              placeholder="Add any additional notes about this source..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="citation">Citation</Label>
            <Input
              id="citation"
              value={citation}
              onChange={(e) => setCitation(e.target.value)}
              placeholder="Enter the citation in your preferred format"
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Source...
                </>
              ) : (
                'Add Source'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 