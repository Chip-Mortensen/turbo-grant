export { EditHighlighter } from './EditHighlighter';
export { EditStyles } from './EditStyles';
export { DiffRenderer } from './DiffRenderer';
export { PluginManager } from './PluginManager';
export { EditOperationsHandler } from './EditOperationsHandler';
export { EditSummaryBar } from './EditSummaryBar';
export { IndividualEditHandler } from './IndividualEditHandler';

export { simpleDiff } from './utils/simpleDiff';
export { flattenEditSuggestions, findEditById } from './utils/editOperations';

export * from './types';

import { EditHighlighter as DefaultEditHighlighter } from './EditHighlighter';
export default DefaultEditHighlighter; 