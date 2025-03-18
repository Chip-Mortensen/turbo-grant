import React from 'react';

interface EditSummaryBarProps {
  pendingCount: number;
  totalCount: number;
  onApplyAll: () => void;
}

export function EditSummaryBar({ pendingCount, totalCount, onApplyAll }: EditSummaryBarProps) {
  // Use a simple method to check if user prefers dark mode
  const prefersDarkMode = typeof window !== 'undefined' && 
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (totalCount === 0) return null;
  
  return (
    <div className={`ai-edit-summary-bar ${prefersDarkMode ? 'dark' : ''}`}>
      <div className="ai-edit-summary-count">
        {pendingCount}/{totalCount} edits pending
      </div>
      {pendingCount > 0 && (
        <button 
          className="ai-edit-apply-all-button"
          onClick={onApplyAll}
        >
          Apply All Pending
        </button>
      )}
    </div>
  );
} 