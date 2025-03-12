import { Database } from '@/types/supabase';

// Get organization types from Supabase types
export type OrganizationType = Database['public']['Enums']['organization_type'];

// Get NSF proposal types from Supabase types
export type NsfProposalType = Database['public']['Enums']['nsf_proposal_types'];

// Map organization types to display labels
export const organizationTypeLabels: Record<OrganizationType, string> = {
  "city_township_government": "City/Township Government",
  "county_government": "County Government",
  "for_profit": "For-Profit",
  "independent_school_district": "Independent School District",
  "individual": "Individual",
  "native_american_tribal_government": "Native American Tribal Government",
  "native_american_tribal_organization": "Native American Tribal Organization",
  "non_profit": "Non-Profit",
  "others": "Others",
  "private_higher_education_institution": "Private Higher Education",
  "public_higher_education_institution": "Public Higher Education",
  "public_housing_authorities": "Public Housing Authorities",
  "small_business": "Small Business",
  "special_district_governments": "Special District Governments",
  "state_governments": "State Governments",
  "unrestricted": "Unrestricted"
};

// Map NSF proposal types to display labels (capitalize first letter)
export const nsfProposalTypeLabels: Record<NsfProposalType, string> = {
  "research": "Research",
  "planning": "Planning",
  "rapid": "RAPID",
  "eager": "EAGER",
  "raise": "RAISE",
  "goali": "GOALI",
  "ideas_lab": "Ideas Lab",
  "fased": "FASED",
  "conference": "Conference",
  "equipment": "Equipment",
  "travel": "Travel",
  "center": "Center",
  "research_infrastructure": "Research Infrastructure",
  "clb": "CLB",
  "roa_pui": "ROA-PUI"
};

// Helper function to get all organization types
export const getOrganizationTypes = (): OrganizationType[] => {
  return Object.keys(organizationTypeLabels) as OrganizationType[];
};

// Helper function to get all NSF proposal types
export const getNsfProposalTypes = (): NsfProposalType[] => {
  return Object.keys(nsfProposalTypeLabels) as NsfProposalType[];
};

// Helper function to initialize organization eligibility filters with all types set to null
export const initOrgEligibilityFilters = (): Record<OrganizationType, boolean | null> => {
  const filters: Record<OrganizationType, boolean | null> = {} as Record<OrganizationType, boolean | null>;
  getOrganizationTypes().forEach(type => {
    filters[type] = null;
  });
  return filters;
}; 