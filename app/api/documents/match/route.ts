import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { optionalDocuments, requiredDocuments } = await req.json();
    
    // Validate input
    if (!Array.isArray(optionalDocuments) || !Array.isArray(requiredDocuments)) {
      return NextResponse.json(
        { error: 'Invalid input: optionalDocuments and requiredDocuments must be arrays' },
        { status: 400 }
      );
    }

    // Format the documents for comparison
    const formattedOptionalDocs = optionalDocuments.map(doc => ({
      id: doc.id,
      title: doc.name || doc.title
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a document matching expert. Your task is to identify which optional documents match the required documents from an FOA. 

Guidelines:
1. Only match documents that serve the same purpose
2. Do not match documents that are merely similar but serve different purposes
3. Consider common variations in document names (e.g., "Research Strategy" might match "Research Plan")
4. Be conservative in matching - if in doubt, do not match
5. Return only the IDs of matched documents

Return a JSON object with a single field "matchedDocumentIds" containing an array of matched document IDs.`
        },
        {
          role: "user",
          content: JSON.stringify({
            optionalDocuments: formattedOptionalDocs,
            requiredDocuments
          }, null, 2)
        }
      ],
      response_format: { type: "json_object" }
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Validate response format
    if (!Array.isArray(response.matchedDocumentIds)) {
      console.error('Invalid response format from GPT:', response);
      return NextResponse.json(
        { error: 'Invalid response format from document matcher' },
        { status: 500 }
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error matching documents:', error);
    return NextResponse.json(
      { error: 'Failed to match documents' },
      { status: 500 }
    );
  }
} 