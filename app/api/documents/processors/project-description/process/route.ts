import { generateFullProjectContent } from "@/lib/project-document-processing/project-description-processor"
import { NextResponse } from "next/server"
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const { documentId, projectId } = await request.json()
    console.log(`Processing document ${documentId} for project ${projectId}`) // This will show in server logs
    
    const supabase = await createClient()
    
    // Get project's FOA
    const { data: project } = await supabase
      .from('research_projects')
      .select('foa')
      .eq('id', projectId)
      .single()
    
    if (!project?.foa) {
      throw new Error('Project has no associated FOA')
    }

    // Check for existing document to preserve any manual edits
    const { data: existingDoc } = await supabase
      .from('completed_documents')
      .select('content')
      .eq('document_id', documentId)
      .eq('project_id', projectId)
      .single()

    // If there's an existing document, we'll return that instead
    // This ensures we don't overwrite any manual edits
    if (existingDoc?.content) {
      return NextResponse.json({ content: existingDoc.content })
    }

    // Generate the content
    const content = await generateFullProjectContent(projectId, project.foa)
    
    if (content.error) {
      console.error('Error from content generation:', content.error)
      throw new Error(content.error)
    }

    if (!content.sections || content.sections.length === 0) {
      console.error('No sections returned from content generation')
      throw new Error('No content was generated')
    }

    // Convert the structured content into HTML
    const htmlContent = content.sections.map(section => {
      if (!section.heading || !section.content) {
        console.error('Invalid section:', section)
        return ''
      }
      // Replace line breaks with <br/> tags and wrap content in paragraphs
      const formattedContent = section.content
        .split('\n')
        .filter(line => line.trim() !== '') // Remove empty lines
        .map(line => `<p>${line}</p>`)
        .join('\n')
      
      return `<h1>${section.heading}</h1>\n${formattedContent}\n`
    }).join('\n')

    if (!htmlContent) {
      throw new Error('Failed to generate HTML content')
    }
    
    return NextResponse.json({ 
      content: htmlContent,
      message: 'Content generated successfully. Click save to store your changes.'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process document'
    console.error('Error processing document:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
} 