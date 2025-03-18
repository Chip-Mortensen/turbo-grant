import { useEffect, useRef } from 'react';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { simpleDiff } from './utils/simpleDiff';
import { EditOperation, EditStatusMap } from './types';

interface PluginManagerProps {
  editor: any;
  editOperations: EditOperation[] | null;
  mode: 'preview' | 'apply';
  editStatuses?: EditStatusMap;
  onApproveEdit?: (editId: string) => void;
  onDenyEdit?: (editId: string) => void;
}

export function PluginManager({ 
  editor, 
  editOperations, 
  mode, 
  editStatuses = {},
  onApproveEdit,
  onDenyEdit
}: PluginManagerProps) {
  // Ref to store handlers to avoid recreation on render
  const handlersRef = useRef({ onApproveEdit, onDenyEdit });
  
  // Update the ref when handlers change
  useEffect(() => {
    handlersRef.current = { onApproveEdit, onDenyEdit };
  }, [onApproveEdit, onDenyEdit]);
  
  // Clean up any existing plugins
  const cleanupPlugins = () => {
    if (!editor) return;
    
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
    } catch (error) {
      console.error('Error during plugin cleanup:', error);
    }
  };

  // Global event listener for edit control buttons
  useEffect(() => {
    if (!editor) return;
    
    const handleEditControl = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-edit-action]');
      
      if (!button) return;
      
      const action = button.getAttribute('data-edit-action');
      const editId = button.getAttribute('data-edit-id');
      
      if (!editId) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      if (action === 'approve' && handlersRef.current.onApproveEdit) {
        handlersRef.current.onApproveEdit(editId);
      } else if (action === 'deny' && handlersRef.current.onDenyEdit) {
        handlersRef.current.onDenyEdit(editId);
      }
    };
    
    // Add the event listener to the editor DOM
    const editorDOM = editor.view.dom;
    editorDOM.addEventListener('click', handleEditControl);
    
    return () => {
      editorDOM.removeEventListener('click', handleEditControl);
    };
  }, [editor]);

  // Create preview plugin for highlighting changes
  const createPreviewPlugin = () => {
    if (!editor || !editOperations?.length) return;
    
    try {
      // First, clean up existing plugins
      cleanupPlugins();
      
      // Create a new plugin for decorations
      const previewPlugin = new Plugin({
        key: new PluginKey('aiEditPreviewPlugin'),
        props: {
          decorations(state) {
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
            
            // Process each edit operation
            editOperations.forEach(edit => {
              const status = editStatuses[edit.editId] || 'pending';
              
              // Skip edits that have already been applied
              if (status === 'applied') return;
              
              // Process based on operation type
              switch (edit.operation) {
                case 'replace':
                  processReplaceOperation(edit, status, paragraphs, decorations);
                  break;
                case 'delete':
                  processDeleteOperation(edit, status, paragraphs, decorations);
                  break;
                case 'add':
                  processAddOperation(edit, status, paragraphs, decorations);
                  break;
              }
            });
            
            return DecorationSet.create(state.doc, decorations);
          }
        }
      });
      
      // Add the plugin to the editor
      const plugins = [...editor.view.state.plugins.filter((plugin: any) => {
        return !(plugin.key && plugin.key.startsWith && plugin.key.startsWith('aiEditPreviewPlugin'));
      }), previewPlugin];
      
      editor.view.updateState(
        editor.view.state.reconfigure({ plugins })
      );
      
      console.log('=== PREVIEW DECORATIONS ADDED ===');
    } catch (error) {
      console.error('Error during preview creation:', error);
    }
  };

  // Process replace operations
  const processReplaceOperation = (
    edit: EditOperation, 
    status: string,
    paragraphs: {node: ProseMirrorNode, pos: number}[],
    decorations: Decoration[]
  ) => {
    const index = edit.tagIndex;
    if (index === undefined || index < 0 || index >= paragraphs.length || !edit.newContent) {
      return;
    }
    
    const { node, pos } = paragraphs[index];
    const originalText = node.textContent;
    const newContent = edit.newContent.replace(/<\/?[^>]+(>|$)/g, "");
    
    // Add a node decoration to hide the original paragraph
    const hideDecoration = Decoration.node(pos, pos + node.nodeSize, {
      class: '',
      'data-replaced': 'true'
    });
    
    // Add a widget at the beginning of the paragraph to show the diff
    const diffWidget = Decoration.widget(pos, () => {
      const container = document.createElement('div');
      container.className = `ai-edit-preview-wrapper ${
        status === 'approved' 
          ? 'ai-edit-status-approved' 
          : status === 'denied'
            ? 'ai-edit-status-denied' 
            : 'ai-edit-status-pending'
      }`;
      container.setAttribute('data-edit-index', String(index));
      container.setAttribute('data-edit-id', edit.editId);
      container.setAttribute('data-edit-status', status);
      
      // Add the control buttons for pending edits
      if (status === 'pending') {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'ai-edit-controls';
        
        const approveButton = document.createElement('button');
        approveButton.className = 'ai-edit-control-button ai-edit-approve-button';
        approveButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        approveButton.setAttribute('data-edit-action', 'approve');
        approveButton.setAttribute('data-edit-id', edit.editId);
        approveButton.title = 'Approve this edit';
        
        const denyButton = document.createElement('button');
        denyButton.className = 'ai-edit-control-button ai-edit-deny-button';
        denyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        denyButton.setAttribute('data-edit-action', 'deny');
        denyButton.setAttribute('data-edit-id', edit.editId);
        denyButton.title = 'Deny this edit';
        
        controlsDiv.appendChild(approveButton);
        controlsDiv.appendChild(denyButton);
        container.appendChild(controlsDiv);
      } else {
        // Add status badge
        const statusBadge = document.createElement('div');
        statusBadge.className = `ai-edit-status-badge ai-edit-status-${status}`;
        statusBadge.textContent = status === 'approved' ? 'Approved' : 'Denied';
        container.appendChild(statusBadge);
      }
      
      // Create a diff view
      const diffContainer = document.createElement('div');
      diffContainer.className = 'ai-edit-diff-container';
      
      // Split the texts into words for a simple diff
      const originalWords = originalText.split(/\s+/);
      const newWords = newContent.split(/\s+/);
      
      // Create diff HTML using the DiffRenderer logic
      const diffHtml = document.createElement('div');
      diffHtml.className = 'ai-edit-diff-content';
      
      // Use imported simpleDiff function
      const diff = simpleDiff(originalWords, newWords);
      
      diff.forEach((part: {value: string, added?: boolean, removed?: boolean}) => {
        const span = document.createElement('span');
        if (part.added) {
          span.className = 'ai-edit-diff-added';
          span.textContent = part.value + ' ';
        } else if (part.removed) {
          span.className = 'ai-edit-diff-removed';
          span.textContent = part.value + ' ';
        } else {
          span.textContent = part.value + ' ';
        }
        diffHtml.appendChild(span);
      });
      
      container.appendChild(diffHtml);
      
      return container;
    });
    
    decorations.push(hideDecoration);
    decorations.push(diffWidget);
  };

  // Process delete operations
  const processDeleteOperation = (
    edit: EditOperation, 
    status: string,
    paragraphs: {node: ProseMirrorNode, pos: number}[],
    decorations: Decoration[]
  ) => {
    const index = edit.tagIndex;
    if (index === undefined || index < 0 || index >= paragraphs.length) {
      return;
    }
    
    const { node, pos } = paragraphs[index];
    
    // Create a wrapper with controls
    const wrapperBefore = Decoration.widget(pos, () => {
      const wrapper = document.createElement('div');
      wrapper.className = `ai-edit-preview-wrapper ${
        status === 'approved' 
          ? 'ai-edit-status-approved' 
          : status === 'denied'
            ? 'ai-edit-status-denied' 
            : 'ai-edit-status-pending'
      }`;
      wrapper.setAttribute('data-edit-id', edit.editId);
      wrapper.setAttribute('data-edit-status', status);
      
      // Add the control buttons for pending edits
      if (status === 'pending') {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'ai-edit-controls';
        
        const approveButton = document.createElement('button');
        approveButton.className = 'ai-edit-control-button ai-edit-approve-button';
        approveButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        approveButton.setAttribute('data-edit-action', 'approve');
        approveButton.setAttribute('data-edit-id', edit.editId);
        approveButton.title = 'Approve deletion';
        
        const denyButton = document.createElement('button');
        denyButton.className = 'ai-edit-control-button ai-edit-deny-button';
        denyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        denyButton.setAttribute('data-edit-action', 'deny');
        denyButton.setAttribute('data-edit-id', edit.editId);
        denyButton.title = 'Deny deletion';
        
        controlsDiv.appendChild(approveButton);
        controlsDiv.appendChild(denyButton);
        wrapper.appendChild(controlsDiv);
      } else {
        // Add status badge
        const statusBadge = document.createElement('div');
        statusBadge.className = `ai-edit-status-badge ai-edit-status-${status}`;
        statusBadge.textContent = status === 'approved' ? 'Approved' : 'Denied';
        wrapper.appendChild(statusBadge);
      }
      
      const label = document.createElement('div');
      label.textContent = 'Delete this paragraph';
      label.style.fontSize = '12px';
      label.style.marginTop = '4px';
      label.style.opacity = '0.7';
      wrapper.appendChild(label);
      
      return wrapper;
    });
    
    // Add a node decoration to mark the paragraph as deleted
    const decoration = Decoration.node(pos, pos + node.nodeSize, {
      class: `ai-edit-deleted-node ${
        status === 'approved' 
          ? 'ai-edit-status-approved' 
          : status === 'denied'
            ? 'ai-edit-status-denied' 
            : 'ai-edit-status-pending'
      }`,
      'data-edit-id': edit.editId,
      'data-edit-status': status
    });
    
    decorations.push(wrapperBefore);
    decorations.push(decoration);
  };

  // Process add operations
  const processAddOperation = (
    edit: EditOperation, 
    status: string,
    paragraphs: {node: ProseMirrorNode, pos: number}[],
    decorations: Decoration[]
  ) => {
    const refIndex = edit.referenceNodeIndex;
    const position = edit.position;
    
    if (refIndex === undefined || refIndex < 0 || refIndex >= paragraphs.length || !position || !edit.newContent) {
      return;
    }
    
    const { node, pos } = paragraphs[refIndex];
    const newContent = edit.newContent.replace(/<\/?[^>]+(>|$)/g, "");
    
    // Create a widget decoration that shows the new content
    const decoration = Decoration.widget(
      position === 'before' ? pos : pos + node.nodeSize, 
      () => {
        const wrapper = document.createElement('div');
        wrapper.className = `ai-edit-preview-wrapper ${
          status === 'approved' 
            ? 'ai-edit-status-approved' 
            : status === 'denied'
              ? 'ai-edit-status-denied' 
              : 'ai-edit-status-pending'
        }`;
        wrapper.setAttribute('data-edit-id', edit.editId);
        wrapper.setAttribute('data-edit-status', status);
        
        // Add the control buttons for pending edits
        if (status === 'pending') {
          const controlsDiv = document.createElement('div');
          controlsDiv.className = 'ai-edit-controls';
          
          const approveButton = document.createElement('button');
          approveButton.className = 'ai-edit-control-button ai-edit-approve-button';
          approveButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
          approveButton.setAttribute('data-edit-action', 'approve');
          approveButton.setAttribute('data-edit-id', edit.editId);
          approveButton.title = 'Approve this addition';
          
          const denyButton = document.createElement('button');
          denyButton.className = 'ai-edit-control-button ai-edit-deny-button';
          denyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
          denyButton.setAttribute('data-edit-action', 'deny');
          denyButton.setAttribute('data-edit-id', edit.editId);
          denyButton.title = 'Deny this addition';
          
          controlsDiv.appendChild(approveButton);
          controlsDiv.appendChild(denyButton);
          wrapper.appendChild(controlsDiv);
        } else {
          // Add status badge
          const statusBadge = document.createElement('div');
          statusBadge.className = `ai-edit-status-badge ai-edit-status-${status}`;
          statusBadge.textContent = status === 'approved' ? 'Approved' : 'Denied';
          wrapper.appendChild(statusBadge);
        }
        
        const newParagraph = document.createElement('p');
        newParagraph.className = 'ai-edit-new-node';
        newParagraph.textContent = newContent;
        wrapper.appendChild(newParagraph);
        
        return wrapper;
      }
    );
    
    decorations.push(decoration);
  };

  // Create plugins based on mode
  useEffect(() => {
    if (mode === 'preview') {
      createPreviewPlugin();
    } else {
      cleanupPlugins();
    }
    
    return () => {
      cleanupPlugins();
    };
  }, [editor, editOperations, editStatuses, mode]);

  return null;
} 