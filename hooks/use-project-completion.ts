'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useProjectCompletion(projectId: string) {
  // Add loading states for each metric
  const [loadingStates, setLoadingStates] = useState({
    description: false,
    figures: false,
    chalkTalk: false,
    foa: false,
    attachments: false,
    equipment: false,
    sources: false,
    applicationFactors: false,
    applicationRequirements: false
  });

  const [completionStatus, setCompletionStatus] = useState({
    description: false,
    figures: false,
    chalkTalk: false,
    foa: false,
    attachments: false,
    equipment: false,
    sources: false,
    applicationFactors: false,
    applicationRequirements: false
  });

  // Add vectorization status state
  const [vectorizationStatus, setVectorizationStatus] = useState({
    description: false,
    figures: false,
    chalkTalk: false
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
        supabase.from('research_descriptions').select('id, vectorization_status').eq('project_id', projectId).limit(1),
        supabase.from('scientific_figures').select('id, vectorization_status').eq('project_id', projectId).limit(1),
        supabase.from('chalk_talks').select('id, vectorization_status').eq('project_id', projectId).limit(1),
        supabase.from('research_projects').select('foa, attachments, application_factors, application_requirements').eq('id', projectId).single(),
        supabase.from('recommended_equipment').select('id').eq('project_id', projectId).limit(1),
        supabase.from('project_sources').select('id').eq('project_id', projectId).limit(1)
      ]);

      // Check vectorization status
      setVectorizationStatus({
        description: descriptionRes.data?.[0]?.vectorization_status === 'completed',
        figures: figuresRes.data?.[0]?.vectorization_status === 'completed',
        chalkTalk: chalkTalkRes.data?.[0]?.vectorization_status === 'completed'
      });

      // Check if all attachments are completed
      const attachmentsComplete = projectRes.data?.attachments
        ? Object.values(projectRes.data.attachments).every((doc: any) => doc.completed === true)
        : false;

      // Check if application factors are completed
      const applicationFactorsComplete = projectRes.data?.application_factors
        ? projectRes.data.application_factors.completed === true
        : false;

      // Check if application requirements are completed
      const applicationRequirementsComplete = projectRes.data?.application_requirements
        ? projectRes.data.application_requirements.completed === true
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
        applicationFactors: applicationFactorsComplete,
        applicationRequirements: applicationRequirementsComplete
      });

      // Update loading states
      setLoadingStates({
        description: false,
        figures: false,
        chalkTalk: false,
        foa: false,
        // Only show loading for attachments if FOA is selected and attachments exist but aren't complete
        attachments: hasFoa && projectRes.data?.attachments && !attachmentsComplete,
        // Only show loading for equipment if FOA is selected and we don't have equipment yet
        equipment: hasFoa && !hasEquipment,
        // Only show loading for sources if FOA is selected and we don't have sources yet
        sources: hasFoa && !hasSources,
        applicationFactors: false,
        // Only show loading for application requirements if it exists but is not complete
        applicationRequirements: hasFoa && projectRes.data?.application_requirements && 
          !applicationRequirementsComplete && Object.keys(projectRes.data.application_requirements).length > 0
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

      // Subscribe to research_descriptions table for vectorization status
      supabase
        .channel('description-vectorization-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'research_descriptions',
            filter: `project_id=eq.${projectId}`
          }, 
          (payload) => {
            console.log('Description vectorization change detected:', payload);
            fetchStatus();
          }
        )
        .subscribe();

      // Subscribe to scientific_figures table for vectorization status
      supabase
        .channel('figures-vectorization-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'scientific_figures',
            filter: `project_id=eq.${projectId}`
          }, 
          (payload) => {
            console.log('Figures vectorization change detected:', payload);
            fetchStatus();
          }
        )
        .subscribe();

      // Subscribe to chalk_talks table for vectorization status
      supabase
        .channel('chalk-talk-vectorization-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'chalk_talks',
            filter: `project_id=eq.${projectId}`
          }, 
          (payload) => {
            console.log('Chalk talk vectorization change detected:', payload);
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
      supabase.removeChannel(supabase.channel('description-vectorization-changes'));
      supabase.removeChannel(supabase.channel('figures-vectorization-changes'));
      supabase.removeChannel(supabase.channel('chalk-talk-vectorization-changes'));
    };
  }, [projectId]);

  return { completionStatus, loadingStates, vectorizationStatus };
} 