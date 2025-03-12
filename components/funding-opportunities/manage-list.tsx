'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FileText, Calendar, Building, AlertCircle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FundingOpportunity } from '@/lib/extractors/funding-opportunity-extractor';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { nsfProposalTypeLabels, NsfProposalType } from "@/types/enum-types";

interface ManageListProps {
  projectId: string;
}

// Extend the FundingOpportunity type to include id
interface FoaWithId extends FundingOpportunity {
  id: string;
  pinecone_ids?: string[];
  vectorization_status?: string;
}

export default function ManageList({ projectId }: ManageListProps) {
  const [foas, setFoas] = useState<FoaWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFoa, setSelectedFoa] = useState<FoaWithId | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFoa, setDeletingFoa] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchFoas = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('foas')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setFoas(data || []);
        
        // Auto-select the first FOA if available
        if (data && data.length > 0) {
          setSelectedFoa(data[0]);
        }
      } catch (err) {
        console.error('Error fetching FOAs:', err);
        setError('Failed to load funding opportunities');
      } finally {
        setLoading(false);
      }
    };

    fetchFoas();
  }, []);

  const filteredFoas = foas.filter(foa => {
    const searchLower = searchTerm.toLowerCase();
    return (
      foa.title?.toLowerCase().includes(searchLower) ||
      foa.agency?.toLowerCase().includes(searchLower) ||
      foa.foa_code?.toLowerCase().includes(searchLower) ||
      (foa.grant_type && typeof foa.grant_type === 'object' && 
        Object.keys(foa.grant_type).some(type => type.toLowerCase().includes(searchLower)))
    );
  });

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Not specified';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'Not specified';
    
    // Try to parse the date string
    try {
      const date = new Date(dateString);
      // Check if the date is valid
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      // If parsing fails, return the original string
      return dateString;
    }
  };

  const handleFoaClick = (foa: FundingOpportunity) => {
    setSelectedFoa(foa as FoaWithId);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedFoa) return;
    
    setDeletingFoa(true);
    setError(null);
    setDeleteSuccess(null);
    
    try {
      const response = await fetch(`/api/funding-opportunities/${selectedFoa.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete funding opportunity');
      }
      
      // Remove the deleted FOA from the state
      setFoas(prevFoas => prevFoas.filter(foa => foa.id !== selectedFoa.id));
      
      // Set success message
      setDeleteSuccess(`Successfully deleted "${selectedFoa.title}"`);
      
      // Clear selected FOA if it was deleted
      setSelectedFoa(null);
      
      // Close the dialog
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error('Error deleting FOA:', err);
      setError(`Failed to delete funding opportunity: ${(err as Error).message}`);
    } finally {
      setDeletingFoa(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search funding opportunities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {deleteSuccess && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{deleteSuccess}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-1 gap-4 overflow-hidden border rounded-md">
        <div className="w-2/5 overflow-y-auto border-r h-full">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredFoas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No matching funding opportunities found' : 'No funding opportunities available'}
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {filteredFoas.map((foa) => (
                <div
                  key={foa.id}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    selectedFoa?.id === foa.id
                      ? 'bg-primary/10 border-l-4 border-primary'
                      : 'hover:bg-gray-100 border-l-4 border-transparent'
                  }`}
                  onClick={() => handleFoaClick(foa)}
                >
                  <div className="font-medium truncate">{foa.title}</div>
                  <div className="flex items-center text-sm text-gray-500 mt-1 space-x-3">
                    <span className="flex items-center">
                      <Building className="h-3 w-3 mr-1" />
                      {foa.agency}
                    </span>
                    <span className="flex items-center">
                      <FileText className="h-3 w-3 mr-1" />
                      {foa.foa_code}
                    </span>
                    {foa.deadline && (
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(foa.deadline)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-3/5 overflow-y-auto p-4 h-full">
          {selectedFoa ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-lg">{selectedFoa.title}</h3>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDeleteClick}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 p-1 rounded">
                      <Building className="h-4 w-4 text-blue-600" />
                    </span>
                    <span className="font-medium">Agency</span>
                  </div>
                  <p className="text-sm ml-7">{selectedFoa.agency}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 p-1 rounded">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </span>
                    <span className="font-medium">FOA Code</span>
                  </div>
                  <p className="text-sm ml-7">{selectedFoa.foa_code}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 p-1 rounded">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </span>
                    <span className="font-medium">Deadline</span>
                  </div>
                  <p className="text-sm ml-7">{formatDate(selectedFoa.deadline)}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 p-1 rounded">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </span>
                    <span className="font-medium">Grant Type</span>
                  </div>
                  <div className="text-sm ml-7">
                    {selectedFoa.grant_type && typeof selectedFoa.grant_type === 'object' && Object.keys(selectedFoa.grant_type).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(selectedFoa.grant_type).map(type => (
                          <span key={type} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                            {selectedFoa.agency === 'NSF' && nsfProposalTypeLabels[type.toLowerCase() as NsfProposalType] ? 
                              nsfProposalTypeLabels[type.toLowerCase() as NsfProposalType] : 
                              type}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">Not specified</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Description</h4>
                  <p className="text-sm">{selectedFoa.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Published Date</h4>
                    <p className="text-sm">
                      {formatDate(selectedFoa.published_date)}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Expected Awards</h4>
                    <p className="text-sm">{selectedFoa.num_awards || 'Not specified'}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Award Ceiling</h4>
                    <p className="text-sm">{formatCurrency(selectedFoa.award_ceiling)}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Award Floor</h4>
                    <p className="text-sm">{formatCurrency(selectedFoa.award_floor)}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Eligibility</h4>
                  <div className="text-sm bg-slate-50 p-3 rounded border overflow-auto max-h-60">
                    {selectedFoa.organization_eligibility ? (
                      <div className="space-y-1">
                        {Object.entries(selectedFoa.organization_eligibility).map(([key, value]) => (
                          <div key={key} className="flex items-center">
                            <span className={`w-4 h-4 mr-2 rounded-full ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} flex items-center justify-center text-xs`}>
                              {value ? '✓' : '✗'}
                            </span>
                            <span>{key}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No eligibility data available</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Grant URL</h4>
                  <p className="text-sm break-all">
                    <a href={selectedFoa.grant_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {selectedFoa.grant_url}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
              <FileText className="h-12 w-12 mb-4 opacity-20" />
              <p>Select a funding opportunity to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Funding Opportunity</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this funding opportunity? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedFoa?.pinecone_ids && selectedFoa.pinecone_ids.length > 0 && (
            <div className="mt-2 text-amber-600">
              This will also delete {selectedFoa.pinecone_ids.length} associated vectors from Pinecone.
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletingFoa}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletingFoa}
            >
              {deletingFoa ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 