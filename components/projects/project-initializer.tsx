'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface ProjectInitializerProps {
  projectId: string;
  hasFoa: boolean;
}

export function ProjectInitializer({ projectId, hasFoa }: ProjectInitializerProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [initStatus, setInitStatus] = useState<{
    equipment: 'pending' | 'running' | 'complete' | 'error';
    sources: 'pending' | 'running' | 'complete' | 'error';
    attachments: 'pending' | 'running' | 'complete' | 'error';
  }>({
    equipment: 'pending',
    sources: 'pending',
    attachments: 'pending'
  });

  // Check if initialization is needed when component mounts
  useEffect(() => {
    if (hasFoa) {
      checkAndInitialize();
    }
  }, [hasFoa, projectId]);

  const checkAndInitialize = async () => {
    if (isInitializing) return;
    
    setIsInitializing(true);
    const supabase = createClient();
    let needsInit = false;
    
    try {
      // Check for equipment recommendations
      const { data: equipment, error: equipmentError } = await supabase
        .from('recommended_equipment')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);
      
      if (equipmentError) {
        console.error('Error checking equipment:', equipmentError);
      }
      
      const needsEquipment = !equipment || equipment.length === 0;
      setInitStatus(prev => ({...prev, equipment: needsEquipment ? 'pending' : 'complete'}));
      if (needsEquipment) needsInit = true;
      
      // Check for sources
      const { data: sources, error: sourcesError } = await supabase
        .from('project_sources')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);
      
      if (sourcesError) {
        console.error('Error checking sources:', sourcesError);
      }
      
      const needsSources = !sources || sources.length === 0;
      setInitStatus(prev => ({...prev, sources: needsSources ? 'pending' : 'complete'}));
      if (needsSources) needsInit = true;
      
      // Check for document generation
      const { data: completedDocs, error: docsError } = await supabase
        .from('completed_documents')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);
        
      if (docsError) {
        console.error('Error checking completed documents:', docsError);
      }
      
      const needsAttachments = !completedDocs || completedDocs.length === 0;
      setInitStatus(prev => ({...prev, attachments: needsAttachments ? 'pending' : 'complete'}));
      if (needsAttachments) needsInit = true;
      
      // If anything needs initialization, start the processes
      if (needsInit) {
        // Run necessary processes in parallel
        const promises = [];
        
        if (needsEquipment) {
          promises.push(runEquipmentAnalysis());
        }
        
        if (needsSources) {
          promises.push(runSourceGeneration());
        }
        
        if (needsAttachments) {
          promises.push(runAttachmentGeneration());
        }
        
        await Promise.allSettled(promises);
      }
    } catch (error) {
      console.error('Error during initialization check:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const runEquipmentAnalysis = async () => {
    try {
      setInitStatus(prev => ({...prev, equipment: 'running'}));
      
      const res = await fetch('/api/equipment/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      
      if (!res.ok) {
        throw new Error(`Equipment analysis failed: ${res.status}`);
      }
      
      setInitStatus(prev => ({...prev, equipment: 'complete'}));
    } catch (error) {
      console.error('Error analyzing equipment:', error);
      setInitStatus(prev => ({...prev, equipment: 'error'}));
    }
  };

  const runSourceGeneration = async () => {
    try {
      setInitStatus(prev => ({...prev, sources: 'running'}));
      
      const res = await fetch('/api/sources/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      
      if (!res.ok) {
        throw new Error(`Source generation failed: ${res.status}`);
      }
      
      setInitStatus(prev => ({...prev, sources: 'complete'}));
    } catch (error) {
      console.error('Error generating sources:', error);
      setInitStatus(prev => ({...prev, sources: 'error'}));
    }
  };

  const runAttachmentGeneration = async () => {
    try {
      setInitStatus(prev => ({...prev, attachments: 'running'}));
      
      const res = await fetch('/api/attachments/generate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      
      if (!res.ok) {
        throw new Error(`Attachment generation failed: ${res.status}`);
      }
      
      setInitStatus(prev => ({...prev, attachments: 'complete'}));
    } catch (error) {
      console.error('Error generating attachments:', error);
      setInitStatus(prev => ({...prev, attachments: 'error'}));
    }
  };

  // Always return null to hide UI, but the useEffect will still run
  return null;
} 