'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useProjectCompletion(projectId: string) {
  const [completionStatus, setCompletionStatus] = useState({
    description: false,
    figures: false,
    chalkTalk: false,
    foa: false,
    attachments: false,
    equipment: false,
    sources: false
  });

  useEffect(() => {
    const fetchStatus = async () => {
      const supabase = createClient();
      
      // Fetch all statuses in parallel
      const [descriptionRes, figuresRes, chalkTalkRes, projectRes, equipmentRes, sourcesRes] = await Promise.all([
        supabase.from('research_descriptions').select('id').eq('project_id', projectId).limit(1),
        supabase.from('scientific_figures').select('id').eq('project_id', projectId).limit(1),
        supabase.from('chalk_talks').select('id').eq('project_id', projectId).limit(1),
        supabase.from('research_projects').select('foa, attachments').eq('id', projectId).single(),
        supabase.from('recommended_equipment').select('viewed').eq('project_id', projectId).limit(1),
        supabase.from('project_sources').select('id').eq('project_id', projectId).limit(1)
      ]);

      // Check if all attachments are completed
      const attachmentsComplete = projectRes.data?.attachments
        ? Object.values(projectRes.data.attachments).every((doc: any) => doc.completed === true)
        : false;

      setCompletionStatus({
        description: Boolean(descriptionRes.data && descriptionRes.data.length > 0),
        figures: Boolean(figuresRes.data && figuresRes.data.length > 0),
        chalkTalk: Boolean(chalkTalkRes.data && chalkTalkRes.data.length > 0),
        foa: Boolean(projectRes.data?.foa),
        attachments: attachmentsComplete,
        equipment: Boolean(equipmentRes.data && equipmentRes.data.length > 0 && equipmentRes.data[0].viewed),
        sources: Boolean(sourcesRes.data && sourcesRes.data.length > 0)
      });
    };

    fetchStatus();
  }, [projectId]);

  return completionStatus;
} 