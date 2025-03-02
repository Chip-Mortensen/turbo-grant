import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing env.OPENAI_API_KEY');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbeddings(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    encoding_format: 'float',
  });

  return response.data[0].embedding;
}

export async function generateImageDescription(imageBase64: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: `Please provide a detailed description of this scientific figure in plain text format.

Important: Do NOT use any markdown formatting (no headings, no bullet points, no asterisks for bold/italic, etc.).

Your description should:
1. Start with a clear title or summary of what the figure shows
2. Include a comprehensive overview of the figure's content
3. Describe the key elements, data points, or trends visible in the figure
4. Explain any labels, legends, or annotations
5. Mention the significance or implications of what's shown, if apparent

Use simple, clear language without any special formatting characters. The description should be comprehensive enough for someone who cannot see the image to understand its content and significance.`
          },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      },
    ],
    max_tokens: 800,
  });

  return response.choices[0].message.content || '';
} 