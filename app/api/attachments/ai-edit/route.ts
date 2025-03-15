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
6. Limit to 3-5 thoughtful suggestions

For each edit, return:
- tagType: The HTML tag type (p, h1, li, etc.)
- tagIndex: The index of that tag type (0-based)
- originalContent: The complete original tag with its content
- newContent: The complete replacement tag with its content
- reason: A brief explanation of your improvement

Example 1:
If a paragraph needs to be more concise, you might suggest:
{
  "type": "replace",
  "tagType": "p",
  "tagIndex": 2,
  "originalContent": "<p>This paragraph contains a lot of unnecessary words and could be written in a much more concise and straightforward way to improve readability for the end user.</p>",
  "newContent": "<p>This paragraph is now more concise and readable.</p>",
  "reason": "Made the text more concise by removing redundant phrases"
}

Example 2:
If a heading needs a technical term corrected:
{
  "type": "replace",
  "tagType": "h3",
  "tagIndex": 1,
  "originalContent": "<h3>Understanding Artificial Intelligence Learning</h3>",
  "newContent": "<h3>Understanding Machine Learning</h3>",
  "reason": "Corrected terminology to be more technically precise"
}

Example 3:
If a list item needs more detail:
{
  "type": "replace",
  "tagType": "li",
  "tagIndex": 4,
  "originalContent": "<li>Submit your application</li>",
  "newContent": "<li>Submit your application with all required documents through the online portal by the May 15th deadline</li>",
  "reason": "Added specific details about submission requirements and deadline"
}

Format your response as a JSON array of edit suggestion objects.`;
    
    console.log('System prompt length:', systemPrompt.length);
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `HTML CONTENT:\n${content}\n\nINSTRUCTION: ${instruction}` }
      ],
      temperature: 0.7,
    });
    
    // Get assistant's response
    const assistantResponse = response.choices[0].message.content;
    console.log('OpenAI response:', assistantResponse);
    
    let suggestions: EditSuggestion[] = [];
    
    try {
      // Parse the JSON response
      if (assistantResponse) {
        const jsonStart = assistantResponse.indexOf('[');
        const jsonEnd = assistantResponse.lastIndexOf(']');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
          const jsonString = assistantResponse.substring(jsonStart, jsonEnd + 1);
          suggestions = JSON.parse(jsonString);
        } else {
          // Fallback for responses without proper JSON formatting
          suggestions = JSON.parse(assistantResponse);
        }
      }
      
      console.log('Parsed suggestions:', suggestions);
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