import { useEffect, useRef } from 'react';
import { EditOperation } from './types';

interface EditOperationsHandlerProps {
  editor: any;
  editOperations: EditOperation[];
  onComplete?: () => void;
}

// Create a global flag to prevent concurrent edit applications
let isCurrentlyApplyingEdits = false;

export function EditOperationsHandler({ 
  editor, 
  editOperations, 
  onComplete 
}: EditOperationsHandlerProps) {
  // Track if edits have been applied for this instance
  const hasAppliedRef = useRef(false);

  // First do some logging when component mounts
  useEffect(() => {
    console.log(`EditOperationsHandler: Processing ${editOperations.length} operations`);
    
    if (editOperations.length === 0) {
      console.log('No edit operations to apply, completing immediately');
      if (onComplete) onComplete();
      return;
    }
    
    let isMounted = true;
    
    // Process all edits first
    const processEdits = async () => {
      if (!editor) {
        console.error('Editor reference is not available');
        return;
      }
      
      // Apply all operations at once
      try {
        console.log('Applying all edit operations to editor');
        
        // Instead of using dispatch directly, use the editor commands API
        // Get the current HTML content
        const currentContent = editor.getHTML();
        
        // Create a temporary div to modify the content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = currentContent;
        
        // Apply each edit operation to the HTML
        let hasChanges = false;
        
        editOperations.forEach(edit => {
          if (edit.operation === 'replace' && edit.tagType && edit.tagIndex !== undefined && edit.newContent) {
            const elements = edit.tagType === 'p' 
              ? Array.from(tempDiv.querySelectorAll('p'))
              : Array.from(tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6'));
            
            if (edit.tagIndex < elements.length) {
              const element = elements[edit.tagIndex];
              if (element) {
                element.textContent = edit.newContent.replace(/<\/?[^>]+(>|$)/g, "");
                hasChanges = true;
              }
            }
          }
        });
        
        // If we made any changes, update the editor content
        if (hasChanges) {
          // Use the proper editor API to set content
          editor.commands.setContent(tempDiv.innerHTML);
        }
        
        // Notify that all edits are applied
        if (isMounted && onComplete) {
          console.log('Edit operations completed successfully');
          onComplete();
        }
      } catch (error) {
        console.error('Error applying edit operations:', error);
      }
    };
    
    // Process edits after a very short delay to ensure the component is fully mounted
    const timer = setTimeout(processEdits, 0);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [editOperations, onComplete]);

  // Clean up global flag when component unmounts
  useEffect(() => {
    return () => {
      isCurrentlyApplyingEdits = false;
    };
  }, []);

  return null;
} 