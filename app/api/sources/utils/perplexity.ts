import { GeneratedQuestion, SourceResult } from './types';

const PERPLEXITY_SYSTEM_PROMPT = `You are a research assistant helping to find and analyze sources for a project. For each source you find, provide:

1. The direct URL to the source
2. The full title of the webpage or article
3. The publishing organization or journal name
4. A brief explanation of how this source supports the claim
5. A relevant quote or data point from the source
6. A citation in the following format:
   Author's Last Name, Initials. "Title of Web Page." Website Name, Publisher (if different from website name), Publication Date, URL.

For example:
URL: https://example.com/article
Title: The Impact of Climate Change on Coastal Communities
Organization: Environmental Research Institute
Explanation: This source provides recent data on sea level rise in coastal areas
Quote: "Sea levels have risen by an average of 3.2mm per year since 1993"
Citation: Smith, J. "The Impact of Climate Change on Coastal Communities." Environmental Research Institute, 2024, https://example.com/article

Important:
- Only include sources that are directly relevant to the claim
- Ensure all URLs are valid and accessible
- Include complete citations with all available information
- If certain citation elements are missing, use [n.d.] for no date or [n.p.] for no publisher
- Format the response as plain text, not JSON
- Each source should be separated by a blank line for clarity`;

export async function findSources(question: GeneratedQuestion): Promise<string> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: PERPLEXITY_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Find reliable sources that support this claim (include the context for reference):

Question: ${question.question}
Context from grant: "${question.context}"

Remember to focus on high-quality, reputable sources suitable for NSF/NIH grants.`
        }
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in Perplexity response');
  }

  // Return the raw text content
  return content;
}

// Helper function to process questions in batches
async function processBatch(questions: GeneratedQuestion[], batchSize: number): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(question => findSources(question))
    );
    results.push(...batchResults);
    
    // Add a small delay between batches to avoid rate limits
    if (i + batchSize < questions.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return results;
}

export async function searchAllQuestions(questions: GeneratedQuestion[]): Promise<string[]> {
  // Run all requests in parallel
  return Promise.all(questions.map(question => findSources(question)));
} 