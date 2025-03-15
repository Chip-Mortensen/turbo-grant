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
}

export function AIEditInput({
  onRequestEdit,
  isLoading,
  editSuggestions,
  onApplyEdits,
  onDiscardEdits
}: AIEditInputProps) {
  const [instruction, setInstruction] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (instruction.trim()) {
      await onRequestEdit(instruction);
    }
  };

  const handleApplyEdits = () => {
    onApplyEdits();
    setInstruction('');
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
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium">AI edit suggestions ready.</span> 
            <span className="text-gray-600 ml-2">
              {getEditCount(editSuggestions) > 1 
                ? `${getEditCount(editSuggestions)} changes suggested` 
                : "1 change suggested"} 
              (Green = additions, Red = removals)
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