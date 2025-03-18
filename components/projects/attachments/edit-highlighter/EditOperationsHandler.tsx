import { useEffect } from 'react';
import { EditOperation } from './types';

interface EditOperationsHandlerProps {
  editor: any;
  editOperations: EditOperation[];
  onComplete?: () => void;
}

export function EditOperationsHandler({ 
  editor, 
  editOperations, 
  onComplete 
}: EditOperationsHandlerProps) {
  // Apply the edits
  useEffect(() => {
    if (!editor || !editOperations.length) return;

    try {
      console.log(`Applying batch edits: ${editOperations.length} operations`);
      
      // First, clean up any existing preview decorations
      const existingPluginKey = 'aiEditPreviewPlugin';
      const newPlugins = editor.view.state.plugins.filter((plugin: any) => {
        return !(plugin.key && plugin.key.startsWith && plugin.key.startsWith(existingPluginKey));
      });
      
      // Update the editor state to remove the preview plugin
      editor.view.updateState(
        editor.view.state.reconfigure({ plugins: newPlugins })
      );
      
      // Get the current HTML content and clean it
      const currentContent = editor.getHTML();
      
      // Create a temporary div to parse and clean the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = currentContent;
      
      // Remove all preview elements
      const previewWrappers = tempDiv.querySelectorAll('.ai-edit-preview-wrapper');
      previewWrappers.forEach(wrapper => wrapper.remove());
      
      // Show all hidden paragraphs
      const hiddenParagraphs = tempDiv.querySelectorAll('p[style*="display: none"]');
      hiddenParagraphs.forEach(p => {
        p.removeAttribute('style');
      });
      
      // Set the cleaned content back to the editor
      editor.commands.setContent(tempDiv.innerHTML);
      
      // Now apply all edits
      // Get all paragraphs from the document
      const paragraphs = Array.from(tempDiv.querySelectorAll('p'));
      const headings = Array.from(tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      
      console.log(`Found ${paragraphs.length} paragraphs and ${headings.length} headings in the document`);
      
      // Start by processing deletions (from highest index to lowest to avoid shifting issues)
      const deletionOps = editOperations
        .filter(edit => edit.operation === 'delete' && edit.tagType && edit.tagIndex !== undefined)
        .sort((a, b) => (b.tagIndex || 0) - (a.tagIndex || 0));
      
      for (const edit of deletionOps) {
        const elements = edit.tagType === 'p' ? paragraphs : headings;
        const index = edit.tagIndex;
        
        if (index !== undefined && index >= 0 && index < elements.length) {
          console.log(`Deleting ${edit.tagType} at index ${index}`);
          const element = elements[index];
          element.parentNode?.removeChild(element);
          
          // Also remove from our array to keep indexes in sync
          elements.splice(index, 1);
        }
      }
      
      // Process replacements
      const replaceOps = editOperations
        .filter(edit => edit.operation === 'replace' && edit.tagType && edit.tagIndex !== undefined && edit.newContent);
      
      for (const edit of replaceOps) {
        const elements = edit.tagType === 'p' ? paragraphs : headings;
        const index = edit.tagIndex;
        
        if (index !== undefined && index >= 0 && index < elements.length) {
          console.log(`Replacing content at ${edit.tagType} index ${index}`);
          const element = elements[index];
          // Clean the content (remove HTML tags)
          const newContent = edit.newContent?.replace(/<\/?[^>]+(>|$)/g, "") || '';
          element.textContent = newContent;
        }
      }
      
      // Process additions
      const addOps = editOperations
        .filter(edit => edit.operation === 'add' && edit.tagType === 'p' && edit.referenceNodeIndex !== undefined && edit.position && edit.newContent);
      
      for (const edit of addOps) {
        const elements = edit.tagType === 'p' ? paragraphs : headings;
        const refIndex = edit.referenceNodeIndex;
        
        if (refIndex !== undefined && refIndex >= 0 && refIndex < elements.length) {
          console.log(`Adding ${edit.tagType} ${edit.position} reference index ${refIndex}`);
          const refElement = elements[refIndex];
          
          // Create a new element
          const newElement = document.createElement(edit.tagType);
          // Clean the content (remove HTML tags)
          const newContent = edit.newContent?.replace(/<\/?[^>]+(>|$)/g, "") || '';
          newElement.textContent = newContent;
          
          // Insert at the appropriate position
          if (edit.position === 'before') {
            refElement.parentNode?.insertBefore(newElement, refElement);
            // Update our array (not needed for after since we're already past this point)
            elements.splice(refIndex, 0, newElement);
          } else { // 'after'
            if (refElement.nextSibling) {
              refElement.parentNode?.insertBefore(newElement, refElement.nextSibling);
            } else {
              refElement.parentNode?.appendChild(newElement);
            }
          }
        }
      }
      
      // Set the modified content back to the editor
      editor.commands.setContent(tempDiv.innerHTML);
      
      console.log('=== BATCH EDIT APPLICATION COMPLETED ===');
      
      // Notify completion
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error during batch edit application:', error);
    }
  }, [editor, editOperations, onComplete]);

  return null;
} 