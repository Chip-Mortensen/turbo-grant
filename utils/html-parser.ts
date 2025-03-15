/**
 * HTML parsing utilities for finding and manipulating HTML tags
 */

/**
 * Result of a tag finding operation
 */
export interface TagInfo {
  startPos: number;    // Starting position of the tag in the HTML string
  endPos: number;      // Ending position of the tag in the HTML string
  content: string;     // The full content of the tag, including the tag itself
  innerContent: string; // The inner content of the tag (without the tag itself)
  outerHTML: string;   // The full HTML string of the tag
}

/**
 * Find a specific HTML tag in document content by its type and index
 * 
 * @param htmlContent The full HTML content to search within
 * @param tagType The type of tag to find (e.g., 'p', 'h1', 'div')
 * @param tagIndex The zero-based index of the tag (e.g., 0 for first tag, 1 for second tag)
 * @returns Tag information or null if not found
 */
export function findTagByTypeAndIndex(
  htmlContent: string,
  tagType: string,
  tagIndex: number
): TagInfo | null {
  try {
    // Parse the HTML content to find all tags of the specified type
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Get all tags of the specified type, but only top-level ones
    // This ensures we don't double-count nested tags of the same type
    const tags = Array.from(doc.body.getElementsByTagName(tagType))
      .filter(tag => {
        // Check if this tag's parent also has the same tag type
        let parent = tag.parentElement;
        while (parent && parent !== doc.body) {
          if (parent.tagName.toLowerCase() === tagType) {
            return false; // This is a nested tag of the same type, exclude it
          }
          parent = parent.parentElement;
        }
        return true; // This is a top-level tag or nested in a different tag type
      });
    
    // Check if the index is valid
    if (tagIndex < 0 || tagIndex >= tags.length) {
      console.warn(`Tag not found: ${tagType} at index ${tagIndex} (found ${tags.length} tags)`);
      return null;
    }
    
    // Get the specified tag
    const tag = tags[tagIndex];
    if (!tag) return null;
    
    // Get the original string representation of the tag
    const tagHTML = tag.outerHTML;
    
    // Find the tag's position in the original HTML content
    // We need to be careful here as there might be multiple identical tags
    let startPos = -1;
    const allMatches = [];
    
    // First find all instances of this tag HTML
    let tempIndex = htmlContent.indexOf(tagHTML);
    while (tempIndex !== -1) {
      allMatches.push(tempIndex);
      tempIndex = htmlContent.indexOf(tagHTML, tempIndex + 1);
    }
    
    // If there's only one match, use it
    if (allMatches.length === 1) {
      startPos = allMatches[0];
    } 
    // If there are multiple matches, try to determine the correct one based on the surrounding content
    else if (allMatches.length > 1) {
      // Use tag context to find the correct one
      const tagContext = getTagContext(htmlContent, tag, doc.body);
      if (tagContext) {
        for (const matchPos of allMatches) {
          // Check if this match has the expected context before and after
          const beforeText = htmlContent.substring(Math.max(0, matchPos - 50), matchPos);
          const afterText = htmlContent.substring(matchPos + tagHTML.length, Math.min(htmlContent.length, matchPos + tagHTML.length + 50));
          
          if (beforeText.includes(tagContext.before) && afterText.includes(tagContext.after)) {
            startPos = matchPos;
            break;
          }
        }
      }
      
      // If we still don't have a match, use the index'th occurrence
      if (startPos === -1 && tagIndex < allMatches.length) {
        startPos = allMatches[tagIndex];
      } else if (startPos === -1) {
        // Fallback to the first occurrence
        startPos = allMatches[0];
      }
    }
    
    if (startPos === -1) {
      console.warn(`Could not locate ${tagType} tag at index ${tagIndex} in HTML content`);
      return null;
    }
    
    const endPos = startPos + tagHTML.length;
    
    return {
      startPos,
      endPos,
      content: tagHTML,
      innerContent: tag.innerHTML,
      outerHTML: tagHTML
    };
  } catch (error) {
    console.error('Error finding tag:', error);
    return null;
  }
}

/**
 * Helper function to get context around a tag to help with precise positioning
 */
function getTagContext(
  htmlContent: string, 
  tag: Element, 
  root: Element
): { before: string, after: string } | null {
  try {
    // Find the surrounding context of this tag
    let prevSibling = tag.previousElementSibling;
    let nextSibling = tag.nextElementSibling;
    
    let beforeContext = '';
    let afterContext = '';
    
    // Try to get text from previous sibling
    if (prevSibling) {
      beforeContext = prevSibling.outerHTML.substring(prevSibling.outerHTML.length - 30);
    } 
    // If no previous sibling, try parent's start tag
    else if (tag.parentElement && tag.parentElement !== root) {
      const parentTag = tag.parentElement.tagName.toLowerCase();
      beforeContext = `<${parentTag}`;
    }
    
    // Try to get text from next sibling
    if (nextSibling) {
      afterContext = nextSibling.outerHTML.substring(0, 30);
    }
    // If no next sibling, try parent's end tag
    else if (tag.parentElement && tag.parentElement !== root) {
      const parentTag = tag.parentElement.tagName.toLowerCase();
      afterContext = `</${parentTag}>`;
    }
    
    return { before: beforeContext, after: afterContext };
  } catch (error) {
    console.error('Error getting tag context:', error);
    return null;
  }
}

