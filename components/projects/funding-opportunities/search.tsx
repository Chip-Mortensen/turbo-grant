'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Calendar, 
  Building, 
  AlertCircle, 
  Loader2, 
  X, 
  ArrowRight
} from 'lucide-react';
import { debounce } from 'lodash';
import { Database } from '@/types/supabase';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { cn } from '@/lib/utils';
import { OrganizationType, organizationTypeLabels, initOrgEligibilityFilters } from '@/types/enum-types';

type FOA = Database['public']['Tables']['foas']['Row'] & {
  score?: number;
};

interface FundingOpportunitiesSearchProps {
  projectId: string;
}

export function FundingOpportunitiesSearch({ projectId }: FundingOpportunitiesSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Results state
  const [foas, setFoas] = useState<FOA[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  
  // Filter state
  const [agency, setAgency] = useState<string | null>(null);
  const [awardRange, setAwardRange] = useState<[number, number]>([0, 5000000]);
  const [animalTrials, setAnimalTrials] = useState<boolean | null>(null);
  const [humanTrials, setHumanTrials] = useState<boolean | null>(null);
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [filterByRecommendedGrants, setFilterByRecommendedGrants] = useState<boolean>(true);
  
  // Organization eligibility filters
  const [orgEligibilityFilters, setOrgEligibilityFilters] = useState<Record<OrganizationType, boolean | null>>(initOrgEligibilityFilters());
  
  // Helper function to update organization eligibility filters
  const updateOrgFilter = (type: OrganizationType, value: boolean | null) => {
    setOrgEligibilityFilters(prev => ({
      ...prev,
      [type]: value
    }));
  };
  
  // Pagination state
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  
  // Format currency for display
  const formatCurrency = (value: number | null | undefined) => {
    if (value === undefined || value === null) return 'Not specified';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Truncate description
  const truncateDescription = (text: string | null | undefined, maxLength: number = 150) => {
    if (!text) return 'No description available';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };
  
  // Navigate to FOA details page
  const navigateToFoaDetails = (foaId: string) => {
    router.push(`/projects/${projectId}/funding-opportunities/${foaId}`);
  };
  
  // Search function
  const searchFoas = useCallback(async () => {
    setIsSearching(true);
    setSearchError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (searchTerm) {
        params.append('q', searchTerm);
      }
      
      // Add pagination parameters
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      
      if (agency) {
        params.append('agency', agency);
      }
      
      if (awardRange[0] > 0) {
        params.append('minAward', awardRange[0].toString());
      }
      
      if (awardRange[1] < 5000000) {
        params.append('maxAward', awardRange[1].toString());
      }
      
      if (animalTrials !== null) {
        params.append('animalTrials', animalTrials.toString());
      }
      
      if (humanTrials !== null) {
        params.append('humanTrials', humanTrials.toString());
      }
      
      if (deadlineDate !== null) {
        params.append('deadlineDate', deadlineDate.toISOString());
      }
      
      // Add recommended grants filter
      if (filterByRecommendedGrants) {
        params.append('recommendedGrants', 'true');
      }
      
      // Organization eligibility params - add all non-null filters
      const activeOrgFilters = Object.entries(orgEligibilityFilters)
        .filter(([_, value]) => value !== null)
        .reduce((acc, [type, value]) => ({ ...acc, [type]: value }), {});
      
      if (Object.keys(activeOrgFilters).length > 0) {
        params.append('organization_eligibility', JSON.stringify(activeOrgFilters));
      }
      
      params.append('projectId', projectId);
      
      // Make API request
      const response = await fetch(`/api/funding-opportunities/search?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Search failed');
      }
      
      setFoas(data.foas || []);
      setTotalResults(data.total || 0);
    } catch (err) {
      console.error('Error searching FOAs:', err);
      setSearchError(err instanceof Error ? err.message : 'Failed to search funding opportunities');
    } finally {
      setIsSearching(false);
    }
  }, [
    searchTerm, 
    agency, 
    awardRange, 
    animalTrials, 
    humanTrials,
    deadlineDate,
    filterByRecommendedGrants,
    orgEligibilityFilters,
    projectId,
    offset,
    limit
  ]);
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(() => {
      searchFoas();
    }, 500),
    [searchFoas]
  );
  
  // Effect to handle search term changes
  useEffect(() => {
    debouncedSearch();
    return () => {
      debouncedSearch.cancel();
    };
  }, [
    searchTerm, 
    agency, 
    awardRange, 
    animalTrials, 
    humanTrials,
    deadlineDate,
    filterByRecommendedGrants,
    orgEligibilityFilters,
    offset,
    limit,
    debouncedSearch
  ]);
  
  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [
    searchTerm, 
    agency, 
    awardRange, 
    animalTrials, 
    humanTrials,
    deadlineDate,
    filterByRecommendedGrants,
    orgEligibilityFilters
  ]);
  
  // Initial search on component mount
  useEffect(() => {
    searchFoas();
  }, []);
  
  // Reset all filters
  const resetFilters = () => {
    setAgency(null);
    setAwardRange([0, 5000000]);
    setAnimalTrials(null);
    setHumanTrials(null);
    setDeadlineDate(null);
    setFilterByRecommendedGrants(true);
    
    // Reset all organization eligibility filters
    setOrgEligibilityFilters(initOrgEligibilityFilters());
  };
  
  // Count active filters
  const activeFilterCount = [
    agency !== null,
    awardRange[0] > 0 || awardRange[1] < 5000000,
    animalTrials !== null,
    humanTrials !== null,
    deadlineDate !== null,
    filterByRecommendedGrants,
    ...Object.values(orgEligibilityFilters).map(value => value !== null)
  ].filter(Boolean).length;
  
  return (
    <div className="flex flex-col space-y-4">
      {/* Search bar */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Describe your research goals and requirements in detail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Additional filter indicators/pills below the search bar */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          
          {agency && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              Agency: {agency}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setAgency(null)}
              />
            </Badge>
          )}
          
          {(awardRange[0] > 0 || awardRange[1] < 5000000) && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              Award: {formatCurrency(awardRange[0])} - {formatCurrency(awardRange[1])}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setAwardRange([0, 5000000])}
              />
            </Badge>
          )}
          
          {animalTrials === true && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              Animal Trials
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setAnimalTrials(null)}
              />
            </Badge>
          )}
          
          {humanTrials === true && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              Human Trials
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setHumanTrials(null)}
              />
            </Badge>
          )}
          
          {deadlineDate !== null && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              Due by: {formatDate(deadlineDate.toISOString())}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setDeadlineDate(null)}
              />
            </Badge>
          )}
          
          {filterByRecommendedGrants && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs bg-blue-50">
              Recommended Grants Only
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setFilterByRecommendedGrants(false)}
              />
            </Badge>
          )}
          
          {Object.entries(orgEligibilityFilters)
            .filter(([_, value]) => value !== null)
            .map(([type, value]) => (
              <Badge key={type} variant="outline" className="flex items-center gap-1 text-xs">
                {organizationTypeLabels[type as OrganizationType]}: {value ? 'Yes' : 'No'}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => updateOrgFilter(type as OrganizationType, null)}
                />
              </Badge>
            ))
          }
        </div>
      )}
      
      {/* Error message */}
      {searchError && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-2 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span>Search error: {searchError}</span>
        </div>
      )}
      
      {/* Main content area with filters and results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters sidebar - always visible */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Filters</CardTitle>
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 gap-1">
                  <X className="h-3 w-3" />
                  Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Agency filter */}
                <div className="space-y-2">
                  <Label>Agency</Label>
                  <Select value={agency || 'all'} onValueChange={(value: string) => setAgency(value === 'all' ? null : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All agencies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All agencies</SelectItem>
                      <SelectItem value="NIH">NIH</SelectItem>
                      <SelectItem value="NSF">NSF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Deadline filter */}
                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative w-full">
                      <DatePicker
                        selected={deadlineDate}
                        onChange={(date: Date | null) => setDeadlineDate(date)}
                        placeholderText="Select deadline..."
                        dateFormat="MMM d, yyyy"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        wrapperClassName="w-full"
                        isClearable
                        customInput={
                          <Input
                            className={deadlineDate ? "pr-8" : "pr-10"}
                          />
                        }
                      />
                      {!deadlineDate && (
                        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Award amount filter */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Award Amount</Label>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(awardRange[0])} - {formatCurrency(awardRange[1])}
                    </span>
                  </div>
                  <Slider
                    defaultValue={[0, 5000000]}
                    value={awardRange}
                    min={0}
                    max={5000000}
                    step={100000}
                    onValueChange={(value: number[]) => setAwardRange(value as [number, number])}
                  />
                </div>
                
                {/* Trial type filters */}
                <div className="space-y-3">
                  <Label>Trial Types</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="animalTrials" 
                      checked={animalTrials === true ? true : false}
                      onCheckedChange={(checked) => {
                        if (checked === 'indeterminate') return;
                        setAnimalTrials(checked ? true : null);
                      }}
                    />
                    <Label htmlFor="animalTrials" className="text-sm font-normal">
                      Animal Trials
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="humanTrials" 
                      checked={humanTrials === true ? true : false}
                      onCheckedChange={(checked) => {
                        if (checked === 'indeterminate') return;
                        setHumanTrials(checked ? true : null);
                      }}
                    />
                    <Label htmlFor="humanTrials" className="text-sm font-normal">
                      Human Trials
                    </Label>
                  </div>
                </div>
                
                {/* Organization eligibility filters */}
                <div className="space-y-3">
                  <Label>
                    Eligibility
                  </Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 border rounded-md p-2 scrollbar-hide">
                    {Object.entries(organizationTypeLabels).map(([type, label]) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`org_${type}`} 
                          checked={orgEligibilityFilters[type as OrganizationType] === true ? true : false}
                          onCheckedChange={(checked) => {
                            if (checked === 'indeterminate') return;
                            updateOrgFilter(type as OrganizationType, checked ? true : null);
                          }}
                        />
                        <Label htmlFor={`org_${type}`} className="text-sm font-normal">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Recommended Grants Filter */}
                <div className="space-y-3">
                  <Label>Recommended Grants</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="recommendedGrants" 
                      checked={filterByRecommendedGrants}
                      onCheckedChange={(checked) => {
                        if (checked === 'indeterminate') return;
                        setFilterByRecommendedGrants(checked ? true : false);
                      }}
                    />
                    <Label htmlFor="recommendedGrants" className="text-sm font-normal flex items-center">
                      Show only recommended grants
                      {filterByRecommendedGrants && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                          Active
                        </span>
                      )}
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Results count */}
          <div className="text-sm text-muted-foreground mt-4">
            {isSearching ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Searching...
              </div>
            ) : (
              <span>Found {totalResults} funding opportunities</span>
            )}
          </div>
        </div>
        
        {/* Results list - full width */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              {isSearching ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : foas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No funding opportunities found
                </div>
              ) : (
                <div className="divide-y">
                  {foas.map((foa) => (
                    <div
                      key={foa.id}
                      className="p-4 hover:bg-muted transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            {searchTerm && foa.score !== undefined && (
                              <div className="flex flex-col items-center justify-center min-w-[60px]">
                                <div className={cn(
                                  "w-12 h-12 rounded-md flex items-center justify-center text-lg font-semibold",
                                  foa.score >= 80 ? "bg-primary text-primary-foreground" :
                                  foa.score >= 60 ? "bg-secondary text-secondary-foreground" :
                                  "bg-muted text-muted-foreground"
                                )}>
                                  {Math.round(foa.score)}
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-1">relevance</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-lg">{foa.title}</div>
                              
                              {/* Submission date */}
                              <div className="text-sm text-muted-foreground mt-2 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Due: {formatDate(foa.deadline)}
                              </div>
                              
                              {/* Truncated description */}
                              <div className="text-sm mt-2 text-muted-foreground">
                                {truncateDescription(foa.description)}
                              </div>
                              
                              {/* Agency and award amount */}
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {foa.agency}
                                </Badge>
                                
                                {/* Grant Types */}
                                {foa.grant_type && typeof foa.grant_type === 'object' && 
                                  Object.entries(foa.grant_type)
                                    .filter(([_, value]) => value === true)
                                    .map(([type]) => (
                                      <Badge key={type} variant="secondary" className="text-xs">
                                        {type}
                                      </Badge>
                                    ))
                                }
                                
                                {(foa.award_floor !== null || foa.award_ceiling !== null) && (
                                  <Badge variant="secondary" className="text-xs">
                                    Award: {formatCurrency(foa.award_floor ?? 0)} {foa.award_ceiling !== null ? `- ${formatCurrency(foa.award_ceiling)}` : ''}
                                  </Badge>
                                )}
                                {foa.animal_trials && (
                                  <Badge variant="secondary" className="text-xs">
                                    Animal Trials
                                  </Badge>
                                )}
                                {foa.human_trials && (
                                  <Badge variant="secondary" className="text-xs">
                                    Human Trials
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="ml-4 whitespace-nowrap"
                          onClick={() => navigateToFoaDetails(foa.id)}
                        >
                          View Details
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Pagination */}
          {!isSearching && foas.length > 0 && (
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Showing {offset + 1}-{Math.min(offset + foas.length, totalResults)} of {totalResults} results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + foas.length >= totalResults}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 