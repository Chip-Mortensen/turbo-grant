"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useMemo, useEffect, useCallback } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, Loader2, AlertCircle, Plus, ArrowLeft } from "lucide-react";
import { debounce } from "lodash";
import { OrganizationForm } from "@/components/organizations/organization-form";

type Organization = {
  id: string;
  name: string;
  organization_type: string;
  uei: string;
};

type OrganizationSelectorProps = {
  organizations: Organization[];
  userId: string;
};

const ITEMS_PER_PAGE = 5;
const SEARCH_DEBOUNCE_MS = 300;

export function OrganizationSelector({ organizations: initialOrganizations, userId }: OrganizationSelectorProps) {
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations);
  const [isSearching, setIsSearching] = useState(false);
  const [totalCount, setTotalCount] = useState(initialOrganizations.length);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const router = useRouter();

  // Server-side search for organizations
  const searchOrganizations = useCallback(async (query: string) => {
    if (query.length < 2) {
      setOrganizations(initialOrganizations);
      setTotalCount(initialOrganizations.length);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    
    try {
      const response = await fetch(`/api/organizations/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Search failed');
      }
      
      setOrganizations(data.organizations || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('Error searching organizations:', err);
      setSearchError(err instanceof Error ? err.message : 'Failed to search organizations');
      
      // Fall back to client-side filtering on error
      const filtered = initialOrganizations.filter(
        (org) => org.name.toLowerCase().includes(query.toLowerCase())
      );
      setOrganizations(filtered);
      setTotalCount(filtered.length);
    } finally {
      setIsSearching(false);
    }
  }, [initialOrganizations]);

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce(searchOrganizations, SEARCH_DEBOUNCE_MS),
    [searchOrganizations]
  );

  // Effect to handle search query changes
  useEffect(() => {
    setCurrentPage(1);
    setSearchError(null);
    
    if (searchQuery.trim() === '') {
      setOrganizations(initialOrganizations);
      setTotalCount(initialOrganizations.length);
      return;
    }
    
    debouncedSearch(searchQuery);
    
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch, initialOrganizations]);

  // Calculate pagination
  const totalPages = Math.ceil(organizations.length / ITEMS_PER_PAGE);
  const paginatedOrganizations = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return organizations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [organizations, currentPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) {
      setError("Please select an organization");
      return;
    }

    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('users')
        .update({ institution_id: selectedOrg })
        .eq('id', userId);
      
      if (error) {
        setError(error.message);
        return;
      }
      
      router.push("/dashboard");
      router.refresh();
    });
  };

  // If showing the create form, render that instead of the selector
  if (showCreateForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => setShowCreateForm(false)}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to organization selection
          </Button>
        </div>
        
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Organization</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Fill out the form below to create a new organization.
          </p>
          <OrganizationForm userId={userId} />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          {isSearching ? (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <Input
          type="search"
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {searchError && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-2 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span>Search error: {searchError}. Showing local results instead.</span>
        </div>
      )}
      
      <div className="max-h-[400px] overflow-y-auto pr-1">
        <RadioGroup
          value={selectedOrg}
          onValueChange={setSelectedOrg}
          className="space-y-3"
        >
          {isSearching ? (
            <div className="text-center py-8 text-muted-foreground">
              Searching organizations...
            </div>
          ) : paginatedOrganizations.length > 0 ? (
            paginatedOrganizations.map((org) => (
              <div
                key={org.id}
                className="flex items-start space-x-3 border p-3 rounded-md hover:bg-slate-50 cursor-pointer"
                onClick={() => setSelectedOrg(org.id)}
              >
                <RadioGroupItem value={org.id} id={org.id} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={org.id} className="font-medium block">
                    {org.name}
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    <p>Type: {org.organization_type || "Not specified"}</p>
                    <p>UEI: {org.uei}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {initialOrganizations.length === 0 
                ? "No organizations found. Please create a new organization."
                : "No organizations match your search. Try a different search term or create a new organization."}
            </div>
          )}
        </RadioGroup>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min(organizations.length, 1 + (currentPage - 1) * ITEMS_PER_PAGE)}-
            {Math.min(organizations.length, currentPage * ITEMS_PER_PAGE)} of {totalCount}
          </div>
          <div className="flex space-x-2">
            <Button 
              type="button"
              variant="outline" 
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              type="button"
              variant="outline" 
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="mb-4 text-sm text-muted-foreground">
          Don't see your organization?
        </p>
        <Button 
          type="button" 
          variant="default" 
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 mx-auto"
        >
          <Plus className="h-4 w-4" />
          Create New Organization
        </Button>
      </div>

      {error && (
        <div className="text-sm font-medium text-red-500">{error}</div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isPending || !selectedOrg}
      >
        {isPending ? "Saving..." : "Continue to Dashboard"}
      </Button>
    </form>
  );
} 