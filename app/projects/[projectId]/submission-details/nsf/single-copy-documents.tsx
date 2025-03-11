"use client";

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function SingleCopyDocumentsSection() {
  const [showSingleCopy, setShowSingleCopy] = useState(false);

  const toggleSingleCopy = () => {
    setShowSingleCopy(!showSingleCopy);
  };

  return (
    <Card className="overflow-hidden">
      <div 
        className="flex items-center justify-between p-6 cursor-pointer"
        onClick={toggleSingleCopy}
      >
        <h2 className="text-xl font-semibold">Single Copy Documents</h2>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => {
          e.stopPropagation();
          toggleSingleCopy();
        }}>
          {showSingleCopy ? 
            <ChevronDown className="h-5 w-5" /> : 
            <ChevronRight className="h-5 w-5" />
          }
        </Button>
      </div>
      
      {showSingleCopy && (
        <div className="border-t p-6">
          <p className="mb-3 text-muted-foreground">These documents are confidential and only accessible to NSF staff and reviewers with appropriate access:</p>
          
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Collaborators and Other Affiliations (COA):</strong> Required for all senior project personnel using the provided template</li>
            <li><strong>List of Suggested Reviewers (Optional):</strong> Include names, affiliations, and email addresses</li>
            <li><strong>List of Reviewers Not to Include (Optional):</strong> Names of persons who should not review the proposal with justification</li>
            <li><strong>Proprietary or Privileged Information (Optional):</strong> Any confidential information that should be withheld from public disclosure</li>
            <li><strong>Proposal Certifications:</strong> Automatically provided in Research.gov when proposal is submitted</li>
          </ul>
        </div>
      )}
    </Card>
  );
} 