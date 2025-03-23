'use client';

import { useEffect } from 'react';

interface EquipmentAnalysisTriggerProps {
  projectId: string;
}

/**
 * A invisible component that triggers equipment analysis when mounted
 */
export default function EquipmentAnalysisTrigger({ projectId }: EquipmentAnalysisTriggerProps) {
  useEffect(() => {
    const triggerAnalysis = async () => {
      try {
        const response = await fetch('/api/equipment/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectId }),
        });
        
        console.log('Equipment analysis triggered:', response.status);
      } catch (error) {
        console.error('Error triggering equipment analysis:', error);
      }
    };
    
    // Only run once when component mounts
    triggerAnalysis();
  }, [projectId]);
  
  // This component doesn't render anything
  return null;
} 