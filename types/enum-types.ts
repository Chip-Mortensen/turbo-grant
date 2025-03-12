import { Database } from '@/types/supabase';

// Get organization types from Supabase types
export type OrganizationType = Database['public']['Enums']['organization_type'];

// Get NSF proposal types from Supabase types
export type NsfProposalType = Database['public']['Enums']['nsf_proposal_types'];

// Define NIH grant types
// Note: This is defined manually since it's not in the Supabase schema yet
export type NihGrantType = 
  | 'C06' | 'D43' | 'D71' | 'DP1' | 'DP2' | 'DP3' | 'DP4' | 'DP5' | 'DP7'
  | 'E11' | 'F05' | 'F30' | 'F31' | 'F32' | 'F33' | 'F37' | 'F38' | 'F99'
  | 'FI2' | 'FM1' | 'G07' | 'G08' | 'G11' | 'G12' | 'G13' | 'G20' | 'G94'
  | 'H13' | 'H23' | 'H25' | 'H28' | 'H50' | 'H57' | 'H62' | 'H64' | 'H75'
  | 'H79' | 'HD4' | 'I01' | 'I80' | 'IK3' | 'K00' | 'K01' | 'K02' | 'K05'
  | 'K06' | 'K07' | 'K08' | 'K12' | 'K14' | 'K18' | 'K21' | 'K22' | 'K23'
  | 'K24' | 'K25' | 'K26' | 'K30' | 'K38' | 'K43' | 'K76' | 'K99' | 'KD1'
  | 'KL1' | 'KL2' | 'KM1' | 'L30' | 'L32' | 'L40' | 'L50' | 'L60' | 'L70'
  | 'M01' | 'OT2' | 'P01' | 'P20' | 'P2C' | 'P30' | 'P40' | 'P41' | 'P42'
  | 'P50' | 'P51' | 'P60' | 'PL1' | 'PM1' | 'PN1' | 'PN2' | 'R00' | 'R01'
  | 'R03' | 'R13' | 'R15' | 'R16' | 'R18' | 'R21' | 'R24' | 'R25' | 'R28'
  | 'R2F' | 'R30' | 'R33' | 'R34' | 'R35' | 'R36' | 'R37' | 'R38' | 'R41'
  | 'R42' | 'R43' | 'R44' | 'R49' | 'R50' | 'R55' | 'R56' | 'R61' | 'R90'
  | 'RC1' | 'RC2' | 'RC3' | 'RC4' | 'RF1' | 'RL1' | 'RL2' | 'RL5' | 'RL9'
  | 'RM1' | 'RS1' | 'S06' | 'S07' | 'S10' | 'S11' | 'S15' | 'S21' | 'S22'
  | 'SB1' | 'SC1' | 'SC2' | 'SC3' | 'SI2' | 'T01' | 'T02' | 'T09' | 'T14'
  | 'T15' | 'T32' | 'T34' | 'T35' | 'T37' | 'T42' | 'T90' | 'TL1' | 'TL4'
  | 'TU2' | 'U01' | 'U09' | 'U10' | 'U11' | 'U13' | 'U17' | 'U18' | 'U19'
  | 'U1A' | 'U1B' | 'U1Q' | 'U1V' | 'U21' | 'U22' | 'U23' | 'U24' | 'U27'
  | 'U2C' | 'U2F' | 'U2G' | 'U2R' | 'U30' | 'U32' | 'U34' | 'U36' | 'U38'
  | 'U3R' | 'U41' | 'U42' | 'U43' | 'U44' | 'U45' | 'U47' | 'U48' | 'U49'
  | 'U50' | 'U51' | 'U52' | 'U53' | 'U54' | 'U55' | 'U56' | 'U57' | 'U58'
  | 'U59' | 'U60' | 'U61' | 'U62' | 'U65' | 'U66' | 'U75' | 'U79' | 'U81'
  | 'U82' | 'U83' | 'U84' | 'U86' | 'U87' | 'U90' | 'UA1' | 'UA5' | 'UB1'
  | 'UC1' | 'UC2' | 'UC3' | 'UC4' | 'UC6' | 'UC7' | 'UD1' | 'UE1' | 'UE2'
  | 'UE5' | 'UF1' | 'UF2' | 'UG1' | 'UG3' | 'UG4' | 'UH1' | 'UH2' | 'UH3'
  | 'UH4' | 'UL1' | 'UM1' | 'UM2' | 'UP5' | 'UR6' | 'UR8' | 'US3' | 'US4'
  | 'UT1' | 'UT2' | 'VF1' | 'X01' | 'X02' | 'X98' | 'X99';

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

