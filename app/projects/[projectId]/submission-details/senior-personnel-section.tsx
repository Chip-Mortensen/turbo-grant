"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function SeniorPersonnelSection() {
  const [showSeniorPersonnel, setShowSeniorPersonnel] = useState(false);

  const toggleSeniorPersonnel = () => {
    setShowSeniorPersonnel(!showSeniorPersonnel);
  };

  return (
    <Card className="overflow-hidden">
      <div 
        className="flex items-center justify-between p-6 cursor-pointer"
        onClick={toggleSeniorPersonnel}
      >
        <h2 className="text-xl font-semibold">Senior / Key Personnel Requirements</h2>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => {
          e.stopPropagation();
          toggleSeniorPersonnel();
        }}>
          {showSeniorPersonnel ? 
            <ChevronDown className="h-5 w-5" /> : 
            <ChevronRight className="h-5 w-5" />
          }
        </Button>
      </div>
      
      {showSeniorPersonnel && (
        <div className="border-t">
          {/* SciENcv Requirements */}
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium mb-3">SciENcv Requirements</h3>
            <p className="mb-2">NSF requires both Biographical Sketches and Current and Pending Support documents to be prepared and submitted using SciENcv.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>A Biographical Sketch (limited to three pages) must be provided for each individual designated as senior personnel</li>
              <li>Current and Pending Support information must be provided for all senior personnel through SciENcv</li>
              <li>SciENcv will produce NSF-compliant PDF versions of both documents</li>
              <li>These documents must be prepared, saved, certified, and submitted as part of your proposal</li>
            </ul>
            <Button asChild size="sm" className="mt-3">
              <Link href="https://www.ncbi.nlm.nih.gov/sciencv/" target="_blank" rel="noopener noreferrer">
                Access SciENcv <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          {/* Synergistic Activities */}
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium mb-3">Synergistic Activities (1 Page Limit)</h3>
            <p className="mb-2">Each senior/key person must provide a list of up to five (5) synergistic activities.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide up to five distinct examples that demonstrate the broader impact of your professional and scholarly activities</li>
              <li>Focus on the creation, integration, and transfer of knowledge</li>
            </ul>
          </div>
          
          {/* Collaborators and Other Affiliations */}
          <div className="p-6">
            <h3 className="text-lg font-medium mb-3">Collaborators and Other Affiliations (COA)</h3>
            <p className="mb-2">The Collaborators and Other Affiliations information must be separately provided for each individual identified as senior personnel on the project.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>For Research.gov submissions:</strong> Submit as an Excel (.xlsx) file using the NSF template</li>
              <li><strong>For Grants.gov submissions:</strong> 
                <ul className="list-disc pl-5 mt-1">
                  <li>PD/PI must submit as a PDF file</li>
                  <li>For additional Senior/Key persons, you must submit their COA information as .xlsx files in Research.gov after submitting to Grants.gov</li>
                </ul>
              </li>
            </ul>
            <Button asChild size="sm" className="mt-3">
              <Link href="https://nsf.gov/bfa/dias/policy/coa.jsp" target="_blank" rel="noopener noreferrer">
                NSF COA Template Page <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
} 