'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, CheckCircle2, XCircle, X } from "lucide-react";
import { ChalkTalkSourcesResponse, FormattedSource, GeneratedQuestion } from '@/app/api/sources/utils/types';

interface GenerateSourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onGenerateComplete: (sources: FormattedSource[]) => void;
}

export function GenerateSourcesDialog({
  open,
  onOpenChange,
  projectId,
  onGenerateComplete,
}: GenerateSourcesDialogProps) {
  const [step, setStep] = useState<'initial' | 'generating' | 'preview'>('initial');
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ChalkTalkSourcesResponse | null>(null);
  const [selectedSources, setSelectedSources] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<string[]>([]);
  const [currentProgress, setCurrentProgress] = useState<string>('Starting source generation...');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress([]);
    setCurrentProgress('Starting source generation...');
    setStep('generating');

    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate sources');
      }

      // Create EventSource with the same URL and query params
      const eventSource = new EventSource(`/api/sources?projectId=${projectId}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received SSE data:', data);
          
          if (data.error) {
            setError(data.error);
            setIsGenerating(false);
            setStep('initial');
            eventSource.close();
            return;
          }

          switch (data.step) {
            case 'starting':
              setCurrentProgress('Starting source generation...');
              break;
            case 'generating_questions':
              setCurrentProgress('Generating research questions...');
              break;
            case 'questions_generated':
              setProgress(prev => [...prev, 'Research questions generated']);
              setCurrentProgress('Searching for sources...');
              break;
            case 'searching_sources':
              setCurrentProgress('Searching for sources...');
              break;
            case 'sources_found':
              setProgress(prev => [...prev, 'Sources found']);
              setCurrentProgress('Formatting sources...');
              break;
            case 'formatting_sources':
              setCurrentProgress('Formatting sources...');
              break;
            case 'sources_formatted':
              setProgress(prev => [...prev, 'Sources formatted']);
              setCurrentProgress('Finalizing...');
              break;
            case 'complete':
              setProgress(prev => [...prev, 'Complete']);
              if (data.response) {
                setResponse(data.response);
                // Initialize all sources as selected
                const initialSelected = Object.fromEntries(
                  data.response.sources.map((_: FormattedSource, index: number) => [index, true])
                );
                setSelectedSources(initialSelected);
                setStep('preview');
              }
              eventSource.close();
              break;
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setError('Failed to generate sources. Please try again.');
        setStep('initial');
        setIsGenerating(false);
        eventSource.close();
      };

    } catch (err) {
      console.error('Error generating sources:', err);
      setError('Failed to generate sources. Please try again.');
      setStep('initial');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = () => {
    if (!response) return;

    const selectedSourcesList = response.sources.filter((_, index) => 
      selectedSources[index]
    );

    onGenerateComplete(selectedSourcesList);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-3xl max-h-[80vh] bg-white rounded-lg shadow-lg flex flex-col overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex justify-between items-start">
              <div>
                <Dialog.Title className="text-xl font-semibold">
                  Generate Sources from Chalk Talk
                </Dialog.Title>
                <Dialog.Description className="text-sm text-gray-500 mt-1">
                  We'll analyze your chalk talk transcription to find relevant sources for your grant.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-500">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500">
              <div className="flex">
                <XCircle className="h-5 w-5 text-red-500" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-1 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 p-6 overflow-auto">
            {step === 'initial' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  This will:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Analyze your chalk talk transcription</li>
                  <li>Identify key claims that need sources</li>
                  <li>Search for high-quality, reputable sources</li>
                  <li>Format the sources for your grant</li>
                </ol>
                <Button onClick={handleGenerate} className="mt-4">
                  Start Generation
                </Button>
              </div>
            )}

            {step === 'generating' && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                <div className="text-center">
                  <h3 className="font-medium">{currentProgress}</h3>
                  {progress.length > 0 && (
                    <div className="mt-2 text-sm text-gray-500">
                      {progress.map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          {step}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 'preview' && response && (
              <div className="space-y-6">
                {response.sources.map((source, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-start gap-2">
                      <Checkbox.Root
                        id={`source-${index}`}
                        checked={selectedSources[index]}
                        onCheckedChange={(checked) => 
                          setSelectedSources(prev => ({
                            ...prev,
                            [index]: checked === true
                          }))
                        }
                        className="h-4 w-4 border border-gray-300 rounded bg-white"
                      >
                        <Checkbox.Indicator>
                          <CheckCircle2 className="h-4 w-4 text-purple-500" />
                        </Checkbox.Indicator>
                      </Checkbox.Root>
                      <div className="flex-1">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-medium hover:text-purple-500 inline-flex items-center gap-1"
                        >
                          {source.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <div className="mt-1 text-sm font-medium text-gray-700">
                          {source.reason}
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                          {source.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {step === 'preview' && (
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirm}>
                Add Selected Sources
              </Button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 