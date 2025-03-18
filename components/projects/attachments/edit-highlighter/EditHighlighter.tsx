import { useEffect, useState, useMemo, useRef } from 'react';
import { EditSuggestion } from '@/app/api/attachments/ai-edit/route';
import { EditStyles } from './EditStyles';
import { PluginManager } from './PluginManager';
import { EditOperationsHandler } from './EditOperationsHandler';
import { IndividualEditHandler } from './IndividualEditHandler';
import { EditStatusMap, EditOperation } from './types';
import { flattenEditSuggestions, findEditById } from './utils/editOperations';

interface EditHighlighterProps {
  editor: any;
  editSuggestions: EditSuggestion[] | null;
  mode?: 'preview' | 'apply';
  editStatuses?: EditStatusMap;
  onApproveEdit?: (editId: string) => void;
  onDenyEdit?: (editId: string) => void;
  onApproveAll?: () => void;
  autoApply?: boolean;
  onContentChange?: () => void;
  onStatusChange?: (pendingCount: number, totalCount: number) => void;
}

export function EditHighlighter({ 
  editor, 
  editSuggestions, 
  mode = 'preview',
  editStatuses: externalEditStatuses,
  onApproveEdit: externalOnApproveEdit,
  onDenyEdit: externalOnDenyEdit,
  onApproveAll: externalOnApproveAll,
  autoApply = true, // Auto-apply is enabled by default
  onContentChange,
  onStatusChange
}: EditHighlighterProps) {
  // Internal state for edit statuses if not provided externally
  const [internalEditStatuses, setInternalEditStatuses] = useState<EditStatusMap>({});
  
  // State to track which edit is currently being applied (if any)
  const [applyingEditId, setApplyingEditId] = useState<string | null>(null);
  
  // Convert edit suggestions to individual edit operations
  const editOperations = useMemo(() => {
    return flattenEditSuggestions(editSuggestions);
  }, [editSuggestions]);
  
  // Use external statuses if provided, otherwise use internal
  const editStatuses = externalEditStatuses || internalEditStatuses;
  
  // Calculate counts
  const { pendingCount, totalCount, approvedCount, deniedCount, appliedCount } = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let denied = 0;
    let applied = 0;
    
    editOperations.forEach(edit => {
      const status = editStatuses[edit.editId] || 'pending';
      if (status === 'pending') pending++;
      else if (status === 'approved') approved++;
      else if (status === 'denied') denied++;
      else if (status === 'applied') applied++;
    });
    
    return { 
      pendingCount: pending,
      totalCount: editOperations.length,
      approvedCount: approved,
      deniedCount: denied,
      appliedCount: applied
    };
  }, [editOperations, editStatuses]);
  
  // Use a ref to prevent unnecessary effect reruns
  const prevCountsRef = useRef({ pendingCount: -1, totalCount: -1 });
  
  // Notify parent component when edit status counts change
  useEffect(() => {
    // Only trigger the callback if the counts have actually changed
    if (onStatusChange && 
        (prevCountsRef.current.pendingCount !== pendingCount || 
         prevCountsRef.current.totalCount !== totalCount)) {
      
      // Update the ref with current values
      prevCountsRef.current = { pendingCount, totalCount };
      
      // Call the callback
      onStatusChange(pendingCount, totalCount);
    }
  }, [pendingCount, totalCount, onStatusChange]);
  
  // Add this effect to check when all edits are applied or denied
  useEffect(() => {
    // When all edits have been applied or denied, notify parent
    const allProcessed = totalCount > 0 && pendingCount === 0 && approvedCount === 0;
    if (allProcessed && onContentChange) {
      console.log('All edits have been processed, notifying parent');
      onContentChange();
    }
  }, [pendingCount, approvedCount, totalCount, onContentChange]);
  
  // Handle approval of an individual edit
  const handleApproveEdit = (editId: string) => {
    // Find the edit by ID
    const edit = findEditById(editOperations, editId);
    if (!edit) return;
    
    // Apply the edit immediately if autoApply is enabled
    if (autoApply) {
      setApplyingEditId(editId);
    } else {
      // Otherwise just update status
      if (externalOnApproveEdit) {
        externalOnApproveEdit(editId);
      } else {
        setInternalEditStatuses(prev => ({
          ...prev,
          [editId]: 'approved'
        }));
      }
    }
  };
  
  // Handle denial of an individual edit
  const handleDenyEdit = (editId: string) => {
    if (externalOnDenyEdit) {
      externalOnDenyEdit(editId);
    } else {
      setInternalEditStatuses(prev => ({
        ...prev,
        [editId]: 'denied'
      }));
    }
  };
  
  // Handle approval of all pending edits
  const handleApproveAll = () => {
    if (externalOnApproveAll) {
      externalOnApproveAll();
    } else if (autoApply) {
      // Apply all pending edits one by one
      const pendingEditIds = editOperations
        .filter(edit => !editStatuses[edit.editId] || editStatuses[edit.editId] === 'pending')
        .map(edit => edit.editId);
      
      if (pendingEditIds.length > 0) {
        console.log(`Applying ${pendingEditIds.length} remaining edits`);
        // Start processing all edits sequentially
        setApplyingEditId('all');
        
        // Mark all pending edits as approved
        const newStatuses = { ...internalEditStatuses };
        pendingEditIds.forEach(id => {
          newStatuses[id] = 'approved';
        });
        setInternalEditStatuses(newStatuses);
      } else {
        // If there are no pending edits but there are approved edits that haven't been applied yet
        const approvedButNotAppliedIds = editOperations
          .filter(edit => editStatuses[edit.editId] === 'approved' && editStatuses[edit.editId] !== 'applied')
          .map(edit => edit.editId);
        
        if (approvedButNotAppliedIds.length > 0) {
          console.log(`Applying ${approvedButNotAppliedIds.length} approved edits`);
          // Start applying these edits
          setApplyingEditId('all');
        } else if (deniedCount === 0 && appliedCount > 0) {
          // All edits have been applied, reset the UI
          if (onContentChange) {
            console.log('All edits have been applied, resetting UI');
            onContentChange();
          }
        }
      }
    } else {
      // Mark all pending edits as approved
      const newStatuses = { ...internalEditStatuses };
      
      editOperations.forEach(edit => {
        const currentStatus = newStatuses[edit.editId] || 'pending';
        if (currentStatus === 'pending') {
          newStatuses[edit.editId] = 'approved';
        }
      });
      
      setInternalEditStatuses(newStatuses);
    }
  };
  
  // Handle completion of an edit application
  const handleEditApplied = (editId: string) => {
    // Mark the edit as applied
    if (externalOnApproveEdit) {
      // If using external status management, notify parent that edit is complete
      externalOnApproveEdit(editId);
    } else {
      setInternalEditStatuses(prev => ({
        ...prev,
        [editId]: 'applied'
      }));
    }
    
    // Notify parent of content change
    if (onContentChange) {
      onContentChange();
    }
    
    // Reset applying state
    setApplyingEditId(null);
    
    // Check if there are more edits to apply (for bulk apply)
    if (applyingEditId === 'all') {
      // Find the next edit to apply (either pending or approved but not applied)
      const nextEditToApply = editOperations.find(edit => {
        const status = editStatuses[edit.editId] || 'pending';
        return (status === 'pending' || status === 'approved') && edit.editId !== editId;
      });
      
      if (nextEditToApply) {
        console.log(`Moving to next edit: ${nextEditToApply.editId}`);
        // Apply the next edit
        setTimeout(() => {
          setApplyingEditId(nextEditToApply.editId);
        }, 50); // Small delay to ensure state updates properly
      } else {
        console.log('All edits have been applied');
        // All edits have been applied or denied, clean up
        if (onContentChange) {
          onContentChange();
        }
      }
    }
  };
  
  // Filter operations that should be shown in preview mode (not yet applied)
  const visibleOperations = useMemo(() => {
    return editOperations.filter(edit => {
      const status = editStatuses[edit.editId] || 'pending';
      return status !== 'applied';
    });
  }, [editOperations, editStatuses]);
  
  // Filter operations that should be applied in "apply" mode
  const operationsToApply = useMemo(() => {
    // When applying a single edit, use only that one
    if (applyingEditId && applyingEditId !== 'all') {
      const edit = findEditById(editOperations, applyingEditId);
      return edit ? [edit] : [];
    }
    
    // In apply mode, apply all approved edits
    if (mode === 'apply') {
      return editOperations.filter(edit => {
        const status = editStatuses[edit.editId] || 'pending';
        return status === 'approved';
      });
    }
    
    return [];
  }, [mode, editOperations, editStatuses, applyingEditId]);

  // Log state for debugging
  useEffect(() => {
    if (editor && editSuggestions?.length) {
      console.log(`EditHighlighter state update:`);
      console.log(`- Mode: ${mode}`);
      console.log(`- Edit operations: ${editOperations.length}`);
      console.log(`- Pending: ${pendingCount}, Approved: ${approvedCount}, Denied: ${deniedCount}, Applied: ${appliedCount}`);
      console.log(`- Currently applying: ${applyingEditId || 'none'}`);
    }
  }, [editor, editSuggestions, editOperations, pendingCount, approvedCount, deniedCount, appliedCount, applyingEditId, mode]);

  return (
    <>
      {/* Add the CSS styles for highlighting */}
      <EditStyles />
      
      {/* Preview mode: show decorations for edits that haven't been applied yet */}
      {mode === 'preview' && !applyingEditId && visibleOperations.length > 0 && (
        <PluginManager 
          editor={editor} 
          editOperations={visibleOperations} 
          mode={mode}
          editStatuses={editStatuses}
          onApproveEdit={handleApproveEdit}
          onDenyEdit={handleDenyEdit}
        />
      )}
      
      {/* Apply all edits in batch mode */}
      {mode === 'apply' && operationsToApply.length > 0 && (
        <EditOperationsHandler 
          editor={editor} 
          editOperations={operationsToApply} 
          onComplete={() => {
            // Mark all as applied
            const newStatuses = { ...internalEditStatuses };
            operationsToApply.forEach(edit => {
              newStatuses[edit.editId] = 'applied';
            });
            setInternalEditStatuses(newStatuses);
            
            // Reset applying state
            setApplyingEditId(null);
            
            // Notify parent
            if (onContentChange) {
              onContentChange();
            }
          }}
        />
      )}
      
      {/* Apply a single edit in immediate mode */}
      {applyingEditId && applyingEditId !== 'all' && operationsToApply.length === 1 && (
        <IndividualEditHandler
          editor={editor}
          edit={operationsToApply[0]}
          onComplete={handleEditApplied}
        />
      )}
    </>
  );
} 