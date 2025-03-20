import { useEffect, useRef } from 'react';
import { EditOperation, EditStatusMap } from './types';

interface EditOperationsHandlerProps {
  editor: any;
  editOperations: EditOperation[];
  editStatuses?: EditStatusMap;
  onComplete?: () => void;
}

// Create a global flag to prevent concurrent edit applications
let isCurrentlyApplyingEdits = false;

export function EditOperationsHandler({ 
  editor, 
  editOperations, 
  editStatuses = {},
  onComplete 
}: EditOperationsHandlerProps) {
  // Track if edits have been applied for this instance
  const hasAppliedRef = useRef(false);

  // First do some logging when component mounts
  useEffect(() => {
    console.log(`EditOperationsHandler: Processing ${editOperations.length} operations`);
    console.log(`EditStatuses passed to handler:`, editStatuses);
    
    // Filter out denied edits before processing
    const acceptedOperations = editOperations.filter(op => {
      const status = editStatuses[op.editId];
      console.log(`Checking edit ${op.editId}, status: ${status}`);
      return status !== 'denied';
    });
    
    console.log(`After filtering denied edits: ${acceptedOperations.length} operations to apply`);
    
    if (acceptedOperations.length === 0) {
      console.log('No accepted edit operations to apply, completing immediately');
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
        
        // We need to apply edits directly to the editor state
        // since some edits (add/delete) can't be handled by HTML manipulation
        
        let hasChanges = false;
        
        // Process operations in a specific order: deletes first, then replacements, then adds
        // This prevents index shifting problems
        
        // First collect operations by type
        const deleteOps = acceptedOperations.filter(op => op.operation === 'delete');
        const replaceOps = acceptedOperations.filter(op => op.operation === 'replace');
        const addOps = acceptedOperations.filter(op => op.operation === 'add');
        
        console.log(`Processing operations in order: ${deleteOps.length} deletes, ${replaceOps.length} replacements, ${addOps.length} additions`);
        
        // Process delete operations first (in reverse order to avoid index shifting)
        if (deleteOps.length > 0) {
          // Sort in reverse order of index to avoid shifting issues
          deleteOps.sort((a, b) => {
            if (a.tagIndex === undefined || b.tagIndex === undefined) return 0;
            return b.tagIndex - a.tagIndex;
          });
          
          for (const edit of deleteOps) {
            if (edit.tagIndex === undefined) continue;
            
            // Get all nodes of the specified type
            const nodes: { node: any, pos: number }[] = [];
            editor.state.doc.descendants((node: any, pos: number) => {
              if ((edit.tagType === 'p' && node.type.name === 'paragraph') ||
                  (edit.tagType === 'h1' && node.type.name === 'heading')) {
                nodes.push({ node, pos });
              }
              return true;
            });
            
            // Sort nodes by position for correct indexing
            nodes.sort((a, b) => a.pos - b.pos);
            
            // Find the target node
            if (edit.tagIndex < nodes.length) {
              const { node, pos } = nodes[edit.tagIndex];
              console.log(`Batch deleting node at index ${edit.tagIndex}, pos ${pos}`);
              
              // Create a transaction to delete the node
              const tr = editor.state.tr;
              const start = pos;
              const end = pos + node.nodeSize;
              
              // Delete the node
              tr.delete(start, end);
              editor.view.dispatch(tr);
              hasChanges = true;
            }
          }
        }
        
        // Process replace operations
        if (replaceOps.length > 0) {
          for (const edit of replaceOps) {
            if (edit.tagIndex === undefined || !edit.newContent) continue;
            
            // Get all nodes of the specified type
            const nodes: { node: any, pos: number }[] = [];
            editor.state.doc.descendants((node: any, pos: number) => {
              const isTargetNodeType = 
                (edit.tagType === 'p' && node.type.name === 'paragraph') ||
                (edit.tagType === 'h1' && node.type.name === 'heading');
              
              if (isTargetNodeType) {
                nodes.push({ node, pos });
              }
              return true;
            });
            
            // Sort nodes by position for correct indexing
            nodes.sort((a, b) => a.pos - b.pos);
            
            // Find the target node
            if (edit.tagIndex < nodes.length) {
              const { node, pos } = nodes[edit.tagIndex];
              console.log(`Batch replacing content in node at index ${edit.tagIndex}, pos ${pos}`);
              
              // Create a transaction to replace the content
              const tr = editor.state.tr;
              const start = pos;
              const end = pos + node.nodeSize;
              
              // Create a new node with the updated content
              const newNode = node.type.create(
                node.attrs, 
                editor.schema.text(edit.newContent.replace(/<\/?[^>]+(>|$)/g, ""))
              );
              
              // Replace the node
              tr.replaceWith(start, end, newNode);
              editor.view.dispatch(tr);
              hasChanges = true;
            }
          }
        }
        
        // Process add operations last
        if (addOps.length > 0) {
          for (const edit of addOps) {
            if (edit.referenceNodeIndex === undefined || !edit.position || !edit.newContent) continue;
            
            // Get all nodes of the specified type
            const nodes: { node: any, pos: number }[] = [];
            editor.state.doc.descendants((node: any, pos: number) => {
              if ((edit.tagType === 'p' && node.type.name === 'paragraph') ||
                  (edit.tagType === 'h1' && node.type.name === 'heading')) {
                nodes.push({ node, pos });
              }
              return true;
            });
            
            // Sort nodes by position for correct indexing
            nodes.sort((a, b) => a.pos - b.pos);
            
            // Find the reference node
            if (edit.referenceNodeIndex < nodes.length) {
              const { node, pos } = nodes[edit.referenceNodeIndex];
              console.log(`Batch adding ${edit.tagType} ${edit.position} reference node at index ${edit.referenceNodeIndex}, pos ${pos}`);
              
              // Create a transaction
              const tr = editor.state.tr;
              
              // Create a new node with the content
              const schema = editor.state.schema;
              const newNode = edit.tagType === 'p' 
                ? schema.nodes.paragraph.create(
                    null, 
                    schema.text(edit.newContent.replace(/<\/?[^>]+(>|$)/g, ""))
                  )
                : schema.nodes.heading.create(
                    { level: 1 }, 
                    schema.text(edit.newContent.replace(/<\/?[^>]+(>|$)/g, ""))
                  );
              
              // Determine position to insert
              const insertPos = edit.position === 'before' 
                ? pos 
                : pos + node.nodeSize;
              
              // Insert the node
              tr.insert(insertPos, newNode);
              editor.view.dispatch(tr);
              hasChanges = true;
            }
          }
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
  }, [editOperations, editStatuses, onComplete]);

  // Clean up global flag when component unmounts
  useEffect(() => {
    return () => {
      isCurrentlyApplyingEdits = false;
    };
  }, []);

  return null;
} 