import { Database } from '@/types/supabase';

// Get organization types from Supabase types
export type OrganizationType = Database['public']['Enums']['organization_type'];

// Get NSF proposal types from Supabase types
export type NsfProposalType = Database['public']['Enums']['nsf_proposal_types'];

// Define NIH grant types
// Note: This is defined manually since it's not in the Supabase schema yet
export type NihGrantType = 
  | 'C06' | 'D43' | 'D71' | 'DP1' | 'DP2' | 'DP3' | 'DP4' | 'DP5' | 'DP7' | 'E11'
  | 'F05' | 'F30' | 'F31' | 'F32' | 'F33' | 'F37' | 'F38' | 'F99' | 'FI2' | 'FM1'
  | 'G07' | 'G08' | 'G11' | 'G12' | 'G13' | 'G20' | 'G94' | 'K00' | 'K01'
  | 'K02' | 'K05' | 'K06' | 'K07' | 'K08' | 'K12' | 'K14' | 'K18' | 'K21'
  | 'K22' | 'K23' | 'K24' | 'K25' | 'K26' | 'K30' | 'K32' | 'K38' | 'K43'
  | 'K76' | 'K99' | 'KD1' | 'KL1' | 'KL2' | 'KM1' | 'M01' | 'P01' | 'P20'
  | 'P2C' | 'P30' | 'P40' | 'P41' | 'P42' | 'P50' | 'P51' | 'P60' | 'PL1'
  | 'PM1' | 'R00' | 'R01' | 'R03' | 'R13' | 'R15' | 'R18' | 'R21' | 'R24'
  | 'R25' | 'R28' | 'R30' | 'R33' | 'R34' | 'R35' | 'R36' | 'R37' | 'R41'
  | 'R42' | 'R43' | 'R44' | 'R49' | 'R50' | 'R55' | 'R56' | 'R61' | 'R90'
  | 'RC1' | 'RC2' | 'RC3' | 'RC4' | 'RF1' | 'RL1' | 'RL2' | 'RL5' | 'RL9'
  | 'RM1' | 'RS1' | 'S06' | 'S07' | 'S10' | 'S11' | 'S15' | 'S21' | 'S22'
  | 'SB1' | 'SC1' | 'SC2' | 'SC3' | 'SI2' | 'T01' | 'T02' | 'T14' | 'T15' 
  | 'T32' | 'T34' | 'T35' | 'T37' | 'T42' | 'T90' | 'TL1' | 'TL4' | 'TU2'
  | 'U01' | 'U10' | 'U13' | 'U18' | 'U19' | 'U24' | 'U2C' | 'U2R' | 'U34' 
  | 'U41' | 'U42' | 'U43' | 'U44' | 'U45' | 'U54' | 'U56' | 'U60' | 'UA5' 
  | 'UB1' | 'UC1' | 'UC3' | 'UC4' | 'UC6' | 'UC7' | 'UE5' | 'UF1' | 'UG1' 
  | 'UG3' | 'UG4' | 'UH1' | 'UH2' | 'UH3' | 'UH4' | 'UL1' | 'UM1' | 'UM2' 
  | 'UP5' | 'UT1' | 'UT2' | 'X01' | 'X02';

// Define NIH grant types by category
export type NihResearchGrantType = 
  | 'C06' | 'DP1' | 'DP2' | 'DP3' | 'DP4' | 'DP5' | 'DP7' | 'G07' | 'G08'
  | 'G11' | 'G13' | 'G20' | 'R00' | 'R01' | 'R03' | 'R13' | 'R15' | 'R18'
  | 'R21' | 'R24' | 'R25' | 'R28' | 'R30' | 'R33' | 'R34' | 'R35' | 'R36'
  | 'R37' | 'R49' | 'R50' | 'R55' | 'R56' | 'R61' | 'R90' | 'RC1' | 'RC2'
  | 'RC3' | 'RC4' | 'RF1' | 'RL1' | 'RL2' | 'RL5' | 'RL9' | 'RM1' | 'RS1'
  | 'S07' | 'S10' | 'S11' | 'S15' | 'S21' | 'S22' | 'SC1' | 'SC2' | 'SC3'
  | 'SI2' | 'U01' | 'U13' | 'U18' | 'U24' | 'U34' | 'UA5' | 'UC1' | 'UC3'
  | 'UC4' | 'UC6' | 'UE5' | 'UF1' | 'UG1' | 'UG3' | 'UG4' | 'UH1' | 'UH2'
  | 'UH3' | 'UH4' | 'UM1' | 'UP5' | 'X01' | 'X02'

