"use client";

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function SingleCopyDocumentsSection() {
  const [showDocuments, setShowDocuments] = useState(false);

  const toggleDocuments = () => {
    setShowDocuments(!showDocuments);
  };

  return (
    <Card className="overflow-hidden">
      <div 
        className="flex items-center justify-between p-6 cursor-pointer"
        onClick={toggleDocuments}
      >
        <h2 className="text-xl font-semibold">Single Copy Documents</h2>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => {
          e.stopPropagation();
          toggleDocuments();
        }}>
          {showDocuments ? 
            <ChevronDown className="h-5 w-5" /> : 
            <ChevronRight className="h-5 w-5" />
          }
        </Button>
      </div>
      
      {showDocuments && (
        <div className="border-t p-6">
          <p className="text-sm text-muted-foreground mb-4">
          If not applicable, these are not required for submission. The following single copy documents should be included in the cover page (Except SF-LLL which goes in SF-424). These documents are not shared with reviewers.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Authorization to Deviate from NSF Proposal Preparation Requirements (if applicable).</li>
            <li>List of Suggested Reviewers or Reviewers Not to Include (optional).</li>
            <li>Proprietary or Privileged Information (if applicable)</li>
            <li>Request for Reasonable Accommodation</li>
            <li>SF LLL, Disclosure of Lobbying Activities has been provided (if applicable).</li>
          </ul>
        </div>
      )}
    </Card>
  );
} 