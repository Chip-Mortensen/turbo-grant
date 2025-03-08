import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const { documentId, projectId, format, content } = await req.json();
    const supabase = await createClient();

    // Generate the file based on format
    let buffer: Buffer;
    if (format === 'pdf') {
      buffer = await generatePDF(content);
    } else {
      buffer = await generateDOCX(content);
    }

    // List all files in the project/document directory
    const directoryPath = `${projectId}/${documentId}`;
    console.log('Checking directory:', directoryPath);
    const { data: existingFiles, error: listError } = await supabase
      .storage
      .from('completed-documents')
      .list(directoryPath);

    if (listError) {
      console.error('Error listing files:', listError);
    } else if (existingFiles && existingFiles.length > 0) {
      console.log('Found existing files:', existingFiles);
      // Delete all existing files in the directory
      const filesToDelete = existingFiles.map(file => `${directoryPath}/${file.name}`);
      console.log('Deleting files:', filesToDelete);
      const { error: deleteError } = await supabase
        .storage
        .from('completed-documents')
        .remove(filesToDelete);

      if (deleteError) {
        console.error('Error deleting existing files:', deleteError);
      }
    }

    // Use timestamp in filename to bust cache
    const timestamp = Date.now();
    const fileName = `${projectId}/${documentId}/${timestamp}.${format}`;
    console.log('New file name:', fileName);
    
    // Upload new file
    const { error: uploadError } = await supabase
      .storage
      .from('completed-documents')
      .upload(fileName, buffer, {
        contentType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

    if (uploadError) {
      throw uploadError;
    }

    console.log('File uploaded successfully');

    // Wait a moment for the upload to fully complete and verify the file exists
    const maxRetries = 3;
    let retryCount = 0;
    let fileExists = false;

    while (retryCount < maxRetries && !fileExists) {
      console.log(`Verification attempt ${retryCount + 1}`);
      const { data: checkFiles } = await supabase
        .storage
        .from('completed-documents')
        .list(directoryPath);
      
      if (checkFiles?.some(file => file.name === `${timestamp}.${format}`)) {
        fileExists = true;
        console.log('File verified in storage');
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log('File not found, waiting 500ms before retry');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    if (!fileExists) {
      throw new Error('File upload verification failed');
    }

    // Get the public URL only after confirming the file exists
    const { data: { publicUrl } } = supabase
      .storage
      .from('completed-documents')
      .getPublicUrl(fileName);

    console.log('Generated public URL:', publicUrl);

    // Update the completed_documents table with the new URL
    const { error: updateError } = await supabase
      .from('completed_documents')
      .upsert({
        document_id: documentId,
        project_id: projectId,
        file_url: publicUrl,
        file_type: format,
        file_path: fileName
      }, {
        onConflict: 'document_id,project_id'
      });

    if (updateError) {
      throw updateError;
    }

    // Return the new URL immediately since we know it's correct
    return NextResponse.json({ fileUrl: publicUrl });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export document' },
      { status: 500 }
    );
  }
}

async function generatePDF(content: string): Promise<Buffer> {
  // Create a new PDFDocument
  const pdfDoc = await PDFDocument.create();
  
  // Add a blank page with letter size (8.5 x 11 inches)
  // Convert inches to points (1 inch = 72 points)
  let page = pdfDoc.addPage([8.5 * 72, 11 * 72]);
  
  // Embed Times New Roman (using Helvetica as fallback since pdf-lib doesn't support Times New Roman)
  // TODO: Consider using a different PDF library that supports Times New Roman
  const regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  // Constants for formatting
  const fontSize = 11; // NSF requirement for Times New Roman
  const headingSize = 11; // Keep same size for consistency
  const margin = 72; // 1 inch = 72 points
  // NSF requires no more than 6 lines per inch
  // At 11pt font, we need at least 12pt line height to meet this (72/6 = 12)
  const lineHeight = Math.max(fontSize * 1.2, 12); // Ensures no more than 6 lines per inch
  const paragraphSpacing = lineHeight * 1.5; // Add 50% more space between paragraphs
  const headingSpacing = lineHeight * 2; // Double space after headings
  let yPosition = page.getSize().height - margin; // Start 1 inch from top

  // Split content into sections by h1 tags, keeping the tags
  const parts = content.split(/(<h1>.*?<\/h1>)/).filter(Boolean);
  
  for (const part of parts) {
    // Check if this part is a heading
    if (part.startsWith('<h1>')) {
      // Extract heading text
      const headingText = part.replace(/<\/?h1>/g, '').trim();
      
      // Add a new page if there isn't enough space for heading + some content
      if (yPosition < margin + headingSize * 3) {
        page = pdfDoc.addPage([8.5 * 72, 11 * 72]);
        yPosition = page.getSize().height - margin;
      }
      
      // Draw the heading
      page.drawText(headingText, {
        x: margin,
        y: yPosition,
        size: headingSize,
        font: boldFont
      });
      yPosition -= headingSpacing;
    } else {
      // Process paragraphs
      const paragraphs = part
        .split('</p>')
        .map(p => p.replace(/<p>/g, '').trim())
        .filter(Boolean);
      
      for (const paragraph of paragraphs) {
        // Add a new page if there isn't enough space for at least one line
        if (yPosition < margin + fontSize) {
          page = pdfDoc.addPage([8.5 * 72, 11 * 72]);
          yPosition = page.getSize().height - margin;
        }
        
        // Split paragraph into words
        const words = paragraph.split(' ');
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const textWidth = regularFont.widthOfTextAtSize(testLine, fontSize);
          
          if (textWidth > page.getSize().width - 2 * margin) {
            // Draw the current line
            page.drawText(currentLine, {
              x: margin,
              y: yPosition,
              size: fontSize,
              font: regularFont
            });
            yPosition -= lineHeight;
            currentLine = word;
            
            // Add a new page if needed
            if (yPosition < margin) {
              page = pdfDoc.addPage([8.5 * 72, 11 * 72]);
              yPosition = page.getSize().height - margin;
            }
          } else {
            currentLine = testLine;
          }
        }
        
        // Draw the last line of the paragraph
        if (currentLine) {
          page.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: fontSize,
            font: regularFont
          });
          yPosition -= paragraphSpacing;
        }
      }
    }
  }
  
  // Serialize the PDFDocument to bytes
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function generateDOCX(content: string): Promise<Buffer> {
  // Split content into sections by h1 tags, keeping the tags
  const parts = content.split(/(<h1>.*?<\/h1>)/).filter(Boolean);
  
  // Create document with proper formatting
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: 12240, // 8.5 inches in twips (1440 twips per inch)
            height: 15840, // 11 inches in twips
          },
          margin: {
            top: 1440,    // 1 inch margins
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: parts.map(part => {
        if (part.startsWith('<h1>')) {
          // Extract heading text and create heading paragraph
          const headingText = part.replace(/<\/?h1>/g, '').trim();
          return new Paragraph({
            children: [
              new TextRun({
                text: headingText,
                bold: true,
                size: 22, // 11 points * 2
                font: 'Times New Roman',
              }),
            ],
            heading: 'Heading1',
            spacing: {
              after: 480, // 20 points (24 twips per point)
              line: 360, // 15 points
              lineRule: 'exact',
            },
          });
        } else {
          // Process paragraphs
          const paragraphs = part
            .split('</p>')
            .map(p => p.replace(/<p>/g, '').trim())
            .filter(Boolean);

          return paragraphs.map(text => new Paragraph({
            children: [
              new TextRun({
                text: text,
                size: 22, // 11 points * 2
                font: 'Times New Roman',
              }),
            ],
            spacing: {
              after: 360, // 15 points
              line: 360, // 15 points (ensures no more than 6 lines per inch)
              lineRule: 'exact',
            },
          }));
        }
      }).flat(),
    }],
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: 22, // 11 points * 2
            font: {
              name: 'Times New Roman',
            },
            bold: true,
          },
          paragraph: {
            spacing: {
              after: 480, // 20 points
              line: 360, // 15 points
              lineRule: 'exact',
            },
          },
        },
      ],
    },
  });

  return await Packer.toBuffer(doc);
} 