export type NihTrainingGrantType = 
  | 'D43' | 'D71' | 'K12' | 'KL2' | 'KM1' | 'T01' | 'T02' | 'T14' | 'T15'
  | 'T32' | 'T34' | 'T35' | 'T37' | 'T42' | 'T90' | 'TL1' | 'TL4' | 'TU2'
  | 'U2R';

export type NihFellowshipGrantType = 
  | 'F05' | 'F30' | 'F31' | 'F32' | 'F33' | 'F37' | 'F38' | 'F99' | 'FI2';

export type NihCareerDevelopmentGrantType = 
  | 'K00' | 'K01' | 'K02' | 'K05' | 'K06' | 'K07' | 'K08' | 'K14' | 'K18'
  | 'K21' | 'K22' | 'K23' | 'K24' | 'K25' | 'K26' | 'K30' | 'K32' | 'K43'
  | 'K76' | 'K99' | 'KL1';

export type NihMultiProjectGrantType = 
  | 'G12' | 'M01' | 'P01' | 'P20' | 'P2C' | 'P30' | 'P40' | 'P41' | 'P42'
  | 'P50' | 'P51' | 'P60' | 'PL1' | 'PM1' | 'S06' | 'U10' | 'U19' | 'U2C'
  | 'U41' | 'U42' | 'U45' | 'U54' | 'U56' | 'U60' | 'UC7' | 'UL1' | 'UM2';

export type NihSbirSttrGrantType = 
  | 'R41' | 'R42' | 'R43' | 'R44' | 'SB1' | 'U43' | 'U44' | 'UB1' | 'UT1'
  | 'UT2';

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

// NIH grant category labels
export const nihGrantCategoryLabels = {
  "research": "Research (R)",
  "training": "Training (T)",
  "fellowship": "Fellowship (F)",
  "career_development": "Career Development (K)",
  "multi_project": "Multi-Project (M)",
  "sbir_sttr": "SBIR/STTR (B)"
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
  // Combine all categories to ensure we have a complete list
  const allTypes = [
    ...getNihResearchGrantTypes(),
    ...getNihTrainingGrantTypes(),
    ...getNihFellowshipGrantTypes(),
    ...getNihCareerDevelopmentGrantTypes(),
    ...getNihMultiProjectGrantTypes(),
    ...getNihSbirSttrGrantTypes(),
    // Include any additional types that might not be in the categories
    'E11', 'FM1', 'G94', 'H13', 'H23', 'H25', 'H28', 'H50', 'H57', 
    'H62', 'H64', 'H75', 'H79', 'HD4', 'I01', 'I80', 'IK3', 'KD1',
    'L30', 'L32', 'L40', 'L50', 'L60', 'L70', 'OT2', 'PN1', 'PN2',
    'R16', 'R2F', 'R38', 'U09', 'U11', 'U17', 'U1A', 'U1B', 'U1Q', 
    'U1V', 'U21', 'U22', 'U23', 'U27', 'U2F', 'U2G', 'U30', 'U32', 
    'U36', 'U38', 'U3R', 'U47', 'U48', 'U49', 'U50', 'U51', 'U52', 
    'U53', 'U55', 'U57', 'U58', 'U59', 'U61', 'U62', 'U65', 'U66', 
    'U75', 'U79', 'U81', 'U82', 'U83', 'U84', 'U86', 'U87', 'U90', 
    'UA1', 'UC2', 'UD1', 'UE1', 'UE2', 'UF2', 'UR6', 'UR8', 'US3', 
    'US4', 'VF1', 'X98', 'X99'
  ];
  
  // Remove duplicates using filter
  return allTypes.filter((value, index, self) => 
    self.indexOf(value) === index
  ) as NihGrantType[];
};

