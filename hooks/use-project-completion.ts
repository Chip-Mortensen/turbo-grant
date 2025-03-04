'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useProjectCompletion(projectId: string) {
  const [completionStatus, setCompletionStatus] = useState({
    description: false,
    figures: false,
    chalkTalk: false,
    foa: false,
    attachments: false
  });

  useEffect(() => {
    const fetchStatus = async () => {
      const supabase = createClient();
      
      // Fetch all statuses in parallel
      const [descriptionRes, figuresRes, chalkTalkRes, attachmentsRes, projectRes] = await Promise.all([
        supabase.from('research_descriptions').select('id').eq('project_id', projectId).limit(1),
        supabase.from('scientific_figures').select('id').eq('project_id', projectId).limit(1),
        supabase.from('chalk_talks').select('id').eq('project_id', projectId).limit(1),
        supabase.from('attachments').select('id').eq('project_id', projectId).limit(1),
        supabase.from('research_projects').select('foa').eq('id', projectId).single()
      ]);

      setCompletionStatus({
        description: Boolean(descriptionRes.data && descriptionRes.data.length > 0),
        figures: Boolean(figuresRes.data && figuresRes.data.length > 0),
        chalkTalk: Boolean(chalkTalkRes.data && chalkTalkRes.data.length > 0),
        attachments: Boolean(attachmentsRes.data && attachmentsRes.data.length > 0),
        foa: Boolean(projectRes.data?.foa)
      });
    };

    fetchStatus();
  }, [projectId]);

  return completionStatus;
} 