import { useEffect } from 'react';
import { EditSuggestion } from '@/app/api/attachments/ai-edit/route';
import { findTagByTypeAndIndex, TagInfo } from '@/utils/html-parser';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { Transaction } from 'prosemirror-state';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

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
      
      .ProseMirror .ai-edit-preview-wrapper {
        position: relative;
        margin: 8px 0;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      
      .ProseMirror .ai-edit-preview-original {
        margin-bottom: 8px;
      }
      
      .ProseMirror .ai-edit-preview-new {
        margin-top: 8px;
      }
      
      .ProseMirror .ai-edit-preview-divider {
        height: 1px;
        background-color: #ccc;
        margin: 8px 0;
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
    const sortedNodes = nodes.sort((a, b) => a.pos - b.pos);
    
    // Log all nodes of this type for debugging (truncated)
    console.log(`Found ${sortedNodes.length} nodes of type ${tagType}:`);
    sortedNodes.forEach((node, idx) => {
      console.log(`  [${idx}] pos: ${node.pos}, size: ${node.node.nodeSize}, content: "${node.node.textContent.substring(0, 20)}${node.node.textContent.length > 20 ? '...' : ''}"`);
    });
    
    return sortedNodes;
  };

  // Apply the edits
  useEffect(() => {
    if (!editor || !editSuggestions?.length) return;

    // Log the current document structure before any edits (truncated)
    console.log("DOCUMENT STRUCTURE BEFORE EDITS:");
    let blockCount = 0;
    editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
      if (node.isBlock) {
        if (blockCount < 10) { // Only log first 10 blocks
          console.log(`Block at pos ${pos}: type=${node.type.name}, size=${node.nodeSize}, content="${node.textContent.substring(0, 20)}${node.textContent.length > 20 ? '...' : ''}"`);
        } else if (blockCount === 10) {
          console.log(`... (additional blocks omitted)`);
        }
        blockCount++;
      }
    });
    console.log(`Total blocks: ${blockCount}`);

    // Debug: Log the mode
    console.log(`Edit mode: ${mode}`);

    // For apply mode, use the absolute simplest approach possible
    if (mode === 'apply') {
      console.log("Using DIRECT HTML REPLACEMENT approach for apply mode");
      
      try {
        // First, clean up any existing preview decorations
        // Remove any existing preview plugin
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
        
        // Now proceed with the normal apply logic
        // Get all paragraphs directly from the editor's document model
        const paragraphs: string[] = [];
        let hasHeading = false;
        let headingText = '';
        
        // First pass to collect all paragraphs and heading
        editor.state.doc.descendants((node: ProseMirrorNode) => {
          if (node.type.name === 'heading') {
            hasHeading = true;
            headingText = node.textContent;
            return false; // Don't descend into heading
          } else if (node.type.name === 'paragraph') {
            // Get the raw text content without any preview elements
            paragraphs.push(node.textContent);
            return false; // Don't descend into paragraph
          }
          return true; // Continue traversal
        });
        
        console.log(`Found ${paragraphs.length} paragraphs and heading: ${hasHeading ? 'yes' : 'no'}`);
        
        // Collect all edits from all suggestions
        const allEdits: any[] = [];
        for (const suggestion of editSuggestions) {
          // Handle both old and new format
          const edits = suggestion.edits || [{ 
            operation: 'replace',
            tagType: suggestion.tagType, 
            tagIndex: suggestion.tagIndex, 
            originalContent: suggestion.originalContent, 
            newContent: suggestion.newContent,
            explanation: suggestion.reason
          }];
          
          allEdits.push(...edits);
        }
        
        // Create a copy of the paragraphs array that we'll modify
        const modifiedParagraphs = [...paragraphs];
        
        // Process deletions first (from highest index to lowest)
        allEdits
          .filter(edit => edit.operation === 'delete' && edit.tagType === 'p' && edit.tagIndex !== undefined)
          .sort((a, b) => (b.tagIndex || 0) - (a.tagIndex || 0))
          .forEach(edit => {
            const index = edit.tagIndex;
            if (index >= 0 && index < modifiedParagraphs.length) {
              console.log(`Deleting paragraph at index ${index}`);
              modifiedParagraphs.splice(index, 1);
            } else {
              console.warn(`Delete index ${index} out of range (0-${modifiedParagraphs.length - 1})`);
            }
          });
        
        // Process replacements
        allEdits
          .filter(edit => edit.operation === 'replace' && edit.tagType === 'p' && edit.tagIndex !== undefined && edit.newContent)
          .forEach(edit => {
            const index = edit.tagIndex;
            if (index >= 0 && index < modifiedParagraphs.length) {
              console.log(`Replacing content at index ${index}`);
              // Clean the content (remove HTML tags)
              const newContent = edit.newContent.replace(/<\/?[^>]+(>|$)/g, "");
              modifiedParagraphs[index] = newContent;
            } else {
              console.warn(`Replace index ${index} out of range (0-${modifiedParagraphs.length - 1})`);
            }
          });
        
        // Process additions
        const additions: {index: number, content: string, position: 'before' | 'after'}[] = [];
        
        allEdits
          .filter(edit => edit.operation === 'add' && edit.tagType === 'p' && edit.referenceNodeIndex !== undefined && edit.position && edit.newContent)
          .forEach(edit => {
            const refIndex = edit.referenceNodeIndex;
            if (refIndex >= 0 && refIndex < modifiedParagraphs.length) {
              console.log(`Adding paragraph ${edit.position} reference index ${refIndex}`);
              // Clean the content (remove HTML tags)
              const newContent = edit.newContent.replace(/<\/?[^>]+(>|$)/g, "");
              additions.push({
                index: refIndex,
                content: newContent,
                position: edit.position
              });
            } else {
              console.warn(`Add reference index ${refIndex} out of range (0-${modifiedParagraphs.length - 1})`);
            }
          });
        
        // Sort additions to process 'before' first (in reverse order) then 'after' (in order)
        additions.sort((a, b) => {
          if (a.position !== b.position) {
            return a.position === 'before' ? -1 : 1;
          }
          if (a.position === 'before') {
            return b.index - a.index; // Process 'before' from highest index to lowest
          }
          return a.index - b.index; // Process 'after' from lowest index to highest
        });
        
        // Apply the additions
        additions.forEach(addition => {
          if (addition.position === 'before') {
            modifiedParagraphs.splice(addition.index, 0, addition.content);
          } else { // 'after'
            modifiedParagraphs.splice(addition.index + 1, 0, addition.content);
          }
        });
        
        // Build the new HTML
        let newHtml = '';
        
        // Add heading if it exists
        if (hasHeading) {
          newHtml += `<h1>${headingText}</h1>`;
        }
        
        // Add all paragraphs
        modifiedParagraphs.forEach(content => {
          newHtml += `<p>${content}</p>`;
        });
        
        console.log(`Built new HTML with ${modifiedParagraphs.length} paragraphs`);
        console.log(`New HTML length: ${newHtml.length}`);
        
        // Set the content in one go
        editor.commands.setContent(newHtml);
        
        console.log('=== DIRECT HTML REPLACEMENT COMPLETED ===');
      } catch (error) {
        console.error('Error during direct HTML replacement:', error);
      }
      
      return;
    }
    
    // For preview mode, use ProseMirror decorations
    if (mode === 'preview') {
      console.log("Using PROSEMIRROR DECORATIONS for preview mode");
      
      try {
        // First, remove any existing preview plugin
        const existingPluginKey = 'aiEditPreviewPlugin';
        
        // Create a new state without the existing preview plugin
        const newPlugins = editor.view.state.plugins.filter((plugin: any) => {
          return !(plugin.key && plugin.key.startsWith && plugin.key.startsWith(existingPluginKey));
        });
        
        // Create a new plugin for decorations
        const previewPlugin = new Plugin({
          key: new PluginKey(existingPluginKey),
          props: {
            decorations(state) {
              // Collect all edits from all suggestions
              const allEdits: any[] = [];
              for (const suggestion of editSuggestions) {
                const edits = suggestion.edits || [{ 
                  operation: 'replace',
                  tagType: suggestion.tagType, 
                  tagIndex: suggestion.tagIndex, 
                  originalContent: suggestion.originalContent, 
                  newContent: suggestion.newContent,
                  explanation: suggestion.reason
                }];
                
                allEdits.push(...edits);
              }
              
              // Find all paragraph nodes
              const paragraphs: {node: ProseMirrorNode, pos: number}[] = [];
              state.doc.descendants((node, pos) => {
                if (node.type.name === 'paragraph') {
                  paragraphs.push({node, pos});
                  return false; // Don't descend into paragraph
                }
                return true; // Continue traversal
              });
              
              // Create decorations
              const decorations: Decoration[] = [];
              
              // Process replacements
              allEdits
                .filter(edit => edit.operation === 'replace' && edit.tagType === 'p' && edit.tagIndex !== undefined && edit.newContent)
                .forEach(edit => {
                  const index = edit.tagIndex;
                  if (index >= 0 && index < paragraphs.length) {
                    const { node, pos } = paragraphs[index];
                    const originalText = node.textContent;
                    const newContent = edit.newContent.replace(/<\/?[^>]+(>|$)/g, "");
                    
                    // Create a widget decoration that shows both the original and new content
                    const decoration = Decoration.widget(pos, () => {
                      const container = document.createElement('div');
                      container.className = 'ai-edit-preview-wrapper';
                      
                      const original = document.createElement('div');
                      original.className = 'ai-edit-diff-removed ai-edit-preview-original';
                      original.textContent = originalText;
                      container.appendChild(original);
                      
                      const divider = document.createElement('div');
                      divider.className = 'ai-edit-preview-divider';
                      divider.style.height = '1px';
                      divider.style.backgroundColor = '#ccc';
                      divider.style.margin = '4px 0';
                      container.appendChild(divider);
                      
                      const newText = document.createElement('div');
                      newText.className = 'ai-edit-diff-added ai-edit-preview-new';
                      newText.textContent = newContent;
                      container.appendChild(newText);
                      
                      return container;
                    });
                    
                    // Add a node decoration to hide the original paragraph
                    const hideDecoration = Decoration.node(pos, pos + node.nodeSize, {
                      style: 'display: none;'
                    });
                    
                    decorations.push(decoration);
                    decorations.push(hideDecoration);
                    
                    console.log(`Added decoration for paragraph at index ${index}`);
                  }
                });
              
              // Process deletions
              allEdits
                .filter(edit => edit.operation === 'delete' && edit.tagType === 'p' && edit.tagIndex !== undefined)
                .forEach(edit => {
                  const index = edit.tagIndex;
                  if (index >= 0 && index < paragraphs.length) {
                    const { node, pos } = paragraphs[index];
                    
                    // Add a node decoration to mark the paragraph as deleted
                    const decoration = Decoration.node(pos, pos + node.nodeSize, {
                      class: 'ai-edit-deleted-node'
                    });
                    
                    decorations.push(decoration);
                    
                    console.log(`Added deletion decoration for paragraph at index ${index}`);
                  }
                });
              
              // Process additions
              allEdits
                .filter(edit => edit.operation === 'add' && edit.tagType === 'p' && edit.referenceNodeIndex !== undefined && edit.position && edit.newContent)
                .forEach(edit => {
                  const refIndex = edit.referenceNodeIndex;
                  if (refIndex >= 0 && refIndex < paragraphs.length) {
                    const { node, pos } = paragraphs[refIndex];
                    const newContent = edit.newContent.replace(/<\/?[^>]+(>|$)/g, "");
                    
                    // Create a widget decoration that shows the new content
                    const decoration = Decoration.widget(
                      edit.position === 'before' ? pos : pos + node.nodeSize, 
                      () => {
                        const newParagraph = document.createElement('p');
                        newParagraph.className = 'ai-edit-new-node';
                        newParagraph.textContent = newContent;
                        return newParagraph;
                      }
                    );
                    
                    decorations.push(decoration);
                    
                    console.log(`Added addition decoration ${edit.position} reference index ${refIndex}`);
                  }
                });
              
              return DecorationSet.create(state.doc, decorations);
            }
          }
        });
        
        // Add the plugin to the editor
        editor.view.updateState(
          editor.view.state.reconfigure({ plugins: [...newPlugins, previewPlugin] })
        );
        
        console.log('=== PREVIEW DECORATIONS ADDED ===');
      } catch (error) {
        console.error('Error during preview creation:', error);
      }
      
      return;
    }
  }, [editor, editSuggestions, mode]);
  
  // Super simple fallback approach
  const applySimpleEdits = () => {
    if (!editor || !editSuggestions?.length) return;
    
    try {
      // Get all paragraphs directly from the editor
      const paragraphs: {text: string, node: ProseMirrorNode, pos: number}[] = [];
      
      editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
        if (node.type.name === 'paragraph') {
          paragraphs.push({
            text: node.textContent,
            node,
            pos
          });
        }
      });
      
      console.log(`Found ${paragraphs.length} paragraphs directly from editor`);
      
      // Collect all edits
      const allEdits: any[] = [];
      for (const suggestion of editSuggestions) {
        const edits = suggestion.edits || [{ 
          operation: 'replace',
          tagType: suggestion.tagType, 
          tagIndex: suggestion.tagIndex, 
          originalContent: suggestion.originalContent, 
          newContent: suggestion.newContent,
          explanation: suggestion.reason
        }];
        
        allEdits.push(...edits);
      }
      
      // Create a completely new document
      let newHtml = '';
      
      // Add the heading if it exists
      const headingNode = editor.state.doc.firstChild;
      if (headingNode && headingNode.type.name === 'heading') {
        newHtml += `<h1>${headingNode.textContent}</h1>`;
      }
      
      // Process deletions (mark paragraphs to skip)
      const deleteIndices = new Set<number>();
      allEdits
        .filter(edit => edit.operation === 'delete' && edit.tagType === 'p' && edit.tagIndex !== undefined)
        .forEach(edit => {
          const index = edit.tagIndex;
          if (index >= 0 && index < paragraphs.length) {
            console.log(`Marking paragraph at index ${index} for deletion`);
            deleteIndices.add(index);
          }
        });
      
      // Process replacements and keep original paragraphs
      const newParagraphs: string[] = paragraphs.map((p, index) => {
        // Skip deleted paragraphs
        if (deleteIndices.has(index)) {
          return '';
        }
        
        // Check if this paragraph should be replaced
        const replaceEdit = allEdits.find(edit => 
          edit.operation === 'replace' && 
          edit.tagType === 'p' && 
          edit.tagIndex === index
        );
        
        if (replaceEdit && replaceEdit.newContent) {
          console.log(`Replacing paragraph at index ${index}`);
          const newContent = replaceEdit.newContent.replace(/<\/?[^>]+(>|$)/g, "");
          return `<p>${newContent}</p>`;
        }
        
        // Keep original paragraph
        return `<p>${p.text}</p>`;
      }).filter(p => p !== ''); // Remove empty paragraphs
      
      // Process additions
      allEdits
        .filter(edit => edit.operation === 'add' && edit.tagType === 'p' && edit.referenceNodeIndex !== undefined && edit.position && edit.newContent)
        .forEach(edit => {
          const refIndex = edit.referenceNodeIndex;
          // Adjust for deletions
          let adjustedIndex = refIndex;
          for (let i = 0; i < refIndex; i++) {
            if (deleteIndices.has(i)) {
              adjustedIndex--;
            }
          }
          
          if (adjustedIndex >= 0 && adjustedIndex < newParagraphs.length) {
            console.log(`Adding paragraph ${edit.position} adjusted index ${adjustedIndex}`);
            const newContent = edit.newContent.replace(/<\/?[^>]+(>|$)/g, "");
            const newParagraph = `<p>${newContent}</p>`;
            
            if (edit.position === 'before') {
              newParagraphs.splice(adjustedIndex, 0, newParagraph);
            } else { // 'after'
              newParagraphs.splice(adjustedIndex + 1, 0, newParagraph);
            }
          }
        });
      
      // Join all paragraphs
      newHtml += newParagraphs.join('\n');
      
      // Set the content
      editor.commands.setContent(newHtml);
      
      console.log('=== SUPER SIMPLE FALLBACK COMPLETED ===');
    } catch (error) {
      console.error('Error during super simple fallback:', error);
    }
  };

  // Helper function to extract paragraphs from HTML
  const extractParagraphs = (html: string): string[] => {
    const paragraphs: string[] = [];
    let currentIndex = 0;
    
    // Skip the heading if present
    const headingMatch = html.match(/<h1[^>]*>.*?<\/h1>/i);
    if (headingMatch) {
      currentIndex = html.indexOf(headingMatch[0]) + headingMatch[0].length;
    }
    
    // Extract all paragraphs
    const regex = /<p[^>]*>(.*?)<\/p>/gi;
    let match;
    
    while ((match = regex.exec(html.substring(currentIndex))) !== null) {
      paragraphs.push(match[0]);
    }
    
    return paragraphs;
  };

  // Cleanup function to remove all decorations when component unmounts
  useEffect(() => {
    return () => {
      if (editor) {
        try {
          // Remove any existing preview plugin
          const existingPluginKey = 'aiEditPreviewPlugin';
          const newPlugins = editor.view.state.plugins.filter((plugin: any) => {
            return !(plugin.key && plugin.key.startsWith && plugin.key.startsWith(existingPluginKey));
          });
          
          // Update the editor state to remove the preview plugin
          editor.view.updateState(
            editor.view.state.reconfigure({ plugins: newPlugins })
          );
          
          // Clean up any leftover HTML elements
          const currentContent = editor.getHTML();
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
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }
    };
  }, [editor]);

  return null;
} 