// Helper functions to get NIH grant types by category
export const getNihResearchGrantTypes = (): NihResearchGrantType[] => {
  return [
    'C06', 'DP1', 'DP2', 'DP3', 'DP4', 'DP5', 'DP7', 'G07', 'G08',
    'G11', 'G13', 'G20', 'R00', 'R01', 'R03', 'R13', 'R15', 'R18',
    'R21', 'R24', 'R25', 'R28', 'R30', 'R33', 'R34', 'R35', 'R36',
    'R37', 'R49', 'R50', 'R55', 'R56', 'R61', 'R90', 'RC1', 'RC2',
    'RC3', 'RC4', 'RF1', 'RL1', 'RL2', 'RL5', 'RL9', 'RM1', 'RS1',
    'S07', 'S10', 'S11', 'S15', 'S21', 'S22', 'SC1', 'SC2', 'SC3',
    'SI2', 'U01', 'U13', 'U18', 'U24', 'U34', 'UA5', 'UC1', 'UC3',
    'UC4', 'UC6', 'UE5', 'UF1', 'UG1', 'UG3', 'UG4', 'UH1', 'UH2',
    'UH3', 'UH4', 'UM1', 'UP5', 'X01', 'X02'
  ] as NihResearchGrantType[];
};

export const getNihTrainingGrantTypes = (): NihTrainingGrantType[] => {
  return [
    'D43', 'D71', 'K12', 'KL2', 'KM1', 'T01', 'T02', 'T14', 'T15',
    'T32', 'T34', 'T35', 'T37', 'T42', 'T90', 'TL1', 'TL4', 'TU2',
    'U2R'
  ] as NihTrainingGrantType[];
};

export const getNihFellowshipGrantTypes = (): NihFellowshipGrantType[] => {
  return [
    'F05', 'F30', 'F31', 'F32', 'F33', 'F37', 'F38', 'F99', 'FI2'
  ] as NihFellowshipGrantType[];
};

export const getNihCareerDevelopmentGrantTypes = (): NihCareerDevelopmentGrantType[] => {
  return [
    'K00', 'K01', 'K02', 'K05', 'K06', 'K07', 'K08', 'K14', 'K18',
    'K21', 'K22', 'K23', 'K24', 'K25', 'K26', 'K30', 'K32', 'K43',
    'K76', 'K99', 'KL1'
  ] as NihCareerDevelopmentGrantType[];
};

export const getNihMultiProjectGrantTypes = (): NihMultiProjectGrantType[] => {
  return [
    'G12', 'M01', 'P01', 'P20', 'P2C', 'P30', 'P40', 'P41', 'P42',
    'P50', 'P51', 'P60', 'PL1', 'PM1', 'S06', 'U10', 'U19', 'U2C',
    'U41', 'U42', 'U45', 'U54', 'U56', 'U60', 'UC7', 'UL1', 'UM2'
  ] as NihMultiProjectGrantType[];
};

export const getNihSbirSttrGrantTypes = (): NihSbirSttrGrantType[] => {
  return [
    'R41', 'R42', 'R43', 'R44', 'SB1', 'U43', 'U44', 'UB1', 'UT1',
    'UT2'
  ] as NihSbirSttrGrantType[];
};

// Helper function to initialize organization eligibility filters with all types set to null
export const initOrgEligibilityFilters = (): Record<OrganizationType, boolean | null> => {
  const filters: Record<OrganizationType, boolean | null> = {} as Record<OrganizationType, boolean | null>;
  getOrganizationTypes().forEach(type => {
    filters[type] = null;
  });
  return filters;
};

// Helper function to get NIH grant types by category
export const getNihGrantTypesByCategory = (category: string): NihGrantType[] => {
  switch (category.toLowerCase()) {
    case 'research':
      return getNihResearchGrantTypes();
    case 'training':
      return getNihTrainingGrantTypes();
    case 'fellowship':
      return getNihFellowshipGrantTypes();
    case 'career_development':
      return getNihCareerDevelopmentGrantTypes();
    case 'multi_project':
      return getNihMultiProjectGrantTypes();
    case 'sbir_sttr':
      return getNihSbirSttrGrantTypes();
    default:
      return [];
  }
};

