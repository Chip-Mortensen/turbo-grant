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
        .limit(1)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') { // Record not found
          console.log('No equipment found for this project');
          setIsLoading(false);
          return;
        }
        console.error('Error loading equipment:', error);
        setError('Unable to load equipment for this project.');
        setIsLoading(false);
        return;
      }
      
      // Parse the equipment data
      let equipmentArray: Equipment[] = [];
      
      try {
        if (data.equipment) {
          // If it's already an array, use it directly
          if (Array.isArray(data.equipment)) {
            equipmentArray = data.equipment;
          } 
          // If it's a string (JSON stringified), parse it
          else if (typeof data.equipment === 'string') {
            const parsed = JSON.parse(data.equipment);
            
            // The parsed result might be an array directly or have an equipment property
            if (Array.isArray(parsed)) {
              equipmentArray = parsed;
            } else if (parsed.equipment && Array.isArray(parsed.equipment)) {
              equipmentArray = parsed.equipment;
            }
          }
          // If it's an object with an equipment property
          else if (typeof data.equipment === 'object' && 
                  data.equipment.equipment && 
                  Array.isArray(data.equipment.equipment)) {
            equipmentArray = data.equipment.equipment;
          }
        }
        
        // Sort the equipment by relevance score
        if (equipmentArray.length > 0) {
          equipmentArray.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
        }
      } catch (parseError) {
        console.error('Error parsing equipment data:', parseError);
        setError('Error processing equipment data.');
      }
      
      // Set the equipment data
      setEquipment(equipmentArray);
    } catch (err) {
      console.error('Error loading equipment:', err);
      setError('An unexpected error occurred while loading equipment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span>Loading equipment data...</span>
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
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  {item.specifications && (
                    <CardDescription>{item.specifications}</CardDescription>
                  )}
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
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <Wrench className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <h3 className="text-lg font-medium">No Equipment Found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No equipment is currently associated with this funding opportunity.
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 