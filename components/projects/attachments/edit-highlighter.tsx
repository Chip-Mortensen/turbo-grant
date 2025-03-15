import { useEffect } from 'react';
import { EditSuggestion } from '@/app/api/attachments/ai-edit/route';
import { findTagByTypeAndIndex, TagInfo } from '@/utils/html-parser';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { Transaction } from 'prosemirror-state';

interface EditHighlighterProps {
  editor: any;
  editSuggestions: EditSuggestion[] | null;
  mode?: 'preview' | 'apply';
}

interface TargetNode {
  node: ProseMirrorNode;
  pos: number;
}

interface NodeWithEdit {
  targetNode?: TargetNode;
  edit: any; // The edit details
  referenceNode?: TargetNode; // For add operations
}

export function EditHighlighter({ editor, editSuggestions, mode = 'preview' }: EditHighlighterProps) {
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
      }
      
      .ProseMirror .ai-edit-new-node {
        background-color: rgba(34, 197, 94, 0.1) !important;
        border-left: 3px solid rgb(22, 163, 74) !important;
        padding-left: 8px !important;
      }
      
      .ProseMirror .ai-edit-deleted-node {
        background-color: rgba(239, 68, 68, 0.1) !important;
        border-left: 3px solid rgb(220, 38, 38) !important;
        text-decoration: line-through !important;
        color: rgb(220, 38, 38) !important;
      }
    `;
    
    return () => {
      if (styleElement?.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  // Helper function to find nodes by type and index
  const findNodesByType = (editor: any, tagType: string): TargetNode[] => {
    const nodes: TargetNode[] = [];
    
    editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
      if (node.type.name === (tagType === 'h1' ? 'heading' : 'paragraph')) {
        nodes.push({ node, pos });
      }
    });

    // Sort nodes by their position to ensure correct order
    return nodes.sort((a, b) => a.pos - b.pos);
  };

  // Apply the edits
  useEffect(() => {
    if (!editor || !editSuggestions?.length) return;

    editSuggestions.forEach(suggestion => {
      console.log('\n=== PROCESSING SUGGESTION ===');
      console.log('Original suggestion:', suggestion);

      // Handle both old and new format
      const edits = suggestion.edits || [{ 
        operation: 'replace',
        tagType: suggestion.tagType, 
        tagIndex: suggestion.tagIndex, 
        originalContent: suggestion.originalContent, 
        newContent: suggestion.newContent,
        explanation: suggestion.reason
      }];

      console.log(`Processing ${edits.length} edits`);

      // First, collect all target nodes for all edits
      const nodesToEdit: NodeWithEdit[] = [];
      
      for (const edit of edits) {
        // Handle different operation types
        switch (edit.operation) {
          case 'replace':
            // Find target node for replacement
            if (edit.tagType && edit.tagIndex !== undefined) {
              const nodes = findNodesByType(editor, edit.tagType);
              const targetNode = nodes[edit.tagIndex];
              
              if (targetNode) {
                console.log(`Found target node for replace at index ${edit.tagIndex}`);
                nodesToEdit.push({ targetNode, edit });
              } else {
                console.log(`Target node not found for replace at index ${edit.tagIndex}!`);
              }
            }
            break;
            
          case 'delete':
            // Find target node for deletion
            if (edit.tagType && edit.tagIndex !== undefined) {
              const nodes = findNodesByType(editor, edit.tagType);
              const targetNode = nodes[edit.tagIndex];
              
              if (targetNode) {
                console.log(`Found target node for delete at index ${edit.tagIndex}`);
                nodesToEdit.push({ targetNode, edit });
              } else {
                console.log(`Target node not found for delete at index ${edit.tagIndex}!`);
              }
            }
            break;
            
          case 'add':
            // Find reference node for adding
            if (edit.referenceNodeType !== undefined && edit.referenceNodeIndex !== undefined) {
              const nodes = findNodesByType(editor, edit.referenceNodeType);
              const referenceNode = nodes[edit.referenceNodeIndex];
              
              if (referenceNode) {
                console.log(`Found reference node for add at index ${edit.referenceNodeIndex}`);
                nodesToEdit.push({ edit, referenceNode });
              } else {
                console.log(`Reference node not found for add at index ${edit.referenceNodeIndex}!`);
              }
            }
            break;
        }
      }

      // Sort operations by type and position
      // 1. Deletions (in reverse document order)
      // 2. Replacements (in reverse document order)
      // 3. Additions (in document order)
      const deleteEdits = nodesToEdit
        .filter(item => item.edit.operation === 'delete' && item.targetNode)
        .sort((a, b) => b.targetNode!.pos - a.targetNode!.pos);
        
      const replaceEdits = nodesToEdit
        .filter(item => item.edit.operation === 'replace' && item.targetNode)
        .sort((a, b) => b.targetNode!.pos - a.targetNode!.pos);
        
      const addEdits = nodesToEdit
        .filter(item => item.edit.operation === 'add' && item.referenceNode)
        .sort((a, b) => {
          // For additions, sort by reference node position
          // If position is 'after', we want to process from start to end
          // If position is 'before', we want to process from end to start
          if (a.edit.position === 'after' && b.edit.position === 'after') {
            return a.referenceNode!.pos - b.referenceNode!.pos;
          } else if (a.edit.position === 'before' && b.edit.position === 'before') {
            return b.referenceNode!.pos - a.referenceNode!.pos;
          } else {
            // Process 'after' operations first, then 'before' operations
            return a.edit.position === 'after' ? -1 : 1;
          }
        });
      
      // Combine all edits in the correct processing order
      const sortedEdits = [...deleteEdits, ...replaceEdits, ...addEdits];
      console.log(`Applying edits in order: ${sortedEdits.length} total (${deleteEdits.length} deletions, ${replaceEdits.length} replacements, ${addEdits.length} additions)`);
      
      // Now apply all edits in a single transaction
      editor
        .chain()
        .command(({ tr }: { tr: Transaction }) => {
          for (const item of sortedEdits) {
            const { edit } = item;
            
            switch (edit.operation) {
              case 'replace':
                if (item.targetNode) {
                  // Clean the content by removing any HTML tags
                  const originalText = edit.originalContent?.replace(/<[^>]+>/g, '') || '';
                  const newText = edit.newContent?.replace(/<[^>]+>/g, '') || '';

                  if (mode === 'preview') {
                    // Find common prefix and suffix
                    let prefixLength = 0;
                    while (prefixLength < originalText.length && prefixLength < newText.length && 
                           originalText[prefixLength] === newText[prefixLength]) {
                      prefixLength++;
                    }

                    let suffixLength = 0;
                    while (suffixLength < originalText.length - prefixLength && 
                           suffixLength < newText.length - prefixLength && 
                           originalText[originalText.length - 1 - suffixLength] === newText[newText.length - 1 - suffixLength]) {
                      suffixLength++;
                    }

                    // Extract the parts
                    const commonPrefix = originalText.slice(0, prefixLength);
                    const commonSuffix = originalText.slice(originalText.length - suffixLength);
                    const removedMiddle = originalText.slice(prefixLength, originalText.length - suffixLength);
                    const addedMiddle = newText.slice(prefixLength, newText.length - suffixLength);

                    // Create the preview node with diff marks
                    const previewNode = {
                      type: edit.tagType === 'h1' ? 'heading' : 'paragraph',
                      attrs: edit.tagType === 'h1' ? { level: 1 } : {},
                      content: [
                        // Only add text nodes for non-empty content
                        ...(commonPrefix ? [{ type: 'text', text: commonPrefix }] : []),
                        ...(removedMiddle ? [{
                          type: 'text',
                          marks: [{ type: 'diffRemoved' }],
                          text: removedMiddle
                        }] : []),
                        ...(addedMiddle ? [{
                          type: 'text',
                          marks: [{ type: 'diffAdded' }],
                          text: addedMiddle
                        }] : []),
                        ...(commonSuffix ? [{ type: 'text', text: commonSuffix }] : [])
                      ].filter(Boolean)
                    };

                    // Ensure there's at least one text node
                    if (previewNode.content.length === 0) {
                      previewNode.content = [{ type: 'text', text: newText }];
                    }

                    // Replace with preview
                    const start = item.targetNode.pos;
                    const end = start + item.targetNode.node.nodeSize;
                    tr.replaceWith(start, end, editor.schema.nodeFromJSON(previewNode));
                  } else {
                    // In apply mode, just replace with the new content directly
                    const newNode = {
                      type: edit.tagType === 'h1' ? 'heading' : 'paragraph',
                      attrs: edit.tagType === 'h1' ? { level: 1 } : {},
                      content: [{ type: 'text', text: newText }]
                    };

                    const start = item.targetNode.pos;
                    const end = start + item.targetNode.node.nodeSize;
                    tr.replaceWith(start, end, editor.schema.nodeFromJSON(newNode));
                  }
                }
                break;
                
              case 'delete':
                if (item.targetNode) {
                  if (mode === 'preview') {
                    // In preview mode, show with strikethrough styling
                    const deletePreviewNode = {
                      type: edit.tagType === 'h1' ? 'heading' : 'paragraph',
                      attrs: edit.tagType === 'h1' ? { level: 1 } : {},
                      content: [{
                        type: 'text',
                        marks: [{ type: 'diffRemoved' }],
                        text: item.targetNode.node.textContent
                      }]
                    };
                    
                    const start = item.targetNode.pos;
                    const end = start + item.targetNode.node.nodeSize;
                    tr.replaceWith(start, end, editor.schema.nodeFromJSON(deletePreviewNode));
                  } else {
                    // In apply mode, actually delete the node
                    const start = item.targetNode.pos;
                    const end = start + item.targetNode.node.nodeSize;
                    tr.delete(start, end);
                  }
                }
                break;
                
              case 'add':
                if (item.referenceNode && edit.newContent) {
                  // Clean the content by removing any HTML tags
                  const newText = edit.newContent.replace(/<[^>]+>/g, '');
                  
                  // Create the new node
                  const newNode = {
                    type: edit.tagType === 'h1' ? 'heading' : 'paragraph',
                    attrs: edit.tagType === 'h1' ? { level: 1 } : {},
                    content: [] as any[]
                  };
                  
                  if (mode === 'preview') {
                    // In preview mode, show with added styling
                    newNode.content = [{
                      type: 'text',
                      marks: [{ type: 'diffAdded' }],
                      text: newText
                    }];
                  } else {
                    // In apply mode, just add the normal text
                    newNode.content = [{ type: 'text', text: newText }];
                  }
                  
                  // Determine position for insertion
                  let insertPos;
                  if (edit.position === 'before') {
                    insertPos = item.referenceNode.pos;
                  } else { // 'after'
                    insertPos = item.referenceNode.pos + item.referenceNode.node.nodeSize;
                  }
                  
                  // Insert the new node
                  tr.insert(insertPos, editor.schema.nodeFromJSON(newNode));
                }
                break;
            }
          }
          return true;
        })
        .run();

      console.log('=== EDITS APPLIED SUCCESSFULLY ===');
    });
  }, [editor, editSuggestions, mode]);

  return null;
} 