// Map NIH grant types to descriptions
export const nihGrantTypeDescriptions: Partial<Record<NihGrantType, string>> = {
  // Research (R)
  'C06': 'Research Facilities Construction Grant',
  'DP1': 'NIH Director\'s Pioneer Award (NDPA)',
  'DP2': 'NIH Director\'s New Innovator Awards',
  'DP3': 'Type 1 Diabetes Targeted Research Award',
  'DP4': 'NIH Director\'s Pathfinder Award - Multi-Yr Funding',
  'DP5': 'Early Independence Award',
  'DP7': 'NIH Director\'s Workforce Innovation Award',
  'G07': 'Resources Improvement Grant',
  'G08': 'Resources Project Grant (NLM)',
  'G11': 'Extramural Associate Research Development Award (EARDA)',
  'G13': 'Health Sciences Publication Support Awards (NLM)',
  'G20': 'Grants for Repair, Renovation and Modernization of Existing Research Facilities',
  'R00': 'Research Transition Award',
  'R01': 'Research Project',
  'R03': 'Small Research Grants',
  'R13': 'Conference',
  'R15': 'Academic Research Enhancement Awards (AREA)',
  'R18': 'Research Demonstration and Dissemination Projects',
  'R21': 'Exploratory/Developmental Grants',
  'R24': 'Resource-Related Research Projects',
  'R25': 'Education Projects',
  'R28': 'Resource-Related Research Projects',
  'R30': 'Preventive Health Service - Venereal Disease Research, Demonstration, and Public Information and Education Grants',
  'R33': 'Exploratory/Developmental Grants Phase II',
  'R34': 'Planning Grant',
  'R35': 'Outstanding Investigator Award',
  'R36': 'Dissertation Award',
  'R37': 'Method to Extend Research in Time (MERIT) Award',
  'R49': 'Injury Control Research and Demonstration Projects and Injury Prevention Research Centers',
  'R50': 'Research Specialist Award',
  'R55': 'James A. Shannon Director\'s Award',
  'R56': 'High Priority, Short Term Project Award',
  'R61': 'Phase 1 Exploratory/Developmental Grant',
  'R90': 'Interdisciplinary Regular Research Training Award',
  'RC1': 'NIH Challenge Grants and Partnerships Program',
  'RC2': 'High Impact Research and Research Infrastructure Programs',
  'RC3': 'Biomedical Research, Development, and Growth to Spur the Acceleration of New Technologies (BRDG-SPAN) Program',
  'RC4': 'High Impact Research and Research Infrastructure Programs—Multi-Yr Funding',
  'RF1': 'Multi-Year Funded Research Project Grant',
  'RL1': 'Linked Research project Grant',
  'RL2': 'Linked Exploratory/Development Grant',
  'RL5': 'Linked Education Project',
  'RL9': 'Linked Research Training Award',
  'RM1': 'Research Project with Complex Structure',
  'RS1': 'Programs to Prevent the Emergence and Spread of Antimicrobial Resistance in the United States',
  'S07': 'Biomedical Research Support Grants',
  'S10': 'Biomedical Research Support Shared Instrumentation Grants',
  'S11': 'Minority Biomedical Research Support Thematic Project Grants',
  'S15': 'Small Instrumentation Grants Program',
  'S21': 'Research and Institutional Resources Health Disparities Endowment Grants -Capacity Building',
  'S22': 'Research and Student Resources Health Disparities Endowment Grants - Educational Programs',
  'SC1': 'Research Enhancement Award',
  'SC2': 'Pilot Research Project',
  'SC3': 'Research Continuance Award',
  'SI2': 'Intramural Clinical Scholar Research Award',
  'U01': 'Research Project - Cooperative Agreements',
  'U13': 'Conference - Cooperative Agreements',
  'U18': 'Research Demonstration - Cooperative Agreements',
  'U24': 'Resource-Related Research Projects - Cooperative Agreements',
  'U34': 'Planning Cooperative Agreement',
  'UA5': 'Academic Research Enhancement Award (AREA) Cooperative Agreements',
  'UC1': 'NIH Challenge Grants and Partnerships Program - Phase II-Coop.Agreement',
  'UC3': 'Biomedical Research, Development, and Growth to Spur the Acceleration of New Technologies (BRDG-SPAN) Cooperative Agreement Program',
  'UC4': 'High Impact Research and Research Infrastructure Cooperative Agreement Programs—Multi-Yr Funding',
  'UC6': 'Construction Cooperative Agreement',
  'UE5': 'Education Projects - Cooperative Agreements',
  'UF1': 'Multi-Year Funded Research Project Cooperative Agreement',
  'UG1': 'Clinical Research Cooperative Agreements - Single Project',
  'UG3': 'Phase 1 Exploratory/Developmental Cooperative Agreement',
  'UG4': 'National Network of Libraries of Medicine',
  'UH1': 'HBCU Research Scientist Award',
  'UH2': 'Exploratory/Developmental Cooperative Agreement Phase I',
  'UH3': 'Exploratory/Developmental Cooperative Agreement Phase II',
  'UH4': 'Hazmat Training at DOE Nuclear Weapons Complex',
  'UM1': 'Research Project with Complex Structure Cooperative Agreement',
  'UP5': 'Early Independence Award Cooperative Agreement',
  'X01': 'Resource Access Program',
  'X02': 'Preapplication',

  // Training (T)
  'D43': 'International Research Training Grants',
  'D71': 'International Research Training Planning Grant',
  'K12': 'Physician Scientist Award (Program) (PSA)',
  'KL2': 'Mentored Career Development Award',
  'KM1': 'Institutional Career Enhancement Awards - Multi-Yr Funding',
  'T01': 'Graduate Training Program',
  'T02': 'Undergraduate Training Program',
  'T14': 'Conferences',
  'T15': 'Continuing Education Training Grants',
  'T32': 'Institutional National Research Service Award',
  'T34': 'Undergraduate NRSA Institutional Research Training Grants',
  'T35': 'NRSA Short -Term Research Training',
  'T37': 'Minority International Research Training Grants (FIC)',
  'T42': 'Educational Resource Center Training Grants',
  'T90': 'Interdisciplinary Research Training Award',
  'TL1': 'Linked Training Award',
  'TL4': 'Undergraduate NRSA Institutional Research Training Grants',
  'TU2': 'Institutional National Research Service Award with Involvement of NIH Intramural Faculty',
  'U2R': 'International Research Training Cooperative Agreements',

  // Fellowship (F)
  'F05': 'International Research Fellowships (FIC)',
  'F30': 'Individual Predoctoral NRSA for M.D./Ph.D. Fellowships',
  'F31': 'Predoctoral Individual National Research Service Award',
  'F32': 'Postdoctoral Individual National Research Service Award',
  'F33': 'National Research Service Awards for Senior Fellows',
  'F37': 'Medical Informatics Fellowships',
  'F38': 'Applied Medical Informatics Fellowships',
  'F99': 'Pre-doc to Post-doc Transition Award',
  'FI2': 'Intramural Postdoctoral Research Associate',

  // Career Development (K)
  'K00': 'Post-doctoral Transition Award',
  'K01': 'Research Scientist Development Award - Research & Training',
  'K02': 'Research Scientist Development Award - Research',
  'K05': 'Research Scientist Award',
  'K06': 'Research Career Awards',
  'K07': 'Academic/Teacher Award (ATA)',
  'K08': 'Clinical Investigator Award (CIA)',
  'K14': 'Minority School Faculty Development Awards',
  'K18': 'The Career Enhancement Award',
  'K21': 'Scientist Development Award',
  'K22': 'Career Transition Award',
  'K23': 'Mentored Patient-Oriented Research Career Development Award',
  'K24': 'Midcareer Investigator Award in Patient-Oriented Research',
  'K25': 'Mentored Quantitative Research Career Development Award',
  'K26': 'Midcareer Investigator Award in Biomedical and Behavioral Research',
  'K30': 'Clinical Research Curriculum Award (CRCA)',
  'K32': 'Academic Career Excellence (ACE) Award',
  'K43': 'International Research Career Development Award',
  'K76': 'Emerging Leaders Career Development Award',
  'K99': 'Career Transition Award',
  'KL1': 'Linked Research Career Development Award',

  // Multi-Project (M)
  'G12': 'Research Centers in Minority Institutions Award',
  'M01': 'General Clinical Research Centers Program',
  'P01': 'Research Program Projects',
  'P20': 'Exploratory Grants',
  'P2C': 'Resource-Related Research Multi-Component Projects and Centers',
  'P30': 'Center Core Grants',
  'P40': 'Animal (Mammalian and Nonmammalian) Model, and Animal and Biological Material Resource Grants',
  'P41': 'Biotechnology Resource Grants',
  'P42': 'Hazardous Substances Basic Research Grants Program (NIEHS)',
  'P50': 'Specialized Center',
  'P51': 'Primate Research Center Grants',
  'P60': 'Comprehensive Center',
  'PL1': 'Linked Center Core Grant',
  'PM1': 'Program Project or Center with Complex Structure',
  'S06': 'Minority Biomedical Research Support - MBRS',
  'U10': 'Cooperative Clinical Research - Cooperative Agreements',
  'U19': 'Research Program - Cooperative Agreements',
  'U2C': 'Resource-Related Research Multi-Component Projects and Centers Cooperative Agreements',
  'U41': 'Biotechnology Resource Cooperative Agreements',
  'U42': 'Animal (Mammalian and Nonmammalian) Model, and Animal and Biological Materials Resource Cooperative Agreements',
  'U45': 'Hazardous Waste Worker Health and Safety Training Cooperative Agreements (NIEHS)',
  'U54': 'Specialized Center - Cooperative Agreements',
  'U56': 'Exploratory Grants - Cooperative Agreements',
  'U60': 'Cooperative Agreements in Occupational Safety and Health Research, Demonstrations, Evaluation and Education Research, Demonstrations, Evaluation and Education',
  'UC7': 'National Biocontainment Laboratory Operation Cooperative Agreement',
  'UL1': 'Linked Specialized Center Cooperative Agreement',
  'UM2': 'Program Project or Center with Complex Structure Cooperative Agreement',

  // SBIR/STTR (B)
  'R41': 'Small Business Technology Transfer (STTR) Grants - Phase I',
  'R42': 'Small Business Technology Transfer (STTR) Grants - Phase II',
  'R43': 'Small Business Innovation Research Grants (SBIR) - Phase I',
  'R44': 'Small Business Innovation Research Grants (SBIR) - Phase II',
  'SB1': 'Commercialization Readiness Program',
  'U43': 'Small Business Innovation Research (SBIR) Cooperative Agreements - Phase I',
  'U44': 'Small Business Innovation Research (SBIR) Cooperative Agreements - Phase II',
  'UB1': 'Commercialization Readiness Program - Cooperative Agreement',
  'UT1': 'Small Business Technology Transfer (STTR) - Cooperative Agreements - Phase I',
  'UT2': 'Small Business Technology Transfer (STTR) - Cooperative Agreements - Phase II'
};