/**
 * Find all instances of a specific tag type in the HTML content
 * 
 * @param htmlContent The full HTML content to search within
 * @param tagType The type of tag to find (e.g., 'p', 'h1', 'div')
 * @returns Array of tag information objects
 */
export function findAllTagsByType(
  htmlContent: string,
  tagType: string
): TagInfo[] {
  try {
    // Parse the HTML content to find all tags of the specified type
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Get all tags of the specified type, but only top-level ones
    // This ensures we don't double-count nested tags of the same type
    const tags = Array.from(doc.body.getElementsByTagName(tagType))
      .filter(tag => {
        // Check if this tag's parent also has the same tag type
        let parent = tag.parentElement;
        while (parent && parent !== doc.body) {
          if (parent.tagName.toLowerCase() === tagType) {
            return false; // This is a nested tag of the same type, exclude it
          }
          parent = parent.parentElement;
        }
        return true; // This is a top-level tag or nested in a different tag type
      });
    
    // Map HTML elements to TagInfo objects
    return tags.map((tag, index) => {
      // Get the original string representation of the tag
      const tagHTML = tag.outerHTML;
      
      // Find the tag's position in the original HTML content
      // For multiple identical tags, we need to find the correct occurrence
      let startPos = -1;
      const allMatches = [];
      
      // First find all instances of this tag HTML
      let tempIndex = htmlContent.indexOf(tagHTML);
      while (tempIndex !== -1) {
        allMatches.push(tempIndex);
        tempIndex = htmlContent.indexOf(tagHTML, tempIndex + 1);
      }
      
      // If there's only one match, use it
      if (allMatches.length === 1) {
        startPos = allMatches[0];
      } 
      // If there are multiple matches and this is not the first one,
      // try to determine which one corresponds to the current tag
      else if (allMatches.length > 1) {
        // Use tag context to find the correct one
        const tagContext = getTagContext(htmlContent, tag, doc.body);
        if (tagContext) {
          for (const matchPos of allMatches) {
            // Check if this match has the expected context
            const beforeText = htmlContent.substring(Math.max(0, matchPos - 50), matchPos);
            const afterText = htmlContent.substring(matchPos + tagHTML.length, Math.min(htmlContent.length, matchPos + tagHTML.length + 50));
            
            if (beforeText.includes(tagContext.before) && afterText.includes(tagContext.after)) {
              startPos = matchPos;
              break;
            }
          }
        }
        
        // If we still don't have a match, use the index'th occurrence if available
        if (startPos === -1 && index < allMatches.length) {
          startPos = allMatches[index];
        } else if (startPos === -1) {
          // Fallback to the first occurrence
          startPos = allMatches[0];
        }
      }
      
      if (startPos === -1) {
        console.warn(`Could not locate ${tagType} tag at index ${index} in HTML content. Using fallback.`);
        // Create a fallback tag info with approximate position
        return {
          startPos: 0, // Unknown position
          endPos: 0,  // Unknown position
          content: tagHTML,
          innerContent: tag.innerHTML,
          outerHTML: tagHTML
        };
      }
      
      const endPos = startPos + tagHTML.length;
      
      return {
        startPos,
        endPos,
        content: tagHTML,
        innerContent: tag.innerHTML,
        outerHTML: tagHTML
      };
    });
  } catch (error) {
    console.error('Error finding tags:', error);
    return [];
  }
}

/**
 * Parse HTML content and get information about all HTML tags
 * 
 * @param htmlContent The full HTML content to parse
 * @returns Object mapping tag types to arrays of tag information
 */
export function parseHTMLContent(htmlContent: string): Record<string, TagInfo[]> {
  // Common HTML tags to look for
  const commonTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'div', 'span', 'a', 'img', 'table', 'tr', 'td', 'th'];
  
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
 * Server-side safe version of the tag finder for Node.js environments
 * where DOMParser is not available
 */
export function findTagByTypeAndIndexServerSide(
  htmlContent: string,
  tagType: string,
  tagIndex: number
): TagInfo | null {
  // Simple regex-based implementation for server-side
  const tagRegex = new RegExp(`<${tagType}[^>]*>(.*?)<\/${tagType}>`, 'gis');
  
  let match;
  let currentIndex = 0;
  
  while ((match = tagRegex.exec(htmlContent)) !== null) {
    if (currentIndex === tagIndex) {
      const fullMatch = match[0];
      const innerContent = match[1];
      const startPos = match.index;
      const endPos = startPos + fullMatch.length;
      
      return {
        startPos,
        endPos,
        content: fullMatch,
        innerContent,
        outerHTML: fullMatch
      };
    }
    
    currentIndex++;
  }
  
  return null;
}

/**
 * Interface for HTML summary result
 */
export interface HTMLSummary {
  tagsByType: Record<string, TagInfo[]>;
  tagCounts: Record<string, number>;
  totalTags: number;
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