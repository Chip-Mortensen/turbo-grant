import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { HTMLSummary } from '@/utils/server-html-parser';

// Get OpenAI API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EditSuggestion {
  type: 'replace';
  tagType: string;
  tagIndex: number;
  originalContent: string;
  newContent: string;
  reason: string;
}

interface NodeEdit {
  operation: 'replace' | 'add' | 'delete';
  tagType: string;
  tagIndex?: number;
  originalContent?: string;
  newContent?: string;
  position?: 'before' | 'after';
  referenceNodeType?: string;
  referenceNodeIndex?: number;
  explanation?: string;
}

export interface EditSuggestion {
  type: 'replace';
  edits: NodeEdit[];
  reason: string;
}

interface RequestData {
  content: string;
  instruction: string;
  documentId: string;
  projectId: string;
  htmlSummary: HTMLSummary;
}

export async function POST(request: Request) {
  try {
    // Parse request body
    const requestData: RequestData = await request.json();
    const { content, instruction, htmlSummary } = requestData;
    
    // Create a summary of the HTML structure for the model
    let tagSummary = "Document structure:\n";
    for (const [tagType, count] of Object.entries(htmlSummary.tagCounts)) {
      tagSummary += `- ${tagType}: ${count} tags\n`;
    }
    
    // Create system prompt
    const systemPrompt = `You are an expert editor helping to improve a document.
You will receive HTML content and an instruction asking for specific improvements.

Your task is to suggest targeted edits to the HTML content based on the instruction.
Focus on making impactful improvements without changing the document structure.

${tagSummary}

IMPORTANT GUIDELINES:
1. Identify specific HTML tags to modify based on their tag type and index
2. Provide complete replacement content for those tags
3. DO NOT change the tag type, only the content inside the tags
4. Include a brief reason for each suggested edit
5. Focus on high-impact edits that significantly improve the document
6. You may edit as many nodes as necessary to fulfill the user's request
7. For broad requests like "improve tone" or "fix grammar", edit multiple nodes as needed
8. When condensing information across multiple paragraphs, use a combination of DELETE and ADD operations rather than multiple REPLACE operations

CONDENSING INFORMATION:
When asked to condense information (especially across multiple paragraphs):
1. DELETE the original paragraphs that contain redundant or verbose content
2. ADD a new, concise paragraph that captures the essential information
3. This approach is preferred over multiple REPLACE operations when significant condensation is needed
4. Example: If paragraphs 2, 3, and 4 contain related information that can be condensed, delete all three and add one new paragraph with the condensed content

AVAILABLE OPERATIONS:
1. Replace existing content:
   - operation: "replace"
   - tagType: The HTML tag type (p, h1)
   - tagIndex: The index of that tag type (0-based)
   - originalContent: The complete original tag with its content
   - newContent: The complete replacement tag with its content
   - explanation: A brief explanation of this specific change

2. Add new content:
   - operation: "add"
   - tagType: The type of node to add (p, h1)
   - newContent: The content of the new node
   - position: Where to add it ("before" or "after")
   - referenceNodeType: The type of node to position relative to
   - referenceNodeIndex: The index of the reference node
   - explanation: Why this content is being added

3. Delete content:
   - operation: "delete"
   - tagType: The type of node to delete
   - tagIndex: The index of the node to delete
   - originalContent: The content being deleted (for confirmation)
   - explanation: Why this content is being removed

Group all edits into a single suggestion with:
- type: Always "replace"
- edits: An array of all the individual node edits
- reason: An overall explanation for all the changes

Example response format:
{
  "type": "replace",
  "edits": [
    {
      "operation": "replace",
      "tagType": "p",
      "tagIndex": 2,
      "originalContent": "<p>This paragraph needs improvement.</p>",
      "newContent": "<p>This paragraph has been improved.</p>",
      "explanation": "Made the text more concise"
    },
    {
      "operation": "add",
      "tagType": "h1",
      "newContent": "<h1>New Section Title</h1>",
      "position": "after",
      "referenceNodeType": "h1",
      "referenceNodeIndex": 2,
      "explanation": "Added a new section to cover important topic X"
    },
    {
      "operation": "delete",
      "tagType": "p",
      "tagIndex": 5,
      "originalContent": "<p>This paragraph is redundant and can be removed.</p>",
      "explanation": "Removed redundant information that was already covered"
    }
  ],
  "reason": "Improved clarity and conciseness throughout the document"
}

Example of condensing multiple paragraphs:
{
  "type": "replace",
  "edits": [
    {
      "operation": "delete",
      "tagType": "p",
      "tagIndex": 3,
      "originalContent": "<p>First paragraph with detailed information about a topic.</p>",
      "explanation": "Removing verbose content to be condensed"
    },
    {
      "operation": "delete",
      "tagType": "p",
      "tagIndex": 4,
      "originalContent": "<p>Second paragraph continuing the explanation with more details.</p>",
      "explanation": "Removing verbose content to be condensed"
    },
    {
      "operation": "delete",
      "tagType": "p",
      "tagIndex": 5,
      "originalContent": "<p>Third paragraph with final points about the topic.</p>",
      "explanation": "Removing verbose content to be condensed"
    },
    {
      "operation": "add",
      "tagType": "p",
      "newContent": "<p>Concise summary covering all key points from the three original paragraphs.</p>",
      "position": "after",
      "referenceNodeType": "p",
      "referenceNodeIndex": 2,
      "explanation": "Added condensed version that captures all essential information"
    }
  ],
  "reason": "Condensed three verbose paragraphs into one concise paragraph while preserving all key information"
}

IMPORTANT: Only include edits where there is an actual change. For replace operations, ensure newContent is different from originalContent.

Format your response as a JSON object with the structure shown above.`;
    
    console.log('System prompt length:', systemPrompt.length);
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `HTML CONTENT:\n${content}\n\nINSTRUCTION: ${instruction}` }
      ],
      temperature: 0.7,
      max_completion_tokens: 5000,
    });
    
    // Get assistant's response
    const assistantResponse = response.choices[0].message.content;
    console.log('OpenAI response received');
    
    let suggestions: EditSuggestion[] = [];
    
    try {
      // Parse the JSON response
      if (assistantResponse) {
        const jsonStart = assistantResponse.indexOf('{');
        const jsonEnd = assistantResponse.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
          const jsonString = assistantResponse.substring(jsonStart, jsonEnd + 1);
          const parsedResponse = JSON.parse(jsonString);
          
          // Handle both old and new format
          if (Array.isArray(parsedResponse)) {
            // Old format - array of suggestions
            suggestions = parsedResponse;
          } else if (parsedResponse.type === 'replace' && Array.isArray(parsedResponse.edits)) {
            // New format - single suggestion with multiple edits
            
            // Filter out invalid edits
            parsedResponse.edits = parsedResponse.edits.filter((edit: NodeEdit) => {
              // For replace operations, ensure originalContent and newContent are different
              if (edit.operation === 'replace' && edit.originalContent === edit.newContent) {
                return false;
              }
              
              // For add operations, ensure required fields are present
              if (edit.operation === 'add' && (!edit.newContent || !edit.position || 
                  edit.referenceNodeType === undefined || edit.referenceNodeIndex === undefined)) {
                return false;
              }
              
              // For delete operations, ensure required fields are present
              if (edit.operation === 'delete' && (edit.tagType === undefined || edit.tagIndex === undefined)) {
                return false;
              }
              
              return true;
            });
            
            // Only include the suggestion if it has at least one valid edit
            if (parsedResponse.edits.length > 0) {
              suggestions = [parsedResponse];
            } else {
              suggestions = [];
            }
          } else {
            // Unexpected format
            throw new Error('Unexpected response format from AI');
          }
        } else {
          // Fallback for responses without proper JSON formatting
          suggestions = JSON.parse(assistantResponse);
        }
      }
      
      console.log(`Parsed ${suggestions.length} suggestions with a total of ${suggestions.reduce((count, s) => count + (s.edits?.length || 1), 0)} edits`);
    } catch (error) {
      console.error('Error parsing suggestions:', error);
      return NextResponse.json({ error: 'Failed to parse AI suggestions' }, { status: 500 });
    }
    
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error processing AI edit request:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
} 