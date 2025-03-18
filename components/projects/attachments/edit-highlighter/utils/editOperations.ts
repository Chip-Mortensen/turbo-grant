import { EditSuggestion } from '@/app/api/attachments/ai-edit/route';
import { EditOperation, EditWithId } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Converts edit suggestions into flattened individual edit operations
 */
export function flattenEditSuggestions(editSuggestions: EditSuggestion[] | null): EditOperation[] {
  if (!editSuggestions) return [];
  
  return editSuggestions.flatMap(suggestion => {
    // Generate a suggestion ID if not present
    const suggestionId = ('id' in suggestion) ? 
      (suggestion as EditWithId).id : 
      uuidv4();
    
    // If it has multiple edits, process each one
    if (suggestion.edits && suggestion.edits.length > 0) {
      return suggestion.edits.map(edit => ({
        ...edit,
        editId: uuidv4(),
        suggestionId
      }));
    }
    
    // Handle legacy format with single edit per suggestion
    return [{
      operation: 'replace',
      tagType: suggestion.tagType,
      tagIndex: suggestion.tagIndex,
      originalContent: suggestion.originalContent,
      newContent: suggestion.newContent,
      explanation: suggestion.reason,
      editId: uuidv4(),
      suggestionId
    }];
  });
}

/**
 * Finds an edit operation by its ID
 */
export function findEditById(edits: EditOperation[], editId: string): EditOperation | undefined {
  return edits.find(edit => edit.editId === editId);
}

/**
 * Filters edit operations based on their status
 */
export function filterEditsByStatus(
  edits: EditOperation[], 
  statusMap: Record<string, string>, 
  status: string | string[]
): EditOperation[] {
  const statusArray = Array.isArray(status) ? status : [status];
  return edits.filter(edit => statusArray.includes(statusMap[edit.editId] || 'pending'));
}

/**
 * Groups edit operations by their parent suggestion
 */
export function groupEditsBySuggestion(edits: EditOperation[]): Record<string, EditOperation[]> {
  const grouped: Record<string, EditOperation[]> = {};
  
  edits.forEach(edit => {
    if (!grouped[edit.suggestionId]) {
      grouped[edit.suggestionId] = [];
    }
    grouped[edit.suggestionId].push(edit);
  });
  
  return grouped;
} 