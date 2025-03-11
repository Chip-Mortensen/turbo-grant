"use client";

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
        <h2 className="text-xl font-semibold">Prior NSF Support</h2>
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
          <p className="mb-3 text-muted-foreground">For all PIs/co-PIs who have received prior NSF funding in the past 5 years:</p>
          
          <ul className="list-disc pl-5 space-y-2">
            <li>This section must be included even if the current proposal is not related to previous support</li>
            <li>Limited to 5 pages, regardless of the number of PIs/co-PIs with prior support</li>
            <li>Must include the NSF award number, title, and period of support for each grant</li>
            <li>For each award, provide a summary of the results of completed work in terms of (a) intellectual merit and (b) broader impacts</li>
            <li>Must include a list of publications resulting from each NSF award</li>
            <li>Detail any evidence of research products and their availability</li>
            <li>If the proposal is for renewed support, describe the relationship to the current proposal</li>
          </ul>
        </div>
      )}
    </Card>
  );
} 