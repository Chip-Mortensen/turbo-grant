import OpenAI from 'openai';
import { GeneratedQuestion, SourceResult, FormattedSource } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const QUESTION_SYSTEM_PROMPT = `You are an expert grant writer and researcher. Your task is to analyze grant proposal content and identify key claims or statements that need scientific sources for support. Focus on identifying claims that:
1. Make specific, testable assertions
2. Present statistics or trends that need verification
3. Describe state-of-the-art or current practices
4. Make comparisons or evaluations
5. Present impact claims or outcomes

Return a JSON object with a 'questions' array containing exactly 5 questions, where each question has:
- id: a short unique identifier
- question: a specific, focused question about finding supporting evidence
- context: the relevant excerpt from the original text that needs support`;

export async function generateQuestions(transcription: string): Promise<GeneratedQuestion[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: QUESTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this grant proposal transcription and identify 5 key claims that need scientific sources:\n\n${transcription}`
        }
      ],
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    try {
      const parsed = JSON.parse(content);
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response format: missing questions array');
      }
      return parsed.questions;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse OpenAI response as JSON');
    }
  } catch (error) {
    console.error('Error in generateQuestions:', error);
    throw error;
  }
}

const FORMAT_SOURCES_SYSTEM_PROMPT = `You are a research assistant helping to format source information into a structured format. Your task is to analyze the search results and format them into structured source entries.

For each source in the search results, extract:
1. The URL
2. Create a one-sentence reason that explains why this source is valuable
3. Create a detailed description paragraph that:
   - Summarizes key findings
   - Highlights the source's credibility
   - Explains how it supports specific claims
4. Extract the citation in the format provided (Author's Last Name, Initials. "Title of Web Page." Website Name, Publisher (if different from website name), Publication Date, URL.)

Important:
- Carefully extract URLs from the text
- Combine duplicate sources if found
- Ensure all URLs are valid
- Preserve the exact citation format provided
- If a citation is missing or incomplete, create one using the available information
- Format the response as a JSON object with a 'sources' array

Example output format:
{
  "sources": [
    {
      "url": "https://example.com/article",
      "reason": "Provides recent data on sea level rise in coastal areas",
      "description": "This peer-reviewed study from the Environmental Research Institute presents comprehensive data on sea level rise trends. The source is particularly valuable as it includes recent measurements and projections, with specific data points showing an average rise of 3.2mm per year since 1993. The research directly supports our understanding of climate change impacts on coastal communities.",
      "citation": "Smith, J. \"The Impact of Climate Change on Coastal Communities.\" Environmental Research Institute, 2024, https://example.com/article"
    }
  ]
}`;

export async function formatSourcesForUpload(
  questions: GeneratedQuestion[],
  searchResults: string[]
): Promise<FormattedSource[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: FORMAT_SOURCES_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here are the research questions and their search results. Please analyze and format them into structured source entries:

Research Questions:
${questions.map((q, i) => `
Question ${i + 1}: ${q.question}
Context: ${q.context}
`).join('\n')}

Search Results:
${searchResults.map((result, i) => `
=== Results for Question ${i + 1} ===
${result}
`).join('\n')}

Please format these results into structured source entries following the specified format.`
        }
      ],
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    try {
      const parsed = JSON.parse(content);
      if (!parsed.sources || !Array.isArray(parsed.sources)) {
        throw new Error('Invalid response format: missing sources array');
      }
      return parsed.sources;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse OpenAI response as JSON');
    }
  } catch (error) {
    console.error('Error in formatSourcesForUpload:', error);
    throw error;
  }
} 