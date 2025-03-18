import { useEffect, useRef } from 'react';
import { EditOperation } from './types';

interface IndividualEditHandlerProps {
  editor: any;
  edit: EditOperation;
  onComplete?: (editId: string) => void;
}

export function IndividualEditHandler({ 
  editor, 
  edit, 
  onComplete 
}: IndividualEditHandlerProps) {
  // Use a ref to track if the edit has been applied
  const appliedRef = useRef(false);
  
  // Apply the edit once when the component mounts
  useEffect(() => {
    if (appliedRef.current || !editor) return;

    try {
      console.log(`Applying individual edit: ${edit.operation} (${edit.editId})`);
      
      // IMPORTANT: Use ProseMirror directly instead of manipulating DOM
      // This ensures we're working with the actual editor state
      
      // For replacement operations
      if (edit.operation === 'replace' && edit.tagIndex !== undefined && edit.newContent) {
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
        
        // Log all nodes for debugging
        console.log(`Found ${nodes.length} nodes of type ${edit.tagType}`);
        nodes.forEach((n, i) => {
          console.log(`Node ${i}: pos ${n.pos}, type ${n.node.type.name}, text "${n.node.textContent.substring(0, 20)}..."`);
        });
        
        // Find the target node
        if (edit.tagIndex < nodes.length) {
          const { node, pos } = nodes[edit.tagIndex];
          console.log(`Replacing content in node at index ${edit.tagIndex}, pos ${pos}`);
          
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
          
          // Mark as applied
          appliedRef.current = true;
          
          // Notify parent component
          if (onComplete) {
            onComplete(edit.editId);
          }
        } else {
          console.error(`Edit target index ${edit.tagIndex} out of range (0-${nodes.length - 1})`);
        }
      }
      // For add operations
      else if (edit.operation === 'add' && edit.referenceNodeIndex !== undefined && edit.position && edit.newContent) {
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
          console.log(`Adding ${edit.tagType} ${edit.position} reference node at index ${edit.referenceNodeIndex}, pos ${pos}`);
          
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
          
          // Mark as applied
          appliedRef.current = true;
          
          // Notify parent component
          if (onComplete) {
            onComplete(edit.editId);
          }
        } else {
          console.error(`Add reference index ${edit.referenceNodeIndex} out of range (0-${nodes.length - 1})`);
        }
      }
      // For delete operations
      else if (edit.operation === 'delete' && edit.tagIndex !== undefined) {
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
          console.log(`Deleting node at index ${edit.tagIndex}, pos ${pos}`);
          
          // Create a transaction to delete the node
          const tr = editor.state.tr;
          const start = pos;
          const end = pos + node.nodeSize;
          
          // Delete the node
          tr.delete(start, end);
          editor.view.dispatch(tr);
          
          // Mark as applied
          appliedRef.current = true;
          
          // Notify parent component
          if (onComplete) {
            onComplete(edit.editId);
          }
        } else {
          console.error(`Delete target index ${edit.tagIndex} out of range (0-${nodes.length - 1})`);
        }
      }
    } catch (error) {
      console.error('Error applying individual edit:', error);
      
      // Mark as applied even if it failed, to prevent repeated attempts
      appliedRef.current = true;
      
      // Notify parent component of completion (even with failure)
      if (onComplete) {
        onComplete(edit.editId);
      }
    }
    
  }, [editor, edit, onComplete]);
  
  return null;
} 