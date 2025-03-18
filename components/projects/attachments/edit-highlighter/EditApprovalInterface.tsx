import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { EditSuggestion } from '@/app/api/attachments/ai-edit/route';
import { EditStatusMap, EditWithId } from './types';
import { Button } from '@/components/ui/button';

interface EditApprovalInterfaceProps {
  editSuggestions: EditWithId[] | null;
  editStatuses: EditStatusMap;
  onApproveEdit: (editId: string) => void;
  onDenyEdit: (editId: string) => void;
  onApproveAll: () => void;
  pendingCount: number;
  totalCount: number;
}

export function EditApprovalInterface({
  editSuggestions,
  editStatuses,
  onApproveEdit,
  onDenyEdit,
  onApproveAll,
  pendingCount,
  totalCount
}: EditApprovalInterfaceProps) {
  if (!editSuggestions?.length) return null;

  return (
    <div className="fixed bottom-0 right-0 p-4 bg-white dark:bg-gray-800 shadow-lg rounded-tl-lg z-50 w-80 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Edit Suggestions ({pendingCount}/{totalCount})</h3>
        {pendingCount > 0 && (
          <Button 
            size="sm" 
            onClick={onApproveAll}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Apply Remaining
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        {editSuggestions.map((edit) => {
          const status = editStatuses[edit.id] || 'pending';
          
          // Determine the text excerpt to show from edit
          let excerptText = '';
          if (edit.edits && edit.edits.length > 0) {
            const firstEdit = edit.edits[0];
            if (firstEdit.operation === 'replace' && firstEdit.newContent) {
              excerptText = firstEdit.newContent;
            } else if (firstEdit.operation === 'add' && firstEdit.newContent) {
              excerptText = firstEdit.newContent;
            } else if (firstEdit.operation === 'delete') {
              excerptText = 'Delete content';
            }
          } else if (edit.newContent) {
            excerptText = edit.newContent;
          }
          
          // Truncate text if too long
          if (excerptText.length > 60) {
            excerptText = excerptText.substring(0, 57) + '...';
          }
          
          return (
            <div 
              key={edit.id} 
              className={`p-2 rounded-md ${
                status === 'approved' 
                  ? 'bg-green-100 dark:bg-green-900/20' 
                  : status === 'denied'
                    ? 'bg-red-100 dark:bg-red-900/20' 
                    : 'bg-yellow-100 dark:bg-yellow-900/20'
              }`}
            >
              <div className="flex justify-between mb-1">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {edit.edits && edit.edits.length > 0 
                    ? `${edit.edits[0].operation.charAt(0).toUpperCase() + edit.edits[0].operation.slice(1)}` 
                    : 'Edit'}
                </div>
                <div className="flex space-x-1">
                  {status === 'pending' && (
                    <>
                      <button 
                        onClick={() => onApproveEdit(edit.id)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button 
                        onClick={() => onDenyEdit(edit.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <XCircle size={16} />
                      </button>
                    </>
                  )}
                  {status === 'approved' && (
                    <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                  )}
                  {status === 'denied' && (
                    <XCircle size={16} className="text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
              <div className="text-sm">
                {excerptText || 'No content preview available'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 