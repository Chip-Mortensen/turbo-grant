import { HTMLElement, parse } from 'node-html-parser';

/**
 * Result of a tag finding operation
 */
export interface TagInfo {
  startPos: number;     // Starting position of the tag in the HTML string
  endPos: number;       // Ending position of the tag in the HTML string
  content: string;      // The full content of the tag, including the tag itself
  innerContent: string; // The inner content of the tag (without the tag itself)
  outerHTML: string;    // The full HTML string of the tag
}

export interface HTMLSummary {
  tagsByType: Record<string, TagInfo[]>;
  tagCounts: Record<string, number>;
  totalTags: number;
}

/**
 * Find a specific HTML tag in document content by its type and index
 * Robust implementation that handles duplicate tags correctly
 */
export function findTagByTypeAndIndex(
  htmlContent: string,
  tagType: string,
  tagIndex: number
): TagInfo | null {
  try {
    // First try using regex for faster matching
    const tagRegex = new RegExp(`<${tagType}(?:\\s+[^>]*)?>(.*?)<\\/${tagType}>`, 'gis');
    
    // Keep track of top-level tags only
    const topLevelMatches: { match: RegExpExecArray, processed: boolean }[] = [];
    
    // First pass: find all matching tags
    let match;
    while ((match = tagRegex.exec(htmlContent)) !== null) {
      topLevelMatches.push({ match, processed: false });
    }
    
    // Second pass: mark nested tags
    for (let i = 0; i < topLevelMatches.length; i++) {
      const current = topLevelMatches[i];
      if (current.processed) continue;
      
      const currentStart = current.match.index || 0;
      const currentEnd = currentStart + current.match[0].length;
      
      // Check if this tag contains other tags of the same type
      for (let j = i + 1; j < topLevelMatches.length; j++) {
        const other = topLevelMatches[j];
        if (other.processed) continue;
        
        const otherStart = other.match.index || 0;
        const otherEnd = otherStart + other.match[0].length;
        
        // If the other tag is completely within this tag, mark it as nested
        if (otherStart > currentStart && otherEnd < currentEnd) {
          other.processed = true;
        }
      }
    }
    
    // Count non-processed (top-level) tags
    const topLevelTags = topLevelMatches.filter(m => !m.processed);
    
    // Check if the index is valid
    if (tagIndex < 0 || tagIndex >= topLevelTags.length) {
      console.warn(`Tag not found: ${tagType} at index ${tagIndex} (found ${topLevelTags.length} top-level tags)`);
      return null;
    }
    
    // Get the matched tag
    const tagMatch = topLevelTags[tagIndex].match;
    const fullMatch = tagMatch[0];
    const innerContent = tagMatch[1];
    const startPos = tagMatch.index || 0;
    const endPos = startPos + fullMatch.length;
    
    return {
      startPos,
      endPos,
      content: fullMatch,
      innerContent,
      outerHTML: fullMatch
    };
  } catch (error) {
    console.error('Error finding tag:', error);
    
    // Fallback to node-html-parser if regex approach fails
    try {
      const root = parse(htmlContent);
      const allTags = root.querySelectorAll(tagType);
      
      // Filter to top-level tags of this type only
      const topLevelTags = allTags.filter(tag => {
        let parent = tag.parentNode;
        while (parent !== null && parent !== root) {
          if (parent.rawTagName === tagType) {
            return false; // This is a nested tag
          }
          parent = parent.parentNode;
        }
        return true; // This is a top-level tag
      });
      
      if (tagIndex >= 0 && tagIndex < topLevelTags.length) {
        const tag = topLevelTags[tagIndex];
        const outerHTML = tag.outerHTML;
        
        // Find the tag in the original HTML
        let startPos = htmlContent.indexOf(outerHTML);
        
        // Handle multiple identical tags
        if (startPos !== -1) {
          const matches = [];
          let tempPos = 0;
          let tempIndex = htmlContent.indexOf(outerHTML, tempPos);
          
          while (tempIndex !== -1) {
            matches.push(tempIndex);
            tempPos = tempIndex + 1;
            tempIndex = htmlContent.indexOf(outerHTML, tempPos);
          }
          
          // Use the position of the n-th occurrence
          if (tagIndex < matches.length) {
            startPos = matches[tagIndex];
          }
        }
        
        if (startPos !== -1) {
          const endPos = startPos + outerHTML.length;
          return {
            startPos,
            endPos,
            content: outerHTML,
            innerContent: tag.innerHTML,
            outerHTML
          };
        }
      }
      
      return null;
    } catch (nestedError) {
      console.error('Error in fallback tag finding:', nestedError);
      return null;
    }
  }
}

/**
 * Find all instances of a specific tag type in the HTML content
 */
