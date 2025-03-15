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
  targetNode: TargetNode;
  edit: any; // The edit details
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
    `;
    
    return () => {
      if (styleElement?.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  // Apply the edits
  useEffect(() => {
    if (!editor || !editSuggestions?.length) return;

    editSuggestions.forEach(suggestion => {
      console.log('\n=== PROCESSING SUGGESTION ===');
      console.log('Original suggestion:', suggestion);

      // Handle both old and new format
      const edits = suggestion.edits || [{ 
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
        // Find all nodes of the target type
        const nodes: TargetNode[] = [];
        
        // First pass: collect all nodes of the target type
        editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
          if (node.type.name === (edit.tagType === 'h1' ? 'heading' : 'paragraph')) {
            console.log(`Found ${node.type.name} at pos ${pos} with content:`, node.textContent);
            nodes.push({ node, pos });
          }
        });

        // Sort nodes by their position to ensure correct order
        nodes.sort((a, b) => a.pos - b.pos);

        console.log(`Found ${nodes.length} ${edit.tagType} nodes`);
        
        const targetNode = nodes[edit.tagIndex];

        if (!targetNode) {
          console.log(`Target node not found for edit at index ${edit.tagIndex}!`);
          continue;
        }

        console.log(`Selected node at index ${edit.tagIndex} with content:`, targetNode.node.textContent);
        
        nodesToEdit.push({ targetNode, edit });
      }

      // Sort nodes in reverse document order to avoid position shifts
      nodesToEdit.sort((a, b) => b.targetNode.pos - a.targetNode.pos);
      
      // Now apply all edits in a single transaction
      editor
        .chain()
        .command(({ tr }: { tr: Transaction }) => {
          for (const { targetNode, edit } of nodesToEdit) {
            // Clean the content by removing any HTML tags
            const originalText = edit.originalContent.replace(/<[^>]+>/g, '');
            const newText = edit.newContent.replace(/<[^>]+>/g, '');

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
              const start = targetNode.pos;
              const end = start + targetNode.node.nodeSize;
              tr.replaceWith(start, end, editor.schema.nodeFromJSON(previewNode));
            } else {
              // In apply mode, just replace with the new content directly
              const newNode = {
                type: edit.tagType === 'h1' ? 'heading' : 'paragraph',
                attrs: edit.tagType === 'h1' ? { level: 1 } : {},
                content: [{ type: 'text', text: newText }]
              };

              const start = targetNode.pos;
              const end = start + targetNode.node.nodeSize;
              tr.replaceWith(start, end, editor.schema.nodeFromJSON(newNode));
            }
          }
          return true;
        })
        .run();

      console.log('\n=== ACTUAL EDITOR HTML AFTER UPDATE ===');
      console.log(editor.getHTML());
    });
  }, [editor, editSuggestions, mode]);

  return null;
} 