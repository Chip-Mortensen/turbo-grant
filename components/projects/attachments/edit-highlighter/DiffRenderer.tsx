import React from 'react';
import { simpleDiff } from './utils/simpleDiff';

interface DiffRendererProps {
  originalText: string;
  newText: string;
}

export function DiffRenderer({ originalText, newText }: DiffRendererProps) {
  // Split the texts into words for diffing
  const originalWords = originalText.split(/\s+/);
  const newWords = newText.split(/\s+/);
  
  // Generate the diff
  const diff = simpleDiff(originalWords, newWords);
  
  return (
    <div className="ai-edit-diff-container">
      <div className="ai-edit-diff-content">
        {diff.map((part, index) => (
          <span 
            key={index} 
            className={
              part.added 
                ? 'ai-edit-diff-added' 
                : part.removed 
                  ? 'ai-edit-diff-removed' 
                  : ''
            }
          >
            {part.value}{' '}
          </span>
        ))}
      </div>
    </div>
  );
} 