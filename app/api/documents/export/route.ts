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

    // Use timestamp in filename for cache busting
    const timestamp = new Date().getTime();
    const fileName = `${projectId}/${documentId}/document-${timestamp}.${format}`;
    console.log('New file name:', fileName);
    
    // Upload new file
    const { error: uploadError } = await supabase
      .storage
      .from('completed-documents')
      .upload(fileName, buffer, {
        contentType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    console.log('File uploaded successfully');

    // Get the public URL
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

    return NextResponse.json({ fileUrl: publicUrl });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export document' },
      { status: 500 }
    );
  }
}

function sanitizeText(text: string): string {
  // Remove control characters (including 0x001E) but preserve normal whitespace
  // Only remove inline formatting tags, preserve structural tags
  return text
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .replace(/<\/?(?!h1|p)(?:strong|em|b|i)[^>]*>/g, ''); // Remove formatting tags but preserve h1 and p
}

// Helper function to parse HTML tags and return text segments with formatting info
type TextSegment = {
  text: string;
  isBold: boolean;
  isItalic: boolean;
};

function parseHTMLText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let currentIndex = 0;
  let currentText = '';
  let isBold = false;
  let isItalic = false;

  while (currentIndex < text.length) {
    const bIndex = text.indexOf('<b>', currentIndex);
    const strongIndex = text.indexOf('<strong>', currentIndex);
    const boldStartIndex = bIndex === -1 ? strongIndex : strongIndex === -1 ? bIndex : Math.min(bIndex, strongIndex);

    const bEndIndex = text.indexOf('</b>', currentIndex);
    const strongEndIndex = text.indexOf('</strong>', currentIndex);
    const boldEndIndex = bEndIndex === -1 ? strongEndIndex : strongEndIndex === -1 ? bEndIndex : Math.min(bEndIndex, strongEndIndex);

    const iIndex = text.indexOf('<i>', currentIndex);
    const emIndex = text.indexOf('<em>', currentIndex);
    const italicStartIndex = iIndex === -1 ? emIndex : emIndex === -1 ? iIndex : Math.min(iIndex, emIndex);

    const iEndIndex = text.indexOf('</i>', currentIndex);
    const emEndIndex = text.indexOf('</em>', currentIndex);
    const italicEndIndex = iEndIndex === -1 ? emEndIndex : emEndIndex === -1 ? iEndIndex : Math.min(iEndIndex, emEndIndex);

    const nextTagIndex = [boldStartIndex, boldEndIndex, italicStartIndex, italicEndIndex]
      .filter((index): index is number => index !== -1)
      .reduce((min, current) => Math.min(min, current), Infinity);

    if (nextTagIndex === Infinity) {
      // No more tags, add remaining text
      if (currentText || text.slice(currentIndex)) {
        segments.push({
          text: sanitizeText(currentText + text.slice(currentIndex)),
          isBold,
          isItalic
        });
      }
      break;
    }

    if (nextTagIndex > currentIndex) {
      currentText += text.slice(currentIndex, nextTagIndex);
    }

    const isStrongTag = text.startsWith('<strong>', nextTagIndex);
    const isEmTag = text.startsWith('<em>', nextTagIndex);

    if (nextTagIndex === boldStartIndex) {
      if (currentText) {
        segments.push({ text: sanitizeText(currentText), isBold, isItalic });
        currentText = '';
      }
      isBold = true;
      currentIndex = nextTagIndex + (isStrongTag ? 8 : 3); // Length of '<strong>' or '<b>'
    } else if (nextTagIndex === boldEndIndex) {
      if (currentText) {
        segments.push({ text: sanitizeText(currentText), isBold, isItalic });
        currentText = '';
      }
      isBold = false;
      currentIndex = nextTagIndex + (text.startsWith('</strong>', nextTagIndex) ? 9 : 4); // Length of '</strong>' or '</b>'
    } else if (nextTagIndex === italicStartIndex) {
      if (currentText) {
        segments.push({ text: sanitizeText(currentText), isBold, isItalic });
        currentText = '';
      }
      isItalic = true;
      currentIndex = nextTagIndex + (isEmTag ? 4 : 3); // Length of '<em>' or '<i>'
    } else if (nextTagIndex === italicEndIndex) {
      if (currentText) {
        segments.push({ text: sanitizeText(currentText), isBold, isItalic });
        currentText = '';
      }
      isItalic = false;
      currentIndex = nextTagIndex + (text.startsWith('</em>', nextTagIndex) ? 5 : 4); // Length of '</em>' or '</i>'
    }
  }

  return segments;
}

