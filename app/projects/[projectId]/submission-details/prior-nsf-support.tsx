"use client";

import { useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function PriorNSFSupportSection() {
  const [showPriorSupport, setShowPriorSupport] = useState(false);

  const togglePriorSupport = () => {
    setShowPriorSupport(!showPriorSupport);
  };

  return (
    <Card className="overflow-hidden">
      <div 
        className="flex items-center justify-between p-6 cursor-pointer"
        onClick={togglePriorSupport}
      >
        <h2 className="text-xl font-semibold">Results from Prior NSF Support (5-page limit)</h2>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => {
          e.stopPropagation();
          togglePriorSupport();
        }}>
          {showPriorSupport ? 
            <ChevronDown className="h-5 w-5" /> : 
            <ChevronRight className="h-5 w-5" />
          }
        </Button>
      </div>
      
      {showPriorSupport && (
        <div className="border-t p-6">
          <p className="text-xs text-muted-foreground mb-3">
            If applicable, as part of the Project Description, results from prior NSF support must be provided for any PI or co-PI identified on the proposal who has received:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>An award with an end date in the past five years, or</li>
            <li>Any current funding, including any no-cost extensions</li>
            <li>Results must be described under <strong>two separate, distinct headings:</strong> Intellectual Merit and Broader Impacts</li>
            <li>Results are limited to <strong>five pages</strong> of the Project Description</li>
          </ul>
          <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded mt-3">
            <strong>Note:</strong> This section is included as part of the 15-page limit for the Project Description.
          </p>
        </div>
      )}
    </Card>
  );
} 