"use client";

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function FormattingRequirementsSection() {
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
        <h2 className="text-xl font-semibold">Formatting Requirements</h2>
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
          <ul className="list-disc pl-5 space-y-3">
            <li><strong>Page Numbering:</strong> Leave out page numbering unless otherwise directed within Research.gov.</li>
            
            <li>
              <strong>Font Requirements:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Arial, Courier New, or Palatino Linotype at a font size of 10 points or larger</li>
                <li>Times New Roman at a font size of 11 points or larger</li>
                <li>Computer Modern family of fonts at a font size of 11 points or larger</li>
                <li>
                  A font size of less than 10 points may be used for:
                  <ul className="list-disc pl-5 mt-1">
                    <li>Mathematical formulas or equations</li>
                    <li>Figures, tables, or diagram captions</li>
                    <li>When using a Symbol font to insert Greek letters or special characters</li>
                  </ul>
                </li>
                <li>Other fonts not specified above, such as Cambria Math, may be used for mathematical formulas, equations, or when inserting Greek letters or special characters</li>
                <li>Text must remain readable regardless of font choice</li>
              </ul>
            </li>
            
            <li><strong>Line Spacing:</strong> No more than six lines of text within a vertical space of one inch.</li>
            
            <li><strong>Margins:</strong> At least one inch in all directions. No proposer-supplied information may appear in the margins.</li>
            
            <li><strong>Paper Size:</strong> Must be no larger than standard letter paper size (8 ½ by 11").</li>
            
            <li><strong>Column Format:</strong> Proposers are strongly encouraged to use only a standard, single-column format for the text.</li>
          </ul>
        </div>
      )}
    </Card>
  );
} 