'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Check, XCircle, X, Sparkles } from "lucide-react";
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
                // Initialize all sources as selected unless they have issues
                const initialSelected = Object.fromEntries(
                  data.response.sources.map((source: FormattedSource, index: number) => [index, !source.issue])
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
                  Generate Sources
                </Dialog.Title>
                <Dialog.Description className="text-sm text-gray-500 mt-1">
                  We'll analyze your inputs to find relevant sources for your grant.
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
                  <li>Analyze your inputs</li>
                  <li>Identify key claims that need sources</li>
                  <li>Search for high-quality, reputable sources</li>
                  <li>Format the sources for your grant</li>
                </ol>
                <Button 
                  variant="outline" 
                  onClick={handleGenerate}
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
                      Generate Sources
                    </>
                  )}
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
                          <Check className="h-4 w-4 text-green-500" />
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                  Sources with citation issues may still be valuable - our AI might have missed author information that's available on the page. Review these sources and update citations manually if needed.
                </div>
                {response.sources.map((source, index) => (
                  <div 
                    key={index} 
                    className={`rounded-lg p-4 border transition-colors ${
                      source.issue && !selectedSources[index]
                        ? 'bg-red-50 border-red-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
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
                        className="h-6 w-6 border border-gray-300 rounded bg-white flex items-center justify-center"
                      >
                        <Checkbox.Indicator>
                          <Check className="h-5 w-5 text-purple-500" />
                        </Checkbox.Indicator>
                      </Checkbox.Root>
                      <div className="flex-1 min-w-0">
                        {source.issue && !selectedSources[index] && (
                          <div className="mb-3 text-sm text-red-600 flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            {source.issue}
                          </div>
                        )}
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-medium hover:text-purple-500 inline-flex items-center gap-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                        >
                          {source.url}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                        <div className="mt-1 text-sm font-medium text-gray-700">
                          {source.reason}
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                          {source.description}
                        </p>
                        {source.citation && (
                          <div className="mt-2 text-sm text-gray-600 font-medium border-t pt-2">
                            {source.citation}
                          </div>
                        )}
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