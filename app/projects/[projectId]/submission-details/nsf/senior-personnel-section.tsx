"use client";

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
        <h2 className="text-xl font-semibold">Senior Personnel Documents</h2>
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
        <div className="border-t p-6">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Biographical Sketch</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Required for all senior personnel (PI, co-PIs, Faculty, and other senior associates)</li>
                <li>Limited to 3 pages per individual</li>
                <li>Must be prepared using an NSF-approved format (SciENcv or the NSF fillable PDF)</li>
                <li>Include the following sections:
                  <ul className="list-disc pl-5 mt-1">
                    <li>Professional Preparation (education, in chronological order)</li>
                    <li>Appointments (in reverse chronological order)</li>
                    <li>Products (up to 5 most closely related and up to 5 other significant products)</li>
                    <li>Synergistic Activities (up to 5 examples)</li>
                  </ul>
                </li>
                <li>Do NOT include personal information, such as marital status, citizenship, or date of birth</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Current and Pending Support</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Required for all senior personnel</li>
                <li>Must be prepared using an NSF-approved format (SciENcv or the NSF fillable PDF)</li>
                <li>Include all current project support and all pending applications (regardless of funding source)</li>
                <li>For each project, provide the following information:
                  <ul className="list-disc pl-5 mt-1">
                    <li>Project/Proposal Title</li>
                    <li>Source of Support (agency, program)</li>
                    <li>Total Award Amount</li>
                    <li>Total Award Period (start and end dates)</li>
                    <li>Person-Months per year committed to the project</li>
                    <li>Proposal/Award Status (Current or Pending)</li>
                    <li>Summary of objectives (no more than 2-3 sentences)</li>
                  </ul>
                </li>
                <li>Remember to include this NSF proposal and in-kind contributions as "Pending"</li>
                <li>All domestic and foreign support must be reported</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
} 