// Helper function to get description for a NIH grant type
export const getNihGrantTypeDescription = (grantType: NihGrantType): string => {
  return nihGrantTypeDescriptions[grantType] || 'Description not available';
};

// Helper function to get the category for a NIH grant type
export const getNihGrantTypeCategory = (grantType: NihGrantType): NihGrantCategory => {
  if (getNihResearchGrantTypes().includes(grantType as NihResearchGrantType)) {
    return 'Research';
  } else if (getNihTrainingGrantTypes().includes(grantType as NihTrainingGrantType)) {
    return 'Training';
  } else if (getNihFellowshipGrantTypes().includes(grantType as NihFellowshipGrantType)) {
    return 'Fellowship';
  } else if (getNihCareerDevelopmentGrantTypes().includes(grantType as NihCareerDevelopmentGrantType)) {
    return 'Career Development';
  } else if (getNihMultiProjectGrantTypes().includes(grantType as NihMultiProjectGrantType)) {
    return 'Multi-Project';
  } else if (getNihSbirSttrGrantTypes().includes(grantType as NihSbirSttrGrantType)) {
    return 'SBIR/STTR';
  } else {
    return 'Other';
  }
};

// NIH grant categories
export type NihGrantCategory = 'Research' | 'Training' | 'Fellowship' | 'Career Development' | 'Multi-Project' | 'SBIR/STTR' | 'Other';

// Helper function to get all NIH grant categories
export const getNihGrantCategories = (): NihGrantCategory[] => {
  return ['Research', 'Training', 'Fellowship', 'Career Development', 'Multi-Project', 'SBIR/STTR', 'Other'];
}; 