import { useEffect } from 'react';

export function EditStyles() {
  // Add CSS styles for the diff
  useEffect(() => {
    let styleElement = document.getElementById('ai-edit-highlight-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'ai-edit-highlight-styles';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      .ProseMirror .ai-edit-diff-added {
        background-color: rgba(34, 197, 94, 0.2) !important;
        text-decoration: none !important;
        color: rgb(22, 163, 74) !important;
        font-weight: bold !important;
      }
      
      .ProseMirror .ai-edit-diff-removed {
        background-color: rgba(239, 68, 68, 0.2) !important;
        text-decoration: line-through !important;
        color: rgb(220, 38, 38) !important;
        display: inline !important;
      }
      
      .ProseMirror .ai-edit-new-node {
        background-color: rgba(34, 197, 94, 0.1) !important;
        border-left: 3px solid rgb(22, 163, 74) !important;
        padding-left: 8px !important;
        margin: 8px 0 !important;
        position: relative !important;
      }
      
      .ProseMirror .ai-edit-deleted-node {
        background-color: rgba(239, 68, 68, 0.1) !important;
        border-left: 3px solid rgb(220, 38, 38) !important;
        padding-left: 8px !important;
        text-decoration: line-through !important;
        color: rgb(220, 38, 38) !important;
        position: relative !important;
      }
      
      .ProseMirror .ai-edit-preview-wrapper {
        position: relative;
        margin: 0 !important;
        padding-top: 24px !important; /* Space for the control buttons */
        padding-bottom: 0 !important;
        line-height: inherit !important;
      }
      
      .ProseMirror .ai-edit-diff-container {
        padding: 0 !important;
        line-height: inherit !important;
        margin: 0 !important;
      }
      
      .ProseMirror .ai-edit-diff-content {
        white-space: normal !important;
        word-wrap: break-word !important;
        margin: 0 !important;
        padding: 0 !important;
        line-height: inherit !important;
      }
      
      .ProseMirror .ai-edit-preview-original {
        margin-bottom: 8px !important;
      }
      
      .ProseMirror .ai-edit-preview-new {
        margin-top: 0 !important;
      }
      
      .ProseMirror .ai-edit-preview-divider {
        height: 1px !important;
        background-color: #ccc !important;
        margin: 4px 0 !important;
      }
      
      .ProseMirror p[data-replaced="true"] {
        display: none !important;
      }
      
      /* Status-specific styling */
      .ProseMirror .ai-edit-status-approved {
        border-left-color: rgb(22, 163, 74) !important;
      }
      
      .ProseMirror .ai-edit-status-denied {
        border-left-color: rgb(220, 38, 38) !important;
        opacity: 0.5 !important;
      }
      
      .ProseMirror .ai-edit-status-pending {
        border-left-color: rgb(234, 179, 8) !important;
      }
      
      /* Inline control buttons */
      .ProseMirror .ai-edit-controls {
        position: absolute !important;
        top: 0 !important;
        right: 0 !important;
        display: flex !important;
        gap: 4px !important;
        padding: 4px !important;
        z-index: 10 !important;
      }
      
      .ProseMirror .ai-edit-control-button {
        cursor: pointer !important;
        border: none !important;
        width: 24px !important;
        height: 24px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 50% !important;
        transition: all 0.2s !important;
      }
      
      .ProseMirror .ai-edit-approve-button {
        background-color: rgba(22, 163, 74, 0.1) !important;
        color: rgb(22, 163, 74) !important;
      }
      
      .ProseMirror .ai-edit-approve-button:hover {
        background-color: rgba(22, 163, 74, 0.2) !important;
      }
      
      .ProseMirror .ai-edit-deny-button {
        background-color: rgba(220, 38, 38, 0.1) !important;
        color: rgb(220, 38, 38) !important;
      }
      
      .ProseMirror .ai-edit-deny-button:hover {
        background-color: rgba(220, 38, 38, 0.2) !important;
      }
      
      .ProseMirror .ai-edit-status-badge {
        position: absolute !important;
        top: 4px !important;
        left: 8px !important;
        font-size: 10px !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
        color: white !important;
      }
      
      .ProseMirror .ai-edit-status-badge.ai-edit-status-approved {
        background-color: rgb(22, 163, 74) !important;
        border: none !important;
      }
      
      .ProseMirror .ai-edit-status-badge.ai-edit-status-denied {
        background-color: rgb(220, 38, 38) !important;
        border: none !important;
      }
      
      /* Summary bar styling */
      .ai-edit-summary-bar {
        position: fixed !important;
        bottom: 16px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        background-color: white !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1) !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
        padding: 8px 16px !important;
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        z-index: 50 !important;
      }
      
      .ai-edit-summary-bar.dark {
        background-color: #1f2937 !important;
        border-color: #374151 !important;
      }
      
      .ai-edit-summary-bar .ai-edit-summary-count {
        font-weight: 500 !important;
      }
      
      .ai-edit-summary-bar .ai-edit-apply-all-button {
        background-color: rgb(22, 163, 74) !important;
        color: white !important;
        padding: 4px 8px !important;
        border-radius: 4px !important;
        font-size: 12px !important;
        cursor: pointer !important;
        border: none !important;
      }
      
      .ai-edit-summary-bar .ai-edit-apply-all-button:hover {
        background-color: rgb(21, 128, 61) !important;
      }
      
      .ai-edit-summary-bar .ai-edit-apply-all-button:disabled {
        background-color: #9ca3af !important;
        cursor: not-allowed !important;
      }
    `;
    
    return () => {
      if (styleElement?.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  return null;
} 