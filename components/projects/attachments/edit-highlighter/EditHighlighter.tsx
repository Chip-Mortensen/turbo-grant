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
  onApplied?: () => void;
}

// Add a global ref to track operations that have been applied to prevent reapplication
const appliedOperationIds = new Set<string>();

// Add this tracking object to monitor which edits are currently being applied
const currentlyApplyingEdits = new Set<string>();

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
  onStatusChange,
  onApplied
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
    // When all edits have been applied or denied and we have no pending edits, notify parent
    const allProcessed = totalCount > 0 && pendingCount === 0;
    
    if (allProcessed) {
      console.log('All edits have been processed, notifying parent');
      if (onContentChange) {
        onContentChange();
      }
      
      // After all edits are processed, if no pending edits remain, clear edit suggestions
      if (mode === 'apply' && pendingCount === 0 && approvedCount === 0) {
        // Clear the edit suggestions after a small delay to ensure UI updates
        setTimeout(() => {
          if (externalOnApproveAll) {
            externalOnApproveAll(); // This will trigger parent to clear suggestions
          }
        }, 300);
      }
    }
  }, [pendingCount, approvedCount, totalCount, onContentChange, mode, externalOnApproveAll]);
  
  // Handle approval of an individual edit
  const handleApproveEdit = (editId: string) => {
    // Skip if already being processed
    if (currentlyApplyingEdits.has(editId)) {
      console.log(`Edit ${editId} is currently being applied, skipping duplicate request`);
      return;
    }
    
    // Find the edit by ID
    const edit = findEditById(editOperations, editId);
    if (!edit) return;
    
    // Add to currently processing set
    currentlyApplyingEdits.add(editId);
    
    // Update the status right away
    if (externalOnApproveEdit) {
      externalOnApproveEdit(editId);
    } else {
      setInternalEditStatuses(prev => ({
        ...prev,
        [editId]: 'approved'
      }));
    }
    
    // For individual edits, we'll now handle them inline without changing mode
    if (autoApply) {
      // Apply this specific edit through a direct application rather than mode switch
      const editToApply = findEditById(editOperations, editId);
      if (editToApply) {
        // Instead of setting applyingEditId which would trigger mode changes,
        // we'll apply this edit directly through IndividualEditHandler
        // Create a temporary element to host the individual edit handler
        const tempContainer = document.createElement('div');
        tempContainer.style.display = 'none';
        document.body.appendChild(tempContainer);
        
        // We'll use a direct DOM-based approach to apply the edit
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editor.getHTML();
        
        // Apply the edit based on its type (this mimics the logic in IndividualEditHandler)
        if (editToApply.operation === 'replace' && editToApply.tagType && editToApply.tagIndex !== undefined) {
          const elements = editToApply.tagType === 'p' 
            ? Array.from(tempDiv.querySelectorAll('p'))
            : Array.from(tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          
          if (editToApply.tagIndex < elements.length) {
            const element = elements[editToApply.tagIndex];
            if (element && editToApply.newContent) {
              console.log(`Directly applying edit: replacing content at ${editToApply.tagType} index ${editToApply.tagIndex}`);
              element.textContent = editToApply.newContent.replace(/<\/?[^>]+(>|$)/g, "");
              
              // Apply the change to the editor
              editor.commands.setContent(tempDiv.innerHTML);
              
              // Mark as applied in our tracking sets
              appliedOperationIds.add(editId);
              
              // Notify of content change
              if (onContentChange) {
                onContentChange();
              }
            }
          }
        }
        
        // Clean up
        document.body.removeChild(tempContainer);
        
        // Now mark this edit as handled
        if (externalOnApproveEdit) {
          // Mark as applied via external handler
          setTimeout(() => {
            externalOnApproveEdit(editId);
            // Remove from currently processing set
            currentlyApplyingEdits.delete(editId);
          }, 10);
        } else {
          setInternalEditStatuses(prev => {
            const result: EditStatusMap = {
              ...prev,
              [editId]: 'applied'
            };
            // Remove from currently processing set
            setTimeout(() => {
              currentlyApplyingEdits.delete(editId);
            }, 10);
            return result;
          });
        }
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
  
  // Handle completion of an edit in batch mode (this is only used for batch operations)
  const handleBatchEditApplied = (editId: string) => {
    console.log(`Batch edit ${editId} has been applied, marking as complete`);
    
    // Mark the edit as applied
    if (externalOnApproveEdit) {
      // If using external status management, notify parent that edit is complete
      externalOnApproveEdit(editId);
    } else {
      setInternalEditStatuses(prev => {
        const result: EditStatusMap = {
          ...prev,
          [editId]: 'applied'
        };
        return result;
      });
    }
    
    // Notify parent of content change
    if (onContentChange) {
      onContentChange();
    }
    
    // Reset applying state
    setApplyingEditId(null);
    
    // Check if there are more edits to apply (for batch apply)
    if (applyingEditId === 'all') {
      // Find the next edit to apply (either pending or approved but not applied)
      const nextEditToApply = editOperations.find(edit => {
        const status = editStatuses[edit.editId] || 'pending';
        return (status === 'pending' || status === 'approved') && edit.editId !== editId;
      });
      
      // Calculate remaining edits to determine if we're done
      const remainingEdits = editOperations.filter(edit => {
        const status = editStatuses[edit.editId] || 'pending';
        return status === 'pending' || status === 'approved';
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
        
        // Check if we need to clear all edits (only if approveAll was called, not for individual edits)
        if (remainingEdits.length === 0 && externalOnApproveAll) {
          setTimeout(() => {
            console.log('No more pending edits and approveAll was called, clearing edit suggestions');
            externalOnApproveAll();
          }, 300);
        }
      }
    }
  };
  
  // Filter operations that should be shown in preview mode (not yet applied)
  const visibleOperations = useMemo(() => {
    return editOperations.filter(edit => {
      const status = editStatuses[edit.editId] || 'pending';
      return status !== 'applied' && !appliedOperationIds.has(edit.editId);
    });
  }, [editOperations, editStatuses]);
  
  // Filter operations that should be applied in "apply" mode
  const operationsToApply = useMemo(() => {
    // When in apply mode, apply everything except denied or already applied
    if (mode === 'apply') {
      // Apply all edits that haven't been applied yet (maximum performance)
      return editOperations.filter(edit => {
        // Only apply if not already applied
        return !appliedOperationIds.has(edit.editId);
      });
    }
    
    // When applying a single edit, use only that one
    if (applyingEditId && applyingEditId !== 'all') {
      const edit = findEditById(editOperations, applyingEditId);
      // Skip if already in the applied set
      if (edit && !appliedOperationIds.has(edit.editId)) {
        return [edit];
      }
    }
    
    return [];
  }, [mode, editOperations, applyingEditId]);

  // Capture approved operations to avoid re-applying them
  useEffect(() => {
    if (operationsToApply.length > 0) {
      operationsToApply.forEach(op => {
        // Mark these operations as being processed
        appliedOperationIds.add(op.editId);
      });
    }
  }, [operationsToApply]);

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

  // Make the debug logging more explicit about what's about to happen
  useEffect(() => {
    if (operationsToApply.length > 0) {
      console.log(`EditHighlighter: READY TO APPLY ${operationsToApply.length} operations: 
        Mode: ${mode}, 
        ApplyingEditId: ${applyingEditId || 'none'},
        Operations: ${JSON.stringify(operationsToApply.map(op => ({ 
          id: op.editId, 
          operation: op.operation,
          status: editStatuses[op.editId] || 'pending',
          tagType: op.tagType,
          tagIndex: op.tagIndex
        })))}
      `);
    }
  }, [operationsToApply, editStatuses, mode, applyingEditId]);

  // Add effect to handle mode transitions more explicitly
  useEffect(() => {
    if (mode === 'apply') {
      console.log('******** APPLY MODE ACTIVATED ********');
      console.log(`EditHighlighter transitioning to APPLY mode with status counts:
        Total: ${editOperations.length}
        Pending: ${pendingCount}
        Approved: ${approvedCount}
        Denied: ${deniedCount}
        Applied: ${appliedCount}
      `);
      
      // When switching to apply mode, ensure we have operations to apply
      if (operationsToApply.length === 0) {
        console.log('WARNING: No operations to apply in apply mode!');
        
        // Manually determine what operations should be applied
        const manualOperations = editOperations.filter(op => {
          const status = editStatuses[op.editId] || 'pending';
          const isApplied = appliedOperationIds.has(op.editId);
          return (status === 'approved' || status === 'pending') && !isApplied;
        });
        
        console.log(`Manually found ${manualOperations.length} operations that should be applied`);
        if (manualOperations.length > 0) {
          manualOperations.forEach(op => {
            console.log(`Operation ${op.editId} (${op.operation}) should be applied`);
          });
        }
      }
    }
  }, [mode, editOperations, pendingCount, approvedCount, deniedCount, appliedCount, operationsToApply, editStatuses]);

  // Detect changes in apply mode and trigger application
  useEffect(() => {
    console.log('Edit mode changed:', { mode, applyingEditId });
    
    if (mode === 'apply') {
      console.log('APPLY MODE ACTIVE');
      // After the edits are applied, notify parent via onApplied callback
      if (operationsToApply.length > 0) {
        console.log(`Applying ${operationsToApply.length} edit operations`);
        // Track the newly applied operations
        const newlyApplied = new Set<string>();
        operationsToApply.forEach(op => {
          newlyApplied.add(op.editId);
        });
        
        // Update the applied set with these new operations
        newlyApplied.forEach(id => {
          appliedOperationIds.add(id);
        });
        
        // After operations are applied, signal completion
        if (onApplied) {
          requestAnimationFrame(() => {
            console.log('Calling onApplied callback after edits were applied');
            onApplied();
          });
        }
      } else {
        console.log('No operations to apply');
        // Still call onApplied even if there were no operations to apply
        if (onApplied) {
          console.log('Calling onApplied callback (no operations)');
          onApplied();
        }
      }
    }
  }, [mode, applyingEditId, operationsToApply, onApplied]);

  return (
    <>
      {/* Add the CSS styles for highlighting */}
      <EditStyles />
      
      {/* Preview mode: show decorations for edits that haven't been applied yet */}
      {/* Always show preview decorations as long as there are visible operations, regardless of mode */}
      {visibleOperations.length > 0 && (
        <PluginManager 
          editor={editor} 
          editOperations={visibleOperations} 
          mode={mode}
          editStatuses={editStatuses}
          onApproveEdit={handleApproveEdit}
          onDenyEdit={handleDenyEdit}
        />
      )}
      
      {/* Apply all edits in batch mode - only used for batch operations */}
      {mode === 'apply' && operationsToApply.length > 0 && (
        <EditOperationsHandler 
          editor={editor} 
          editOperations={operationsToApply} 
          onComplete={() => {
            // Mark all edits as applied
            operationsToApply.forEach(edit => {
              // Ensure these are marked in the global set
              appliedOperationIds.add(edit.editId);
              // Call the batch completion handler for each edit
              handleBatchEditApplied(edit.editId);
            });
          }}
        />
      )}
      
      {/* Individual edit application is now handled directly in handleApproveEdit */}
    </>
  );
} 