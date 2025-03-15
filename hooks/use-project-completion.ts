'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useProjectCompletion(projectId: string) {
  // Add loading states for each metric
  const [loadingStates, setLoadingStates] = useState({
    description: true,
    figures: true,
    chalkTalk: true,
    foa: true,
    attachments: true,
    equipment: true,
    sources: true,
    applicationFactors: true
  });

  const [completionStatus, setCompletionStatus] = useState({
    description: false,
    figures: false,
    chalkTalk: false,
    foa: false,
    attachments: false,
    equipment: false,
    sources: false,
    applicationFactors: false
  });

  // Track if we've seen FOA selected
  const [foaSelected, setFoaSelected] = useState(false);
  
  // Track if we've checked for equipment and sources
  const [checkedEquipment, setCheckedEquipment] = useState(false);
  const [checkedSources, setCheckedSources] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let equipmentSubscription: RealtimeChannel;
    let sourcesSubscription: RealtimeChannel;
    let projectSubscription: RealtimeChannel;

    const fetchStatus = async () => {
      // Fetch all statuses in parallel
      const [descriptionRes, figuresRes, chalkTalkRes, projectRes, equipmentRes, sourcesRes] = await Promise.all([
        supabase.from('research_descriptions').select('id').eq('project_id', projectId).limit(1),
        supabase.from('scientific_figures').select('id').eq('project_id', projectId).limit(1),
        supabase.from('chalk_talks').select('id').eq('project_id', projectId).limit(1),
        supabase.from('research_projects').select('foa, attachments, application_factors').eq('id', projectId).single(),
        supabase.from('recommended_equipment').select('id').eq('project_id', projectId).limit(1),
        supabase.from('project_sources').select('id').eq('project_id', projectId).limit(1)
      ]);

      // Check if all attachments are completed
      const attachmentsComplete = projectRes.data?.attachments
        ? Object.values(projectRes.data.attachments).every((doc: any) => doc.completed === true)
        : false;

      // Check if application factors are completed
      const applicationFactorsComplete = projectRes.data?.application_factors
        ? projectRes.data.application_factors.completed === true
        : false;

      // Check if equipment and sources exist
      const hasEquipment = Boolean(equipmentRes.data && equipmentRes.data.length > 0);
      const hasSources = Boolean(sourcesRes.data && sourcesRes.data.length > 0);
      
      // Check if FOA is selected
      const hasFoa = Boolean(projectRes.data?.foa);
      
      // Update FOA selected state
      if (hasFoa) {
        setFoaSelected(true);
      }
      
      // Update checked states
      if (hasEquipment) {
        setCheckedEquipment(true);
      }
      
      if (hasSources) {
        setCheckedSources(true);
      }

      // Update completion status
      setCompletionStatus({
        description: Boolean(descriptionRes.data && descriptionRes.data.length > 0),
        figures: Boolean(figuresRes.data && figuresRes.data.length > 0),
        chalkTalk: Boolean(chalkTalkRes.data && chalkTalkRes.data.length > 0),
        foa: hasFoa,
        attachments: attachmentsComplete,
        equipment: hasEquipment,
        sources: hasSources,
        applicationFactors: applicationFactorsComplete
      });

      // Update loading states
      setLoadingStates({
        description: false,
        figures: false,
        chalkTalk: false,
        foa: false,
        attachments: hasFoa && !attachmentsComplete,
        // Show loading spinner for equipment if FOA is selected and we don't have equipment yet
        equipment: hasFoa && !hasEquipment,
        // Show loading spinner for sources if FOA is selected and we don't have sources yet
        sources: hasFoa && !hasSources,
        applicationFactors: false
      });
    };

    // Set up real-time subscriptions
    const setupSubscriptions = () => {
      // Subscribe to equipment table
      equipmentSubscription = supabase
        .channel('equipment-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'recommended_equipment',
            filter: `project_id=eq.${projectId}`
          }, 
          (payload) => {
            console.log('Equipment change detected:', payload);
            fetchStatus();
          }
        )
        .subscribe();

      // Subscribe to sources table
      sourcesSubscription = supabase
        .channel('sources-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'project_sources',
            filter: `project_id=eq.${projectId}`
          }, 
          (payload) => {
            console.log('Sources change detected:', payload);
            fetchStatus();
          }
        )
        .subscribe();
        
      // Subscribe to research_projects table for attachments changes
      projectSubscription = supabase
        .channel('project-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'research_projects',
            filter: `id=eq.${projectId}`
          }, 
          (payload) => {
            console.log('Project change detected:', payload);
            fetchStatus();
          }
        )
        .subscribe();
    };

    fetchStatus();
    setupSubscriptions();

    // Cleanup subscriptions on unmount
    return () => {
      if (equipmentSubscription) {
        supabase.removeChannel(equipmentSubscription);
      }
      if (sourcesSubscription) {
        supabase.removeChannel(sourcesSubscription);
      }
      if (projectSubscription) {
        supabase.removeChannel(projectSubscription);
      }
    };
  }, [projectId]);

  return { completionStatus, loadingStates };
} 