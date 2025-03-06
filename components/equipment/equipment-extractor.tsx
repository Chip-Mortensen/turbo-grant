'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Wrench } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface EquipmentExtractorProps {
  projectId: string;
}

interface Equipment {
  name: string;
  specifications?: string;
  relevance_score: number;
  relevance_details?: string;
}

export default function EquipmentExtractor({ projectId }: EquipmentExtractorProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load equipment on component mount
  useEffect(() => {
    if (projectId) {
      loadEquipment();
    }
  }, [projectId]);

  // Load equipment from database
  const loadEquipment = async () => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('recommended_equipment')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error) {
        console.error('Error loading equipment:', error);
        setError('Unable to load equipment for this project.');
        setIsLoading(false);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log('No equipment found for this project');
        setIsLoading(true);
        return;
      }
      
      const equipmentRecord = data[0];
      
      let equipmentArray: Equipment[] = [];
      
      try {
        if (equipmentRecord.equipment) {
          if (Array.isArray(equipmentRecord.equipment)) {
            equipmentArray = equipmentRecord.equipment;
          } 
          else if (typeof equipmentRecord.equipment === 'string') {
            const parsed = JSON.parse(equipmentRecord.equipment);
            
            if (Array.isArray(parsed)) {
              equipmentArray = parsed;
            } else if (parsed.equipment && Array.isArray(parsed.equipment)) {
              equipmentArray = parsed.equipment;
            }
          }
          else if (typeof equipmentRecord.equipment === 'object' && 
                  equipmentRecord.equipment.equipment && 
                  Array.isArray(equipmentRecord.equipment.equipment)) {
            equipmentArray = equipmentRecord.equipment.equipment;
          }
        }
        
        if (equipmentArray.length > 0) {
          equipmentArray.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }
      } catch (parseError) {
        console.error('Error parsing equipment data:', parseError);
        setError('Error processing equipment data.');
      }
      
      setEquipment(equipmentArray);
      
      if (equipmentArray.length > 0 && !equipmentRecord.viewed) {
        await markAsViewed();
      }
    } catch (err) {
      console.error('Error loading equipment:', err);
      setError('An unexpected error occurred while loading equipment.');
      setIsLoading(false);
    }
  };
  
  const markAsViewed = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('recommended_equipment')
        .update({ viewed: true })
        .eq('project_id', projectId);
        
      if (error) {
        console.error('Error marking equipment as viewed:', error);
      }
    } catch (err) {
      console.error('Error updating viewed status:', err);
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isLoading && equipment !== undefined) {
      intervalId = setInterval(() => {
        loadEquipment();
      }, 5000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isLoading, projectId]);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
          <div className="text-center">
            <h3 className="text-lg font-medium">Generating Recommended Equipment</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Please wait while we analyze your funding opportunity and generate equipment recommendations...
            </p>
          </div>
        </div>
      ) : equipment.length > 0 ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Wrench className="h-5 w-5 text-purple-500" />
              Relevant Equipment
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {equipment.length} piece{equipment.length !== 1 ? 's' : ''} of equipment relevant to your funding opportunity
            </p>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            {equipment.map((item, index) => (
              <Card 
                key={index} 
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={markAsViewed}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                </CardHeader>
                {item.relevance_details && (
                  <CardContent>
                    <p className="text-sm">{item.relevance_details}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
} 