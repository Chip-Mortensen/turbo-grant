import { EditSuggestion } from '@/app/api/attachments/ai-edit/route';
import { Node as ProseMirrorNode } from 'prosemirror-model';

export type EditStatus = 'approved' | 'denied' | 'pending' | 'applied';

export interface EditStatusMap {
  [editId: string]: EditStatus;
}

export interface TargetNode {
  node: ProseMirrorNode;
  pos: number;
}

export interface NodeWithEdit {
  targetNode?: TargetNode;
  edit: any; // The edit details
  referenceNode?: TargetNode; // For add operations
}

export interface EditWithId extends EditSuggestion {
  id: string; // A unique identifier for the edit suggestion
}

// Edit Operation with its own unique ID
export interface EditOperation {
  editId: string; // Unique ID for this specific edit operation
  suggestionId: string; // ID of the parent suggestion
  operation: 'replace' | 'add' | 'delete';
  tagType: string;
  tagIndex?: number;
  referenceNodeIndex?: number;
  position?: 'before' | 'after';
  originalContent?: string;
  newContent?: string;
  explanation?: string;
}

// Extended props interface for our components
export interface EditHighlighterProps {
  editor: any;
  editSuggestions: EditSuggestion[] | null;
  mode?: 'preview' | 'apply';
  editStatuses?: EditStatusMap;
  onApproveEdit?: (editId: string) => void;
  onDenyEdit?: (editId: string) => void;
  onApproveAll?: () => void;
  onEditApplied?: (editId: string) => void;
  autoApply?: boolean; // Whether to automatically apply edits when approved
} 