// Helper function to get all NIH grant types
export const getNihGrantTypes = (): NihGrantType[] => {
  return [
    'C06', 'D43', 'D71', 'DP1', 'DP2', 'DP3', 'DP4', 'DP5', 'DP7',
    'E11', 'F05', 'F30', 'F31', 'F32', 'F33', 'F37', 'F38', 'F99',
    'FI2', 'FM1', 'G07', 'G08', 'G11', 'G12', 'G13', 'G20', 'G94',
    'H13', 'H23', 'H25', 'H28', 'H50', 'H57', 'H62', 'H64', 'H75',
    'H79', 'HD4', 'I01', 'I80', 'IK3', 'K00', 'K01', 'K02', 'K05',
    'K06', 'K07', 'K08', 'K12', 'K14', 'K18', 'K21', 'K22', 'K23',
    'K24', 'K25', 'K26', 'K30', 'K38', 'K43', 'K76', 'K99', 'KD1',
    'KL1', 'KL2', 'KM1', 'L30', 'L32', 'L40', 'L50', 'L60', 'L70',
    'M01', 'OT2', 'P01', 'P20', 'P2C', 'P30', 'P40', 'P41', 'P42',
    'P50', 'P51', 'P60', 'PL1', 'PM1', 'PN1', 'PN2', 'R00', 'R01',
    'R03', 'R13', 'R15', 'R16', 'R18', 'R21', 'R24', 'R25', 'R28',
    'R2F', 'R30', 'R33', 'R34', 'R35', 'R36', 'R37', 'R38', 'R41',
    'R42', 'R43', 'R44', 'R49', 'R50', 'R55', 'R56', 'R61', 'R90',
    'RC1', 'RC2', 'RC3', 'RC4', 'RF1', 'RL1', 'RL2', 'RL5', 'RL9',
    'RM1', 'RS1', 'S06', 'S07', 'S10', 'S11', 'S15', 'S21', 'S22',
    'SB1', 'SC1', 'SC2', 'SC3', 'SI2', 'T01', 'T02', 'T09', 'T14',
    'T15', 'T32', 'T34', 'T35', 'T37', 'T42', 'T90', 'TL1', 'TL4',
    'TU2', 'U01', 'U09', 'U10', 'U11', 'U13', 'U17', 'U18', 'U19',
    'U1A', 'U1B', 'U1Q', 'U1V', 'U21', 'U22', 'U23', 'U24', 'U27',
    'U2C', 'U2F', 'U2G', 'U2R', 'U30', 'U32', 'U34', 'U36', 'U38',
    'U3R', 'U41', 'U42', 'U43', 'U44', 'U45', 'U47', 'U48', 'U49',
    'U50', 'U51', 'U52', 'U53', 'U54', 'U55', 'U56', 'U57', 'U58',
    'U59', 'U60', 'U61', 'U62', 'U65', 'U66', 'U75', 'U79', 'U81',
    'U82', 'U83', 'U84', 'U86', 'U87', 'U90', 'UA1', 'UA5', 'UB1',
    'UC1', 'UC2', 'UC3', 'UC4', 'UC6', 'UC7', 'UD1', 'UE1', 'UE2',
    'UE5', 'UF1', 'UF2', 'UG1', 'UG3', 'UG4', 'UH1', 'UH2', 'UH3',
    'UH4', 'UL1', 'UM1', 'UM2', 'UP5', 'UR6', 'UR8', 'US3', 'US4',
    'UT1', 'UT2', 'VF1', 'X01', 'X02', 'X98', 'X99'
  ] as NihGrantType[];
};

// Helper function to initialize organization eligibility filters with all types set to null
export const initOrgEligibilityFilters = (): Record<OrganizationType, boolean | null> => {
  const filters: Record<OrganizationType, boolean | null> = {} as Record<OrganizationType, boolean | null>;
  getOrganizationTypes().forEach(type => {
    filters[type] = null;
  });
  return filters;
}; 