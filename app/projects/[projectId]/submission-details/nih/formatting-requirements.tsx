"use client";

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NIHFormattingRequirementsSection() {
  const [showFormatting, setShowFormatting] = useState(false);

  const toggleFormatting = () => {
    setShowFormatting(!showFormatting);
  };

  return (
    <Card className="overflow-hidden">
      <div 
        className="flex items-center justify-between p-6 cursor-pointer"
        onClick={toggleFormatting}
      >
        <h2 className="text-xl font-semibold">NIH Formatting Requirements</h2>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => {
          e.stopPropagation();
          toggleFormatting();
        }}>
          {showFormatting ? 
            <ChevronDown className="h-5 w-5" /> : 
            <ChevronRight className="h-5 w-5" />
          }
        </Button>
      </div>
      
      {showFormatting && (
        <div className="border-t p-6">
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Document Formatting Requirements</h3>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Character Set</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>eRA systems support Unicode (including Greek and special characters).</li>
                    <li>Use preview features in ASSIST and verify in eRA Commons.</li>
                    <li>Contact eRA Service Desk for concerns.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Citations</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>No required citation format.</li>
                    <li>"Et al." usage is acceptable.</li>
                    <li>SciENcv uses National Library of Medicine format (Citing Medicine).</li>
                    <li>Include PMC reference number (PMCID) for NIH-funded research.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Combining Information into a Single Attachment</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Ensure all information is directly visible in the PDF.</li>
                    <li>Do not use "bundling" or "portfolio" features.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Electronic Signatures</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Electronic signatures within PDF attachments are not allowed.</li>
                    <li>Documents requiring signatures must be flattened after signing.</li>
                    <li>Printed, signed, scanned PDFs are acceptable.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Filenames</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Maximum 50 characters (including spaces).</li>
                    <li>Use unique filenames.</li>
                    <li>Allowed characters: A-Z, a-z, 0-9, underscore (_), hyphen (-), space, period (.), parentheses (), curly braces {}, square brackets [], tilde (~), exclamation point (!), comma (,), apostrophe ('), at sign (@), number sign (#), dollar sign ($), percent sign (%), plus sign (+), and equal sign (=).</li>
                    <li>No ampersands (&).</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">File Size</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Files must be greater than 0 bytes.</li>
                    <li>Maximum file size: 100 MB.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Flattened PDFs</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>All layers must be merged.</li>
                    <li>Print to PDF method recommended.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Font, Type Density, Line Spacing</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Font size: 11 points or larger.</li>
                    <li>Type density: No more than 15 characters per inch.</li>
                    <li>Line spacing: No more than six lines per inch.</li>
                    <li>Text color: No restrictions; black or high-contrast recommended.</li>
                    <li>Recommended fonts: Arial, Georgia, Helvetica, Palatino Linotype.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Format Pages</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Required format pages must be used where applicable.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Headers and Footers</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Do not include headers or footers.</li>
                    <li>Use headings within text for readability.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Hypertext, Hyperlinks, and URLs</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Allowed only if explicitly permitted.</li>
                    <li>Do not use hyperlinks for essential application information.</li>
                    <li>Use full URL text, not hidden hypertext.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Figures (Images, Graphics, Charts, Graphs, Tables)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Must be readable at 100% scale on 8.5" x 11" paper.</li>
                    <li>Counted towards page limits.</li>
                    <li>Use image compression (JPEG or PNG) to reduce file size.</li>
                    <li>Include accessibility elements like alt text.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Language and Style</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Use English.</li>
                    <li>Avoid jargon.</li>
                    <li>Define acronyms on first use.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Marking Up Attachments</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Do not use comments, sticky notes, or other markup.</li>
                    <li>No bracketing, indenting, bolding, italicizing, underlining, or font changes to indicate resubmission changes.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Orientation</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Portrait preferred; landscape may be difficult to read.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Page Limits and Line Limits</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Follow Table of Page Limits or funding opportunity specifications.</li>
                    <li>No circumvention of page limits via appendices.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Paper Size and Margins</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Standard letter size (8.5" x 11").</li>
                    <li>Minimum 0.5-inch margins on all sides.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Scanning</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Avoid scanning text documents.</li>
                    <li>Scanning is acceptable for signed letters or letterhead documents.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Security Features</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Disable encryption and password protection.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Single vs. Multi-Column Page Format</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Single-column format preferred.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Video Submissions</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Videos not embedded in applications.</li>
                    <li>Allowed as post-submission material in specific cases (see NOT-OD-24-067).</li>
                    <li>Intent to submit video must be indicated in cover letter.</li>
                    <li>Include key images and descriptions within Research Strategy section.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t">
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Online Form Text Field Rules</h3>
              <div className="space-y-5 bg-slate-50 p-4 rounded-lg">
                <div>
                  <h4 className="font-medium mb-1">Allowable Characters</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Unicode with UTF-8 encoding (including Greek and other special characters) is supported.</li>
                    <li><strong>Avoid problematic characters:</strong>
                      <ul className="list-disc pl-5 mt-1">
                        <li>"Smart quotes" or "curly quotes" - use straight single and double quotes instead.</li>
                        <li>"Em-dash" (long dash) - use short dash instead.</li>
                      </ul>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Cutting and Pasting</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Cutting and pasting from Word or other text editors is generally acceptable.</li>
                    <li>Watch for proprietary fonts or special characters that may convert (like automatic smart quotes).</li>
                    <li>Most formatting (font, bolding, bullets, subscript, superscript) will be lost.</li>
                    <li>Use preview features in submission systems to check your data entry.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Field Lengths</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Character limits are explicitly indicated for each text field.</li>
                    <li>Spaces and punctuation count toward the character limit.</li>
                    <li>Special characters (like Greek letters) may use more than one character against your limit.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Formatting</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Text fields have character limits rather than page limits.</li>
                    <li>No font or margin requirements for text fields.</li>
                    <li>Only plain text with limited manual formatting is supported.</li>
                    <li>Format paragraphs by including a blank line between them.</li>
                    <li>For bulleted lists:
                      <ul className="list-disc pl-5 mt-1">
                        <li>Start each item on a new line with a hyphen (-) or asterisk (*)</li>
                        <li>Add a blank line after the list to start a new paragraph</li>
                      </ul>
                    </li>
                    <li>For numbered lists:
                      <ul className="list-disc pl-5 mt-1">
                        <li>Use sequential numbers (1, 2) or letters (a, b) as list item characters</li>
                        <li>Lists can be nested for hierarchical structure</li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
} 