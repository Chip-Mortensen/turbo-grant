import { useEffect } from 'react';

export function EditStyles() {
  // Add CSS styles for the diff
  useEffect(() => {
    // Create a style element
    const styleElement = document.createElement('style');
    styleElement.id = 'ai-edit-highlighter-styles';
    
    // CSS content
    styleElement.textContent = `
      /* Container for the edit preview */
      .ProseMirror .ai-edit-preview-wrapper {
        position: relative;
        padding-bottom: 0;
        line-height: inherit;
      }
      
      /* Container for the control buttons */
      .ProseMirror .ai-edit-controls {
        position: absolute;
        top: -24px;
        left: 0;
        display: flex;
        gap: 4px;
        z-index: 10;
      }
      
      /* Individual control buttons */
      .ProseMirror .ai-edit-control-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        color: white;
        padding: 0;
      }
      
      /* Approve button */
      .ProseMirror .ai-edit-approve-button {
        background-color: #22c55e;
      }
      
      /* Deny button */
      .ProseMirror .ai-edit-deny-button {
        background-color: #ef4444;
      }
      
      /* Hover effects for buttons */
      .ProseMirror .ai-edit-approve-button:hover {
        background-color: #16a34a;
      }
      
      .ProseMirror .ai-edit-deny-button:hover {
        background-color: #dc2626;
      }
      
      /* Status badges */
      .ProseMirror .ai-edit-status-badge {
        position: absolute;
        top: -20px;
        left: 0;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        color: white;
      }
      
      .ProseMirror .ai-edit-status-badge.ai-edit-status-approved {
        background-color: #22c55e;
      }
      
      .ProseMirror .ai-edit-status-badge.ai-edit-status-denied {
        background-color: #ef4444;
      }
      
      /* Container for diff content */
      .ProseMirror .ai-edit-diff-container {
        margin: 0;
        padding: 0;
      }
      
      /* Content within the diff container */
      .ProseMirror .ai-edit-diff-content {
        margin: 0;
        padding: 0;
        line-height: inherit;
      }
      
      /* Highlighting for added and removed text */
      .ProseMirror .ai-edit-diff-added {
        background-color: #dcfce7;
        color: #166534;
        padding: 0 2px;
      }
      
      .ProseMirror .ai-edit-diff-removed {
        background-color: #fee2e2;
        color: #991b1b;
        text-decoration: line-through;
        padding: 0 2px;
      }
      
      /* Style for added paragraph */
      .ProseMirror .ai-edit-new-node {
        padding: 0;
        margin: 0;
        background-color: #dcfce7;
        border-left: 3px solid #22c55e;
        padding-left: 8px;
      }
      
      /* Style for deleted paragraph */
      .ProseMirror .ai-edit-deleted-node {
        background-color: #fee2e2;
        border-left: 3px solid #ef4444;
        padding-left: 8px;
      }
      
      /* Hide original paragraph when it's replaced */
      .ProseMirror p[data-replaced="true"] {
        display: none !important;
      }
      
      /* Status classes for approved and denied edits */
      .ProseMirror .ai-edit-status-approved .ai-edit-new-node {
        background-color: transparent;
        border-left: none;
        padding-left: 0;
      }
      
      /* Hide denied edits completely */
      .ProseMirror .ai-edit-status-denied {
        display: none !important;
      }
    `;
    
    // Append to head
    document.head.appendChild(styleElement);
    
    // Cleanup on unmount
    return () => {
      const existingStyle = document.getElementById('ai-edit-highlighter-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return null;
} 