async function generatePDF(content: string): Promise<Buffer> {
  // Don't sanitize the full content up front
  const pdfDoc = await PDFDocument.create();
  
  // Add a blank page with letter size (8.5 x 11 inches)
  let page = pdfDoc.addPage([8.5 * 72, 11 * 72]);
  
  // Embed fonts
  const regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const boldItalicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
  
  // Constants for formatting
  const fontSize = 11;
  const headingSize = 11;
  const margin = 72;
  const lineHeight = Math.max(fontSize * 1.2, 12);
  const paragraphSpacing = lineHeight * 1.5;
  const headingSpacing = lineHeight * 2;
  let yPosition = page.getSize().height - margin;

  // Split content into sections by h1 tags, keeping the tags
  const parts = content.split(/(<h1>.*?<\/h1>)/).filter(Boolean);
  
  for (const part of parts) {
    if (part.startsWith('<h1>')) {
      // Only sanitize the heading text content
      const headingText = part.replace(/<\/?h1>/g, '').trim();
      
      if (yPosition < margin + headingSize * 3) {
        page = pdfDoc.addPage([8.5 * 72, 11 * 72]);
        yPosition = page.getSize().height - margin;
      }
      
      page.drawText(headingText, {
        x: margin,
        y: yPosition,
        size: headingSize,
        font: boldFont
      });
      yPosition -= headingSpacing;
    } else {
      const paragraphs = part
        .split('</p>')
        .map(p => p.replace(/<p>/g, '').trim())
        .filter(Boolean);
      
      for (const paragraph of paragraphs) {
        if (yPosition < margin + fontSize) {
          page = pdfDoc.addPage([8.5 * 72, 11 * 72]);
          yPosition = page.getSize().height - margin;
        }

        const segments = parseHTMLText(paragraph);
        let xPosition = margin;
        let currentLine = '';
        let currentSegments: TextSegment[] = [];

        for (const segment of segments) {
          const words = segment.text.split(' ');
          
          for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const font = segment.isBold && segment.isItalic ? boldItalicFont :
                        segment.isBold ? boldFont :
                        segment.isItalic ? italicFont :
                        regularFont;
            const textWidth = font.widthOfTextAtSize(testLine, fontSize);
            
            if (textWidth > page.getSize().width - 2 * margin) {
              // Draw current line with proper formatting for each segment
              let segmentX = margin;
              for (const seg of currentSegments) {
                const segFont = seg.isBold && seg.isItalic ? boldItalicFont :
                              seg.isBold ? boldFont :
                              seg.isItalic ? italicFont :
                              regularFont;
                page.drawText(seg.text, {
                  x: segmentX,
                  y: yPosition,
                  size: fontSize,
                  font: segFont
                });
                segmentX += segFont.widthOfTextAtSize(seg.text + ' ', fontSize);
              }
              
              yPosition -= lineHeight;
              if (yPosition < margin) {
                page = pdfDoc.addPage([8.5 * 72, 11 * 72]);
                yPosition = page.getSize().height - margin;
              }
              
              currentLine = word;
              currentSegments = [{ ...segment, text: word }];
              xPosition = margin + font.widthOfTextAtSize(word + ' ', fontSize);
            } else {
              currentLine = testLine;
              if (currentSegments.length > 0 && 
                  currentSegments[currentSegments.length - 1].isBold === segment.isBold && 
                  currentSegments[currentSegments.length - 1].isItalic === segment.isItalic) {
                currentSegments[currentSegments.length - 1].text += (currentSegments[currentSegments.length - 1].text ? ' ' : '') + word;
              } else {
                currentSegments.push({ ...segment, text: word });
              }
            }
          }
        }
        
        // Draw the last line
        if (currentLine) {
          let segmentX = margin;
          for (const seg of currentSegments) {
            const segFont = seg.isBold && seg.isItalic ? boldItalicFont :
                          seg.isBold ? boldFont :
                          seg.isItalic ? italicFont :
                          regularFont;
            page.drawText(seg.text, {
              x: segmentX,
              y: yPosition,
              size: fontSize,
              font: segFont
            });
            segmentX += segFont.widthOfTextAtSize(seg.text + ' ', fontSize);
          }
          yPosition -= paragraphSpacing;
        }
      }
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function generateDOCX(content: string): Promise<Buffer> {
  // Don't sanitize the full content up front
  const parts = content.split(/(<h1>.*?<\/h1>)/).filter(Boolean);
  
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: 12240,
            height: 15840,
          },
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: parts.map(part => {
        if (part.startsWith('<h1>')) {
          // Only sanitize the heading text content
          const headingText = part.replace(/<\/?h1>/g, '').trim();
          return new Paragraph({
            children: [
              new TextRun({
                text: headingText,
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
            heading: 'Heading1',
            spacing: {
              after: 480,
              line: 360,
              lineRule: 'exact',
            },
          });
        } else {
          const paragraphs = part
            .split('</p>')
            .map(p => p.replace(/<p>/g, '').trim())
            .filter(Boolean);

          return paragraphs.map(text => {
            const segments = parseHTMLText(text);
            return new Paragraph({
              children: segments.map(segment => new TextRun({
                text: segment.text,
                size: 22,
                font: 'Times New Roman',
                bold: segment.isBold,
                italics: segment.isItalic,
              })),
              spacing: {
                after: 360,
                line: 360,
                lineRule: 'exact',
              },
            });
          });
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
            size: 22,
            font: {
              name: 'Times New Roman',
            },
            bold: true,
          },
          paragraph: {
            spacing: {
              after: 480,
              line: 360,
              lineRule: 'exact',
            },
          },
        },
      ],
    },
  });

  return await Packer.toBuffer(doc);
} 