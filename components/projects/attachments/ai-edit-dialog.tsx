import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, Check, X } from "lucide-react";
import { EditSuggestion } from '@/app/api/attachments/ai-edit/route';

interface AIEditInputProps {
  onRequestEdit: (instruction: string) => Promise<void>;
  isLoading: boolean;
  editSuggestions: EditSuggestion[] | null;
  onApplyEdits: () => void;
  onDiscardEdits: () => void;
  pendingCount?: number;
  totalCount?: number;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function AIEditInput({
  onRequestEdit,
  isLoading,
  editSuggestions,
  onApplyEdits,
  onDiscardEdits,
  pendingCount = 0,
  totalCount = 0,
  setOpen
}: AIEditInputProps) {
  const [instruction, setInstruction] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (instruction.trim()) {
      await onRequestEdit(instruction);
      setInstruction('');
    }
  };

  const handleApplyEdits = () => {
    // Reset first for responsive feel
    setInstruction('');
    setOpen(false);
    
    // Then trigger the actual edit application
    // This ensures UI clears before any heavy processing happens
    requestAnimationFrame(() => {
      onApplyEdits();
    });
  };

  const handleDiscardEdits = () => {
    onDiscardEdits();
    setInstruction('');
  };

  function getEditCount(suggestions: EditSuggestion[]): number {
    return suggestions.reduce((count, suggestion) => {
      if (suggestion.edits) {
        return count + suggestion.edits.length;
      }
      return count + 1;
    }, 0);
  }

  function getEditSummary(suggestions: EditSuggestion[]): { total: number, replace: number, add: number, delete: number } {
    const summary = { total: 0, replace: 0, add: 0, delete: 0 };
    
    suggestions.forEach(suggestion => {
      if (suggestion.edits) {
        suggestion.edits.forEach(edit => {
          summary.total++;
          if (edit.operation === 'add') {
            summary.add++;
          } else if (edit.operation === 'delete') {
            summary.delete++;
          } else {
            summary.replace++;
          }
        });
      } else {
        // Legacy format
        summary.total++;
        summary.replace++;
      }
    });
    
    return summary;
  }

  // Get the pending/total counts
  const displayPendingCount = pendingCount || (editSuggestions ? getEditCount(editSuggestions) : 0);
  const displayTotalCount = totalCount || (editSuggestions ? getEditCount(editSuggestions) : 0); 

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-md z-10">
      {!editSuggestions ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            placeholder="Describe the changes you want (e.g., 'Add a section about methodology')"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="flex-1 h-10 min-h-10 py-2"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            disabled={isLoading || !instruction.trim()}
            className="whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                AI Edit
              </>
            )}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-sm">
            <span className="font-medium">AI edit suggestions ready.</span> 
            <span className="text-gray-600 ml-2">
              {(() => {
                const summary = getEditSummary(editSuggestions);
                const countDisplay = displayPendingCount !== displayTotalCount 
                  ? `${displayPendingCount}/${displayTotalCount} remaining` 
                  : '';
                
                if (summary.total === 1) {
                  return `1 change suggested ${countDisplay}`;
                } else {
                  let details = [];
                  if (summary.replace > 0) details.push(`${summary.replace} edits`);
                  if (summary.add > 0) details.push(`${summary.add} additions`);
                  if (summary.delete > 0) details.push(`${summary.delete} deletions`);
                  return `${summary.total} changes (${details.join(', ')}) ${countDisplay}`.trim();
                }
              })()}
              {' '}(Green = additions, Red = removals)
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDiscardEdits}
              className="flex items-center"
            >
              <X className="mr-1 h-4 w-4" />
              Discard
            </Button>
            <Button 
              size="sm"
              onClick={handleApplyEdits}
              className="flex items-center"
              disabled={displayPendingCount === 0}
            >
              <Check className="mr-1 h-4 w-4" />
              Apply Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 