export function findAllTagsByType(
  htmlContent: string,
  tagType: string
): TagInfo[] {
  try {
    // First try using regex for faster matching
    const tagRegex = new RegExp(`<${tagType}(?:\\s+[^>]*)?>(.*?)<\\/${tagType}>`, 'gis');
    
    // Keep track of top-level tags only
    const topLevelMatches: { match: RegExpExecArray, processed: boolean }[] = [];
    
    // First pass: find all matching tags
    let match;
    while ((match = tagRegex.exec(htmlContent)) !== null) {
      topLevelMatches.push({ match, processed: false });
    }
    
    // Second pass: mark nested tags
    for (let i = 0; i < topLevelMatches.length; i++) {
      const current = topLevelMatches[i];
      if (current.processed) continue;
      
      const currentStart = current.match.index || 0;
      const currentEnd = currentStart + current.match[0].length;
      
      // Check if this tag contains other tags of the same type
      for (let j = i + 1; j < topLevelMatches.length; j++) {
        const other = topLevelMatches[j];
        if (other.processed) continue;
        
        const otherStart = other.match.index || 0;
        const otherEnd = otherStart + other.match[0].length;
        
        // If the other tag is completely within this tag, mark it as nested
        if (otherStart > currentStart && otherEnd < currentEnd) {
          other.processed = true;
        }
      }
    }
    
    // Get non-processed (top-level) tags
    const topLevelTags = topLevelMatches.filter(m => !m.processed);
    
    // Convert matches to TagInfo objects
    return topLevelTags.map(item => {
      const match = item.match;
      const fullMatch = match[0];
      const innerContent = match[1];
      const startPos = match.index || 0;
      const endPos = startPos + fullMatch.length;
      
      return {
        startPos,
        endPos,
        content: fullMatch,
        innerContent,
        outerHTML: fullMatch
      };
    });
  } catch (error) {
    console.error('Error finding tags with regex:', error);
    
    // Fallback to node-html-parser
    try {
      const root = parse(htmlContent);
      const allTags = root.querySelectorAll(tagType);
      
      // Filter to top-level tags of this type only
      const topLevelTags = allTags.filter(tag => {
        let parent = tag.parentNode;
        while (parent !== null && parent !== root) {
          if (parent.rawTagName === tagType) {
            return false; // This is a nested tag
          }
          parent = parent.parentNode;
        }
        return true; // This is a top-level tag
      });
      
      // Map to TagInfo objects
      return topLevelTags.map((tag, index) => {
        const outerHTML = tag.outerHTML;
        
        // Find each tag in the original HTML
        let startPos = -1;
        let matches = [];
        let tempPos = 0;
        let tempIndex = htmlContent.indexOf(outerHTML, tempPos);
        
        while (tempIndex !== -1) {
          matches.push(tempIndex);
          tempPos = tempIndex + 1;
          tempIndex = htmlContent.indexOf(outerHTML, tempPos);
        }
        
        // Use the position of the n-th occurrence
        if (index < matches.length) {
          startPos = matches[index];
        } else if (matches.length > 0) {
          startPos = matches[0]; // Fallback to first occurrence
        }
        
        if (startPos === -1) {
          // Create a placeholder for unfound tags
          return {
            startPos: 0,
            endPos: 0,
            content: outerHTML,
            innerContent: tag.innerHTML,
            outerHTML
          };
        }
        
        const endPos = startPos + outerHTML.length;
        
        return {
          startPos,
          endPos,
          content: outerHTML,
          innerContent: tag.innerHTML,
          outerHTML
        };
      });
    } catch (nestedError) {
      console.error('Error in fallback tag finding:', nestedError);
      return [];
    }
  }
}

/**
 * Parse HTML content and get information about all HTML tags
 * 
 * @param htmlContent The full HTML content to parse
 * @returns Object mapping tag types to arrays of tag information
 */
export function parseHTMLContent(htmlContent: string): Record<string, TagInfo[]> {
  // Common HTML tags to search for
  const commonTags = [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
    'ul', 'ol', 'li', 'table', 'tr', 'td', 'th',
    'div', 'span', 'a', 'img', 'blockquote', 'code',
    'pre', 'strong', 'em', 'b', 'i', 'section', 'article',
    'header', 'footer', 'nav', 'aside', 'main', 'figure', 'figcaption'
  ];
  
  const result: Record<string, TagInfo[]> = {};
  
  // Find all instances of each tag type
  for (const tagType of commonTags) {
    const tags = findAllTagsByType(htmlContent, tagType);
    if (tags.length > 0) {
      result[tagType] = tags;
    }
  }
  
  return result;
}

/**
 * Get a summary of the HTML content for AI assistance
 */
export function getHTMLSummary(htmlContent: string): HTMLSummary {
  // Parse the HTML content
  const tagsByType = parseHTMLContent(htmlContent);
  
  // Count tags of each type
  const tagCounts: Record<string, number> = {};
  let totalTags = 0;
  
  for (const [tagType, tags] of Object.entries(tagsByType)) {
    tagCounts[tagType] = tags.length;
    totalTags += tags.length;
  }
  
  return {
    tagsByType,
    tagCounts,
    totalTags
  };
} 