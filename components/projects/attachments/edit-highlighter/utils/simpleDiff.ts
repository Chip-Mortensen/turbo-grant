export function simpleDiff(oldWords: string[], newWords: string[]) {
  const result: {value: string, added?: boolean, removed?: boolean}[] = [];
  
  // Use a more sophisticated diff approach that preserves context
  // This is a simplified version of the Myers diff algorithm
  
  // First, find the longest common subsequence
  const lcsMatrix = Array(oldWords.length + 1).fill(null).map(() => 
    Array(newWords.length + 1).fill(0)
  );
  
  // Fill the LCS matrix
  for (let i = 1; i <= oldWords.length; i++) {
    for (let j = 1; j <= newWords.length; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        lcsMatrix[i][j] = lcsMatrix[i - 1][j - 1] + 1;
      } else {
        lcsMatrix[i][j] = Math.max(lcsMatrix[i - 1][j], lcsMatrix[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find the diff
  let i = oldWords.length;
  let j = newWords.length;
  const diff: {value: string, added?: boolean, removed?: boolean}[] = [];
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      // Words match - unchanged
      diff.unshift({ value: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcsMatrix[i][j - 1] >= lcsMatrix[i - 1][j])) {
      // Word added
      diff.unshift({ value: newWords[j - 1], added: true });
      j--;
    } else if (i > 0 && (j === 0 || lcsMatrix[i][j - 1] < lcsMatrix[i - 1][j])) {
      // Word removed
      diff.unshift({ value: oldWords[i - 1], removed: true });
      i--;
    }
  }
  
  // Improve the diff by merging consecutive unchanged words for better readability
  const improvedDiff: {value: string, added?: boolean, removed?: boolean}[] = [];
  let currentGroup: {value: string, added?: boolean, removed?: boolean} | null = null;
  
  for (const item of diff) {
    if (!currentGroup) {
      currentGroup = { ...item };
      continue;
    }
    
    // If the current item has the same status as the current group, merge them
    if (
      (item.added && currentGroup.added) || 
      (item.removed && currentGroup.removed) || 
      (!item.added && !item.removed && !currentGroup.added && !currentGroup.removed)
    ) {
      currentGroup.value += ' ' + item.value;
    } else {
      // Different status, push the current group and start a new one
      improvedDiff.push(currentGroup);
      currentGroup = { ...item };
    }
  }
  
  // Don't forget to push the last group
  if (currentGroup) {
    improvedDiff.push(currentGroup);
  }
  
  return improvedDiff;
} 